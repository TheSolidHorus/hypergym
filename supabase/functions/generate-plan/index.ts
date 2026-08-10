// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// C-03: CORS ristretto ai domini autorizzati (non più "*")
const ALLOWED_ORIGINS = [
  "https://pump-app-sand.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const GOAL_LABELS: Record<string, string> = {
  ipertrofia: "Hypertrophy (muscle mass gain)",
  dimagrimento: "Fat loss and body recomposition",
  forza: "Maximal strength development",
  tonificazione: "Toning and body definition",
  resistenza: "Muscular endurance and cardio conditioning",
};

const EQUIPMENT_LABELS: Record<string, string> = {
  palestra: "Full gym equipment (barbells, dumbbells, cables, machines)",
  casa: "Home workout (bodyweight, resistance bands, dumbbells if available)",
  minima: "Minimal equipment (bodyweight only)",
};

function buildPrompt(goal: string, days: number, level: string, equipment: string, injuries: string): string {
  const goalDesc = GOAL_LABELS[goal] || goal;
  const equipDesc = EQUIPMENT_LABELS[equipment] || equipment;
  const injuryNote =
    injuries && injuries.trim()
      ? `Avoid exercises that stress: ${injuries}.`
      : "No injury restrictions.";

  return `You are an expert personal trainer. Generate a complete, professional workout plan.

PARAMETERS:
- Goal: ${goalDesc}
- Training days per week: ${days}
- Level: ${level}
- Equipment: ${equipDesc}
- Injury restrictions: ${injuryNote}

REQUIREMENTS:
- Create exactly ${days} training days (Giorno A, Giorno B, etc.)
- Each day must have 4-7 exercises appropriate for the goal
- Use Italian names for exercises (e.g., "Panca Piana", "Squat", "Curl con Bilanciere")
- Sets: 3-5 depending on goal (strength=5, hypertrophy=4, endurance=3)
- Reps: as a string (e.g., "8-10", "12-15", "6", "20")
- Rest in seconds: (strength=180, hypertrophy=90, endurance=45, toning=60)
- Plan name should be in Italian and descriptive (e.g., "Forza Massimale - Upper/Lower")

Respond ONLY with valid JSON in this exact structure, no markdown, no explanation:

{
  "name": "Piano di allenamento (descrittivo in italiano)",
  "days_summary": "3 giorni/settimana",
  "duration_weeks": 8,
  "workout_days": [
    {
      "id": "day-1",
      "name": "Giorno A - Push",
      "targetDays": ["Lunedì", "Giovedì"],
      "exercises": [
        {
          "id": 1,
          "name": "Panca Piana con Bilanciere",
          "sets": 4,
          "reps": "8-10",
          "rest": 90
        }
      ]
    }
  ]
}`;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // C-02: Verifica autenticazione Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Non autenticato. Effettua il login." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Token non valido o scaduto." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY non configurata nelle secrets di Supabase." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { goal, days, level, equipment, injuries = "" } = body;

    if (!goal || !days || !level || !equipment) {
      return new Response(
        JSON.stringify({ error: "Parametri mancanti: goal, days, level, equipment sono obbligatori." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = buildPrompt(goal, days, level, equipment, injuries);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const geminiPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    };

    // L-03: Timeout di 45 secondi sulla chiamata Gemini
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    let geminiRes: Response;
    try {
      geminiRes = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiPayload),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === "AbortError") {
        return new Response(
          JSON.stringify({ error: "Timeout: Gemini AI ha impiegato troppo tempo. Riprova." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: `Errore Gemini API (${geminiRes.status}): ${errText.substring(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Risposta AI vuota o malformata da parte di Gemini." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let plan;
    try {
      plan = JSON.parse(rawText);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Errore di parsing JSON dalla risposta Gemini." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!plan.workout_days || !Array.isArray(plan.workout_days)) {
      return new Response(
        JSON.stringify({ error: "Piano AI malformato: mancano i giorni di allenamento." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize IDs
    plan.workout_days.forEach((day: any, i: number) => {
      day.id = `day-${i + 1}`;
      (day.exercises || []).forEach((ex: any, j: number) => {
        ex.id = i * 100 + j + 1;
        if (typeof ex.reps === "number") ex.reps = String(ex.reps);
      });
    });

    return new Response(
      JSON.stringify({ success: true, plan }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Errore interno Edge Function." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
