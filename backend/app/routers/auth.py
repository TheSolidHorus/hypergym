from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from datetime import datetime, timezone, timedelta
from app.database import get_session
from app.models import User, UserRegister, UserLogin, VerifyEmail, UserRead
from app.auth import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token, get_current_user
)
from app.email_utils import generate_code, send_verification_email
from app.password_validator import validate_password_strength

router = APIRouter(prefix="/auth", tags=["auth"])

# ── HIGH-01 FIX: Rate limiting in-memory (semplice, compatibile senza Redis) ──
# Per produzione scalabile usare slowapi + Redis.
import time
from collections import defaultdict

_rate_store: dict = defaultdict(list)

def _check_rate_limit(key: str, max_requests: int, window_seconds: int):
    """Blocca se l'IP/email supera max_requests nel periodo window_seconds."""
    now = time.time()
    timestamps = _rate_store[key]
    # Rimuovi timestamp scaduti
    _rate_store[key] = [t for t in timestamps if now - t < window_seconds]
    if len(_rate_store[key]) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail=f"Troppi tentativi. Riprova tra {window_seconds // 60} minuti.",
            headers={"Retry-After": str(window_seconds)},
        )
    _rate_store[key].append(now)


@router.post("/validate-password")
def validate_password(data: dict):
    """Valida la forza di una password"""
    password = data.get("password", "")
    user_info = data.get("user_info", {})
    
    result = validate_password_strength(password, user_info)
    return result

@router.post("/register")
def register(request: Request, data: UserRegister, session: Session = Depends(get_session)):
    """Registra nuovo utente e invia codice verifica email"""

    # HIGH-01: max 5 registrazioni per IP ogni 10 minuti
    _check_rate_limit(f"register:{request.client.host}", 5, 600)

    # Valida password
    validation = validate_password_strength(data.password, {"name": data.name, "email": data.email})
    if not validation["is_valid"]:
        raise HTTPException(
            status_code=400, 
            detail={
                "message": "Password non sufficientemente sicura",
                "validation": validation
            }
        )
    
    # Verifica che l'email non sia già registrata
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing and existing.email_verified:
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    # Se esiste ma non verificato, aggiorna i dati
    if existing and not existing.email_verified:
        existing.name = data.name
        existing.phone = data.phone
        existing.password_hash = get_password_hash(data.password)
        code = generate_code()
        existing.verification_code = code
        existing.verification_code_expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        existing.otp_attempts = 0
        existing.otp_locked_until = None
        session.add(existing)
        session.commit()
        
        send_verification_email(data.email, code, data.name)
        return {"message": "Codice di verifica inviato", "email": data.email}
    
    # Crea nuovo utente
    code = generate_code()
    user = User(
        name=data.name,
        email=data.email,
        phone=data.phone or "",
        password_hash=get_password_hash(data.password),
        email_verified=False,
        verification_code=code,
        verification_code_expires=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    session.add(user)
    session.commit()
    
    send_verification_email(data.email, code, data.name)
    return {"message": "Codice di verifica inviato", "email": data.email}

@router.post("/verify")
def verify_email(request: Request, data: VerifyEmail, session: Session = Depends(get_session)):
    """Verifica email con codice OTP"""

    # HIGH-01: max 10 tentativi OTP per IP ogni 5 minuti
    _check_rate_limit(f"verify:{request.client.host}", 10, 300)

    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email non trovata")
    
    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email già verificata")

    # HIGH-02: Controlla se l'account è temporaneamente bloccato
    if user.otp_locked_until and datetime.now(timezone.utc) < user.otp_locked_until:
        remaining = int((user.otp_locked_until - datetime.now(timezone.utc)).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Account temporaneamente bloccato. Riprova tra {remaining // 60} minuti e {remaining % 60} secondi.",
            headers={"Retry-After": str(remaining)},
        )
    
    # Controlla scadenza
    if user.verification_code_expires and datetime.now(timezone.utc) > user.verification_code_expires:
        raise HTTPException(status_code=400, detail="Codice scaduto. Registrati di nuovo.")
    
    # Controlla codice — HIGH-02: contatore tentativi
    if user.verification_code != data.code:
        user.otp_attempts = (user.otp_attempts or 0) + 1
        if user.otp_attempts >= 5:
            # Blocca per 15 minuti dopo 5 tentativi falliti
            user.otp_locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            user.otp_attempts = 0
            session.add(user)
            session.commit()
            raise HTTPException(
                status_code=429,
                detail="Troppi tentativi errati. Account bloccato per 15 minuti.",
            )
        remaining_attempts = 5 - user.otp_attempts
        session.add(user)
        session.commit()
        raise HTTPException(
            status_code=400,
            detail=f"Codice non valido. Tentativi rimanenti: {remaining_attempts}",
        )
    
    # Verifica completata — resetta contatori
    user.email_verified = True
    user.verification_code = None
    user.verification_code_expires = None
    user.otp_attempts = 0
    user.otp_locked_until = None
    session.add(user)
    session.commit()
    session.refresh(user)
    
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "message": "Email verificata con successo",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "workouts_completed": user.workouts_completed,
            "streak": user.streak,
            "training_days_goal": user.training_days_goal,
            "certificate_uploaded": user.certificate_uploaded
        }
    }

