from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.models import Workout, User
from app.auth import get_current_user

router = APIRouter(prefix="/workouts", tags=["workouts"])

@router.get("/", response_model=List[Workout])
def read_workouts(
    skip: int = 0, 
    limit: int = 100, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Only return user's workouts
    statement = select(Workout).where(Workout.user_id == current_user.id).offset(skip).limit(limit)
    workouts = session.exec(statement).all()
    return workouts

@router.post("/", response_model=Workout)
def create_workout(
    workout: Workout, 
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    workout.user_id = current_user.id
    session.add(workout)
    session.commit()
    session.refresh(workout)
    
    # Trigger gamification engine
    try:
        from app.engage_service import process_workout_gamification
        process_workout_gamification(session, current_user.id, workout)
    except Exception as e:
        print(f"[Engage Engine Error] Failed to process workout gamification: {e}")
        
    return workout

@router.post("/sync", response_model=List[Workout])
def sync_workouts(
    workouts: List[Workout],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    synced = []
    for w in workouts:
        existing = session.exec(select(Workout).where(Workout.id == w.id)).first()
        if not existing:
            w.user_id = current_user.id
            session.add(w)
            synced.append(w)
    session.commit()
    
    # Trigger gamification engine for synced workouts
    try:
        from app.engage_service import process_workout_gamification
        for w in synced:
            process_workout_gamification(session, current_user.id, w)
    except Exception as e:
        print(f"[Engage Engine Error] Failed to process synced workouts gamification: {e}")
        
    return synced
