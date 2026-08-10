from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlmodel import Session, select, func
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
from ..database import get_session
from ..models import User, UserPublic, AdminStats, Workout

router = APIRouter(prefix="/admin", tags=["admin"])

# Password admin da variabile d'ambiente
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

# ── HIGH-03 FIX: Autenticazione tramite Authorization header, non query param ─
# Il vecchio ?password=xxx appare nei log del server. Il token header è privato.
def verify_admin(x_admin_token: Optional[str] = Header(None, alias="X-Admin-Token")):
    """
    Verifica che la richiesta provenga dall'admin tramite header HTTP.
    Header richiesto: X-Admin-Token: <ADMIN_PASSWORD>
    """
    if not ADMIN_PASSWORD:
        raise HTTPException(
            status_code=500,
            detail="Il backend non è configurato in modo sicuro (Manca ADMIN_PASSWORD)"
        )
    if not x_admin_token or x_admin_token != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Token admin non valido",
            headers={"WWW-Authenticate": "X-Admin-Token"},
        )
    return True

@router.get("/stats", response_model=AdminStats)
def get_admin_stats(session: Session = Depends(get_session), _: bool = Depends(verify_admin)):
    """Statistiche generali per la dashboard admin"""
    
    total_users = session.exec(select(func.count(User.id))).one()
    
    users_with_cert = session.exec(
        select(func.count(User.id)).where(User.certificate_uploaded == True)
    ).one()
    
    users_without_cert = total_users - users_with_cert
    
    # Certificati in scadenza nei prossimi 30 giorni
    thirty_days = datetime.now(timezone.utc) + timedelta(days=30)
    expiring = session.exec(
        select(func.count(User.id)).where(
            User.certificate_uploaded == True,
            User.certificate_expires_at != None,
            User.certificate_expires_at <= thirty_days
        )
    ).one()
    
    total_workouts = session.exec(select(func.count(Workout.id))).one()
    
    # Utenti attivi ultimi 7 giorni
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    active_users = session.exec(
        select(func.count(User.id)).where(User.last_sync_at >= seven_days_ago)
    ).one()
    
    return AdminStats(
        total_users=total_users,
        users_with_certificate=users_with_cert,
        users_without_certificate=users_without_cert,
        certificates_expiring_soon=expiring,
        total_workouts=total_workouts,
        active_users_last_7_days=active_users
    )

@router.get("/users", response_model=List[UserPublic])
def get_all_users(
    session: Session = Depends(get_session),
    _: bool = Depends(verify_admin),
    filter: str = Query(None, description="all, with_cert, without_cert, expiring")
):
    """Lista di tutti gli utenti con filtro opzionale"""
    
    query = select(User).order_by(User.created_at.desc())
    
    if filter == "with_cert":
        query = query.where(User.certificate_uploaded == True)
    elif filter == "without_cert":
        query = query.where(User.certificate_uploaded == False)
    elif filter == "expiring":
        thirty_days = datetime.now(timezone.utc) + timedelta(days=30)
        query = query.where(
            User.certificate_uploaded == True,
            User.certificate_expires_at <= thirty_days
        )
    
    users = session.exec(query).all()
    return users

@router.get("/users/{user_id}", response_model=UserPublic)
def get_user_detail(user_id: str, session: Session = Depends(get_session), _: bool = Depends(verify_admin)):
    """Dettaglio singolo utente"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return user

@router.delete("/users/{user_id}")
def delete_user(user_id: str, session: Session = Depends(get_session), _: bool = Depends(verify_admin)):
    """Elimina utente"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    session.delete(user)
    session.commit()
    return {"message": "Utente eliminato"}