@router.post("/resend-code")
def resend_code(request: Request, data: dict, session: Session = Depends(get_session)):
    """Reinvia codice verifica"""

    # HIGH-01: max 3 invii per IP ogni 10 minuti
    _check_rate_limit(f"resend:{request.client.host}", 3, 600)

    email = data.get("email", "")
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email non trovata")
    
    code = generate_code()
    user.verification_code = code
    user.verification_code_expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    user.otp_attempts = 0
    user.otp_locked_until = None
    session.add(user)
    session.commit()
    
    send_verification_email(email, code, user.name)
    return {"message": "Nuovo codice inviato"}

@router.post("/login")
def login(request: Request, data: UserLogin, session: Session = Depends(get_session)):
    """Login con email e password"""

    # HIGH-01: max 10 tentativi di login per IP ogni 5 minuti
    _check_rate_limit(f"login:{request.client.host}", 10, 300)
    
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Email o password errata")
    
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email o password errata")
    
    if not user.email_verified:
        # Invia nuovo codice
        code = generate_code()
        user.verification_code = code
        user.verification_code_expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        session.add(user)
        session.commit()
        send_verification_email(data.email, code, user.name)
        raise HTTPException(
            status_code=403, 
            detail="Email non verificata. Nuovo codice inviato."
        )
    
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "workouts_completed": user.workouts_completed,
            "streak": user.streak,
            "training_days_goal": user.training_days_goal,
            "certificate_uploaded": user.certificate_uploaded,
            "certificate_filename": user.certificate_filename,
            "certificate_expires_at": user.certificate_expires_at.isoformat() if user.certificate_expires_at else None
        }
    }

@router.post("/forgot-password")
def forgot_password(request: Request, data: dict, session: Session = Depends(get_session)):
    """Invia codice per recupero password"""

    # HIGH-01: max 3 richieste di reset per IP ogni 10 minuti
    _check_rate_limit(f"forgot:{request.client.host}", 3, 600)

    email = data.get("email", "")
    
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        # Non rivelare se l'email esiste o no (sicurezza)
        return {"message": "Se l'email esiste, riceverai un codice di recupero"}
    
    code = generate_code()
    user.verification_code = code
    user.verification_code_expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    session.add(user)
    session.commit()
    
    send_verification_email(email, code, user.name)
    return {"message": "Se l'email esiste, riceverai un codice di recupero"}

@router.post("/reset-password")
def reset_password(request: Request, data: dict, session: Session = Depends(get_session)):
    """Reset password con codice di verifica"""

    # HIGH-01: max 5 tentativi di reset per IP ogni 10 minuti
    _check_rate_limit(f"reset:{request.client.host}", 5, 600)

    email = data.get("email", "")
    code = data.get("code", "")
    new_password = data.get("new_password", "")
    
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email non trovata")

    # Verifica blocco OTP
    if user.otp_locked_until and datetime.now(timezone.utc) < user.otp_locked_until:
        remaining = int((user.otp_locked_until - datetime.now(timezone.utc)).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Account bloccato. Riprova tra {remaining // 60} minuti.",
        )
    
    # Verifica scadenza prima del codice (ordine importante per sicurezza)
    if user.verification_code_expires and datetime.now(timezone.utc) > user.verification_code_expires:
        raise HTTPException(status_code=400, detail="Codice scaduto. Richiedi un nuovo reset.")

    # Verifica codice — conta i tentativi
    if user.verification_code != code:
        user.otp_attempts = (user.otp_attempts or 0) + 1
        if user.otp_attempts >= 5:
            user.otp_locked_until = datetime.now(timezone.utc) + timedelta(minutes=15)
            user.otp_attempts = 0
            session.add(user)
            session.commit()
            raise HTTPException(status_code=429, detail="Troppi tentativi. Account bloccato per 15 minuti.")
        session.add(user)
        session.commit()
        raise HTTPException(status_code=400, detail="Codice non valido")
    
    # Valida nuova password
    validation = validate_password_strength(new_password, {"name": user.name, "email": user.email})
    if not validation["is_valid"]:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Nuova password non sufficientemente sicura",
                "validation": validation
            }
        )
    
    # Aggiorna password e resetta contatori
    user.password_hash = get_password_hash(new_password)
    user.verification_code = None
    user.verification_code_expires = None
    user.otp_attempts = 0
    user.otp_locked_until = None
    session.add(user)
    session.commit()
    
    return {"message": "Password aggiornata con successo"}

@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
