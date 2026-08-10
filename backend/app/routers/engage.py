from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select, func, and_
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from datetime import datetime, timezone, timedelta
from app.database import get_session
from app.models import User
from app.auth import get_current_user
from app.models_engage import (
    Gym,
    GymMember,
    Season,
    Challenge,
    ChallengeEnrollment,
    ChallengeProgress,
    PointsLedger,
    Badge,
    MemberBadge,
    Reward,
    MemberReward
)

router = APIRouter(prefix="/engage", tags=["engage"])

# ========== AUTO-SEEDING PER TEST E DEMO ==========

def seed_demo_data(session: Session, user_id: UUID):
    # Verifica se l'utente ha già associazioni a palestre
    existing = session.exec(select(GymMember).where(GymMember.user_id == user_id)).first()
    if existing:
        return
        
    # Trova o crea la palestra demo Olympus HQ
    gym = session.exec(select(Gym).where(Gym.name == "Olympus HQ")).first()
    if not gym:
        gym = Gym(
            name="Olympus HQ",
            country="IT",
            timezone="Europe/Rome",
            plan="pro"
        )
        session.add(gym)
        session.commit()
        session.refresh(gym)
        
    # Aggiunge l'utente come membro
    member = GymMember(
        gym_id=gym.id,
        user_id=user_id,
        role="member",
        status="active"
    )
    session.add(member)
    
    # Trova o crea la stagione attiva
    now = datetime.now(timezone.utc)
    season = session.exec(select(Season).where(Season.gym_id == gym.id, Season.is_active == True)).first()
    if not season:
        season = Season(
            gym_id=gym.id,
            name="Summer Shred 2026",
            description="La stagione del riscatto estivo! Allenati costantemente e guadagna XP.",
            start_date=now - timedelta(days=15),
            end_date=now + timedelta(days=45),
            is_active=True
        )
        session.add(season)
        session.commit()
        session.refresh(season)
        
    # Crea le challenge di test
    challenges = session.exec(select(Challenge).where(Challenge.gym_id == gym.id)).all()
    if not challenges:
        c1 = Challenge(
            gym_id=gym.id,
            season_id=season.id,
            title="Costanza HYPER",
            description="Completa 10 allenamenti completi",
            type="workout_count",
            target_value=10.0,
            unit="workouts",
            points_reward=300,
            start_date=season.start_date,
            end_date=season.end_date,
            is_active=True
        )
        c2 = Challenge(
            gym_id=gym.id,
            season_id=season.id,
            title="Iron Lifter",
            description="Solleva 5.000 kg di volume complessivo",
            type="volume_lifted",
            target_value=5000.0,
            unit="kg",
            points_reward=500,
            start_date=season.start_date,
            end_date=season.end_date,
            is_active=True
        )
        c3 = Challenge(
            gym_id=gym.id,
            season_id=season.id,
            title="Resistenza HYPER",
            description="Accumula 150 minuti totali di allenamento",
            type="workout_duration",
            target_value=150.0,
            unit="minutes",
            points_reward=200,
            start_date=season.start_date,
            end_date=season.end_date,
            is_active=True
        )
        session.add(c1)
        session.add(c2)
        session.add(c3)
        session.commit()
        session.refresh(c1)
        session.refresh(c2)
        session.refresh(c3)
        active_challenges = [c1, c2, c3]
    else:
        active_challenges = challenges
        
    # Iscrive l'utente alle challenge
    for c in active_challenges:
        existing_enroll = session.exec(
            select(ChallengeEnrollment).where(
                ChallengeEnrollment.challenge_id == c.id,
                ChallengeEnrollment.member_user_id == user_id
            )
        ).first()
        if not existing_enroll:
            enroll = ChallengeEnrollment(
                challenge_id=c.id,
                member_user_id=user_id,
                status="enrolled"
            )
            prog = ChallengeProgress(
                challenge_id=c.id,
                member_user_id=user_id,
                current_value=0.0
            )
            session.add(enroll)
            session.add(prog)
            
    # Crea badge di test
    badge = session.exec(select(Badge).where(Badge.gym_id == gym.id)).first()
    if not badge:
        b1 = Badge(
            gym_id=gym.id,
            name="Primo Sangue",
            description="Logga il tuo primo allenamento in Olympus HQ",
            icon="fire",
            criteria_type="total_workouts",
            criteria_value=1.0
        )
        b2 = Badge(
            gym_id=gym.id,
            name="Guerriero di Ferro",
            description="Accumula 1.000 punti XP in totale",
            icon="award",
            criteria_type="total_points",
            criteria_value=1000.0
        )
        session.add(b1)
        session.add(b2)
        
    session.commit()

# ========== HELPERS DI SICUREZZA MULTI-TENANT ==========

