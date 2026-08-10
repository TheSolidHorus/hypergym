import os
import json
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from .admin import verify_admin

load_dotenv()

router = APIRouter(prefix="/api/ai", tags=["AI"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


class GeneratePlanRequest(BaseModel):
    goal: str           # es. "ipertrofia", "dimagrimento", "forza", "tonificazione", "resistenza"
    days: int           # 2-6 giorni a settimana
    level: str          # "principiante", "intermedio", "avanzato"
    equipment: str      # "palestra", "casa", "minima"
    injuries: Optional[str] = ""   # Limitazioni/infortuni liberi


GOAL_LABELS = {
    "ipertrofia": "Hypertrophy (muscle mass gain)",
    "dimagrimento": "Fat loss and body recomposition",
    "forza": "Maximal strength development",
    "tonificazione": "Toning and body definition",
    "resistenza": "Muscular endurance and cardio conditioning",
}

EQUIPMENT_LABELS = {
    "palestra": "Full gym equipment (barbells, dumbbells, cables, machines)",
    "casa": "Home workout (bodyweight, resistance bands, dumbbells if available)",
    "minima": "Minimal equipment (bodyweight only)",
}


def build_prompt(req: GeneratePlanRequest) -> str:
    goal_desc = GOAL_LABELS.get(req.goal, req.goal)
    equip_desc = EQUIPMENT_LABELS.get(req.equipment, req.equipment)
    injury_note = f"Avoid exercises that stress: {req.injuries}." if req.injuries and req.injuries.strip() else "No injury restrictions."

    return f"""You are an expert personal trainer. Generate a complete, professional workout plan.

PARAMETERS:
- Goal: {goal_desc}
- Training days per week: {req.days}
- Level: {req.level}
- Equipment: {equip_desc}
- Injury restrictions: {injury_note}

REQUIREMENTS:
- Create exactly {req.days} training days (Giorno A, Giorno B, etc.)
- Each day must have 4-7 exercises appropriate for the goal
- Use Italian names for exercises (e.g., "Panca Piana", "Squat", "Curl con Bilanciere")
- Sets: 3-5 depending on goal (strength=5, hypertrophy=4, endurance=3)
- Reps: as a string (e.g., "8-10", "12-15", "6", "20")
- Rest in seconds: (strength=180, hypertrophy=90, endurance=45, toning=60)
- Plan name should be in Italian and descriptive (e.g., "Forza Massimale - Upper/Lower")

Respond ONLY with valid JSON in this exact structure, no markdown, no explanation:

{{
  "name": "Piano di allenamento (descrittivo in italiano)",
  "days_summary": "3 giorni/settimana",
  "duration_weeks": 8,
  "workout_days": [
    {{
      "id": "day-1",
      "name": "Giorno A - Push",
      "targetDays": ["Lunedì", "Giovedì"],
      "exercises": [
        {{
          "id": 1,
          "name": "Panca Piana con Bilanciere",
          "sets": 4,
          "reps": "8-10",
          "rest": 90
        }}
      ]
    }}
  ]
}}"""


@router.post("/generate-plan")
async def generate_plan(req: GeneratePlanRequest, _: bool = Depends(verify_admin)):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY non configurata. Aggiungi la chiave nel file .env del backend."
        )

    if req.days < 1 or req.days > 7:
        raise HTTPException(status_code=400, detail="I giorni devono essere tra 1 e 7.")

    prompt = build_prompt(req)

    payload = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 4096,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Timeout nella risposta di Gemini. Riprova.")
        except httpx.HTTPStatusError as e:
            err_body = e.response.text
            raise HTTPException(
                status_code=502,
                detail=f"Errore Gemini API ({e.response.status_code}): {err_body[:300]}"
            )

    data = response.json()

    try:
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        plan = json.loads(raw_text)
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Risposta AI non valida: {str(e)}"
        )

    # Validate & sanitize the plan structure
    if "workout_days" not in plan or not isinstance(plan["workout_days"], list):
        raise HTTPException(status_code=500, detail="Piano AI malformato: mancano i giorni.")

    # Ensure IDs are proper
    for i, day in enumerate(plan["workout_days"]):
        day["id"] = f"day-{i+1}"
        for j, ex in enumerate(day.get("exercises", [])):
            ex["id"] = float(i * 100 + j + 1)
            # Ensure reps is a string
            if isinstance(ex.get("reps"), int):
                ex["reps"] = str(ex["reps"])

    return {"success": True, "plan": plan}
