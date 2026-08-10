from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, timezone
from ..database import get_session
from ..models import User, UserSync
from ..auth import get_current_active_user

router = APIRouter(prefix="/sync", tags=["sync"])

@router.post("/user")
def sync_user_data(
    data: UserSync,
    session: Session = Depends(get_session),
    # ── CRIT-03 FIX: Richiede un JWT valido per sincronizzare dati ──────────
    current_user: User = Depends(get_current_active_user)
):
    """
    Sincronizza i dati utente dall'app mobile al server.
    Richiede autenticazione — l'utente può aggiornare SOLO il proprio account.
    """

    # Usa sempre l'utente autenticato dal JWT — ignora device_id per l'identificazione
    user = current_user

    # Aggiorna solo i campi non critici (il certificato non può essere auto-impostato via sync)
    user.name = data.name
    user.phone = data.phone
    user.workouts_completed = data.workouts_completed
    user.streak = data.streak
    user.training_days_goal = data.training_days_goal
    user.last_sync_at = datetime.now(timezone.utc)

    # Il device_id viene aggiornato solo se fornito (per supporto legacy)
    if data.device_id:
        user.device_id = data.device_id

    # ⚠️ NOTA SICUREZZA: certificate_uploaded NON viene aggiornato via sync client-side.
    # Il certificato viene gestito solo dall'admin tramite l'endpoint dedicato.
    # Questo previene il bypass del controllo certificato (CRIT-03).

    session.add(user)
    session.commit()
    session.refresh(user)

    return {
        "status": "ok",
        "user_id": str(user.id),
        "synced_at": user.last_sync_at.isoformat()
    }