def check_gym_membership(gym_id: UUID, user_id: UUID, session: Session) -> GymMember:
    membership = session.exec(
        select(GymMember).where(
            GymMember.gym_id == gym_id,
            GymMember.user_id == user_id,
            GymMember.status == "active"
        )
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso negato: non sei un membro attivo di questa palestra"
        )
    return membership

def check_gym_staff(gym_id: UUID, user_id: UUID, session: Session) -> GymMember:
    membership = check_gym_membership(gym_id, user_id, session)
    if membership.role not in ("coach", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operazione riservata a coach e amministratori della palestra"
        )
    return membership


# ========== API LATO GYM ADMIN / COACH ==========

@router.post("/gyms/{gym_id}/seasons", response_model=Season, status_code=201)
def create_season(
    gym_id: UUID,
    season: Season,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Crea una nuova stagione / battle pass per la palestra (Staff Only)"""
    check_gym_staff(gym_id, current_user.id, session)
    
    season.gym_id = gym_id
    season.created_at = datetime.now(timezone.utc)
    season.updated_at = datetime.now(timezone.utc)
    
    session.add(season)
    session.commit()
    session.refresh(season)
    return season

@router.get("/gyms/{gym_id}/seasons", response_model=List[Season])
def get_seasons(
    gym_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Lista le stagioni configurate per la palestra"""
    check_gym_membership(gym_id, current_user.id, session)
    
    statement = select(Season).where(Season.gym_id == gym_id).order_by(Season.start_date.desc())
    return session.exec(statement).all()

@router.post("/gyms/{gym_id}/challenges", response_model=Challenge, status_code=201)
def create_challenge(
    gym_id: UUID,
    challenge: Challenge,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Crea una nuova challenge per gli iscritti (Staff Only)"""
    check_gym_staff(gym_id, current_user.id, session)
    
    challenge.gym_id = gym_id
    challenge.created_at = datetime.now(timezone.utc)
    challenge.updated_at = datetime.now(timezone.utc)
    
    # Se associata a una stagione, verifica che appartenga alla palestra
    if challenge.season_id:
        season = session.get(Season, challenge.season_id)
        if not season or season.gym_id != gym_id:
            raise HTTPException(
                status_code=400,
                detail="La stagione specificata non esiste o appartiene ad un'altra palestra"
            )
            
    session.add(challenge)
    session.commit()
    session.refresh(challenge)
    return challenge

@router.get("/gyms/{gym_id}/challenges", response_model=List[Challenge])
def get_challenges(
    gym_id: UUID,
    season_id: Optional[UUID] = Query(None),
    active_only: bool = Query(False),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Lista le challenge attive o di una determinata stagione"""
    check_gym_membership(gym_id, current_user.id, session)
    
    stmt = select(Challenge).where(Challenge.gym_id == gym_id)
    if season_id:
        stmt = stmt.where(Challenge.season_id == season_id)
    if active_only:
        now = datetime.now(timezone.utc)
        stmt = stmt.where(
            and_(
                Challenge.is_active == True,
                Challenge.start_date <= now,
                Challenge.end_date >= now
            )
        )
    return session.exec(stmt.order_by(Challenge.end_date.asc())).all()

@router.get("/gyms/{gym_id}/leaderboard")
def get_gym_leaderboard(
    gym_id: UUID,
    season_id: Optional[UUID] = Query(None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Genera la classifica generale della palestra calcolando i punti XP dal ledger"""
    check_gym_membership(gym_id, current_user.id, session)
    
    # Costruiamo la query di aggregazione dei punti per utente
    points_query = select(
        PointsLedger.member_user_id,
        func.sum(PointsLedger.points).label("total_points")
    ).where(PointsLedger.gym_id == gym_id)
    
    # Se viene richiesto il filtro stagionale, sommiamo solo i punti guadagnati nelle date della stagione
    if season_id:
        season = session.get(Season, season_id)
        if not season or season.gym_id != gym_id:
            raise HTTPException(status_code=400, detail="Stagione non valida")
        points_query = points_query.where(
            and_(
                PointsLedger.created_at >= season.start_date,
                PointsLedger.created_at <= season.end_date
            )
        )
        
    points_query = points_query.group_by(PointsLedger.member_user_id).order_by(func.sum(PointsLedger.points).desc())
    results = session.exec(points_query).all()
    
    leaderboard = []
    for rank, (user_id, total_points) in enumerate(results, 1):
        user = session.get(User, user_id)
        if user:
            level = (total_points // 1000) + 1
            leaderboard.append({
                "rank": rank,
                "user_id": user.id,
                "name": user.name,
                "total_points": total_points,
                "level": level
            })
            
    return {"gym_id": gym_id, "season_id": season_id, "leaderboard": leaderboard}


# ========== API LATO MEMBER (UTENTE CORRENTE) ==========

@router.get("/me/seasons/active")
def get_my_active_seasons(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Ottiene le stagioni correnti attive per le palestre dell'utente"""
    # Auto-seed dei dati demo se l'utente non ha palestre associate
    try:
        seed_demo_data(session, current_user.id)
    except Exception as e:
        print(f"[Engage Seed Error] Failed to seed demo data: {e}")
        
    now = datetime.now(timezone.utc)
    stmt = (
        select(Season, Gym.name)
        .join(Gym, Gym.id == Season.gym_id)
        .join(GymMember, GymMember.gym_id == Gym.id)
        .where(
            GymMember.user_id == current_user.id,
            GymMember.status == "active",
            Season.is_active == True,
            Season.start_date <= now,
            Season.end_date >= now
        )
    )
    results = session.exec(stmt).all()
    
    return [
        {
            "gym_id": season.gym_id,
            "gym_name": gym_name,
            "season": {
                "id": season.id,
                "name": season.name,
                "end_date": season.end_date
            }
        } for season, gym_name in results
    ]

@router.get("/me/progress")
def get_my_progress(
    gym_id: UUID = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Calcola il livello, gli XP e il progresso per la palestra specificata"""
    check_gym_membership(gym_id, current_user.id, session)
    
    # 1. Calcola il totale XP
    total_points = session.exec(
        select(func.sum(PointsLedger.points)).where(
            PointsLedger.member_user_id == current_user.id,
            PointsLedger.gym_id == gym_id
        )
    ).one() or 0
    
    # Calcolo dei livelli (1000 XP = 1 Livello)
    current_level = (total_points // 1000) + 1
    current_level_xp = total_points % 1000
    next_level_xp_needed = 1000 - current_level_xp
    percent_progress = (current_level_xp / 1000.0) * 100.0
    
    # 2. Ottiene i badge sbloccati
    badges_earned = session.exec(
        select(Badge, MemberBadge.earned_at)
        .join(MemberBadge, MemberBadge.badge_id == Badge.id)
        .where(
            Badge.gym_id == gym_id,
            MemberBadge.member_user_id == current_user.id
        )
    ).all()
    
    return {
        "gym_id": gym_id,
        "progress": {
            "total_points": total_points,
            "current_level": current_level,
            "current_level_xp": current_level_xp,
            "next_level_xp_needed": next_level_xp_needed,
            "percent_progress": percent_progress
        },
        "badges": [
            {
                "id": b.id,
                "name": b.name,
                "description": b.description,
                "icon": b.icon,
                "earned_at": earned_at
            } for b, earned_at in badges_earned
        ]
    }

@router.get("/me/challenges")
def get_my_challenges(
    gym_id: UUID = Query(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Lista le challenge a cui l'utente partecipa e il rispettivo progresso"""
    check_gym_membership(gym_id, current_user.id, session)
    
    stmt = (
        select(Challenge, ChallengeEnrollment, ChallengeProgress.current_value)
        .join(ChallengeEnrollment, ChallengeEnrollment.challenge_id == Challenge.id)
        .outerjoin(
            ChallengeProgress,
            and_(
                ChallengeProgress.challenge_id == Challenge.id,
                ChallengeProgress.member_user_id == current_user.id
            )
        )
        .where(
            Challenge.gym_id == gym_id,
            ChallengeEnrollment.member_user_id == current_user.id
        )
    )
    
    results = session.exec(stmt).all()
    
    return [
        {
            "challenge_id": challenge.id,
            "title": challenge.title,
            "description": challenge.description,
            "type": challenge.type,
            "unit": challenge.unit,
            "target_value": challenge.target_value,
            "points_reward": challenge.points_reward,
            "status": enrollment.status,
            "enrolled_at": enrollment.enrolled_at,
            "current_value": current_value or 0.0
        } for challenge, enrollment, current_value in results
    ]

@router.post("/me/challenges/{challenge_id}/enroll", status_code=201)
def enroll_in_challenge(
    challenge_id: UUID,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """Iscrive l'utente corrente a una challenge attiva"""
    challenge = session.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge non trovata")
        
    check_gym_membership(challenge.gym_id, current_user.id, session)
    
    now = datetime.now(timezone.utc)
    if challenge.end_date < now or not challenge.is_active:
        raise HTTPException(status_code=400, detail="La challenge è terminata o non è attiva")
        
    # Verifica se già iscritto
    existing = session.exec(
        select(ChallengeEnrollment).where(
            ChallengeEnrollment.challenge_id == challenge_id,
            ChallengeEnrollment.member_user_id == current_user.id
        )
    ).first()
    
    if existing:
        return existing
        
    enrollment = ChallengeEnrollment(
        challenge_id=challenge_id,
        member_user_id=current_user.id,
        enrolled_at=now,
        status="enrolled"
    )
    
    # Inizializza progresso a zero
    progress = ChallengeProgress(
        challenge_id=challenge_id,
        member_user_id=current_user.id,
        current_value=0.0,
        last_update_at=now
    )
    
    session.add(enrollment)
    session.add(progress)
    session.commit()
    session.refresh(enrollment)
    return enrollment
