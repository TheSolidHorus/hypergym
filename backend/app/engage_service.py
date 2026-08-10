import json
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlmodel import Session, select, func
from app.models import Workout, User
from app.models_engage import (
    GymMember,
    Season,
    Challenge,
    ChallengeEnrollment,
    ChallengeProgress,
    PointsLedger,
    Badge,
    MemberBadge
)

def calculate_volume(exercises_data_str: Optional[str]) -> float:
    """
    Calcola il volume totale sollevato (peso * rep) analizzando la stringa JSON dei set eseguiti.
    """
    if not exercises_data_str:
        return 0.0
    try:
        exercises = json.loads(exercises_data_str)
        total_volume = 0.0
        if isinstance(exercises, list):
            for ex in exercises:
                sets = ex.get("setsData", [])
                if isinstance(sets, list):
                    for s in sets:
                        # Conteggia solo se il set è completato (done=True) o se il campo 'done' non è specificato
                        is_done = s.get("done", True)
                        if is_done:
                            kg = float(s.get("kg") or 0.0)
                            reps = int(s.get("reps") or 0)
                            total_volume += kg * reps
        return total_volume
    except Exception as e:
        print(f"[Engage] Errore nel calcolo del volume: {e}")
        return 0.0

def process_workout_gamification(session: Session, user_id: UUID, workout: Workout):
    """
    Invocato dopo la creazione/sincronizzazione di un workout.
    Elabora i progressi delle challenge attive per l'utente, distribuisce punti XP
    e sblocca eventuali badge.
    """
    now = datetime.now(timezone.utc)
    
    # 1. Recupera le palestre attive a cui l'utente appartiene
    gym_memberships = session.exec(
        select(GymMember).where(
            GymMember.user_id == user_id,
            GymMember.status == "active"
        )
    ).all()
    
    if not gym_memberships:
        print(f"[Engage] L'utente {user_id} non è associato ad alcuna palestra attiva. Salto gamification.")
        return
        
    for membership in gym_memberships:
        gym_id = membership.gym_id
        
        # 2. Assegna punti XP base per aver loggato l'allenamento (es. 50 XP)
        # Evita duplicati se lo stesso workout id è già registrato nel ledger
        existing_base_points = session.exec(
            select(PointsLedger).where(
                PointsLedger.member_user_id == user_id,
                PointsLedger.gym_id == gym_id,
                PointsLedger.source_type == "workout_logged",
                PointsLedger.source_id == workout.id
            )
        ).first()
        
        if not existing_base_points:
            base_xp = PointsLedger(
                gym_id=gym_id,
                member_user_id=user_id,
                source_type="workout_logged",
                source_id=workout.id,
                points=50,
                created_at=now
            )
            session.add(base_xp)
            print(f"[Engage] Assegnati 50 XP base all'utente {user_id} per la palestra {gym_id}")
            
        # 3. Trova le challenge attive per questa palestra in cui l'utente è iscritto ('enrolled')
        active_challenges_stmt = (
            select(Challenge, ChallengeEnrollment)
            .join(ChallengeEnrollment, ChallengeEnrollment.challenge_id == Challenge.id)
            .where(
                Challenge.gym_id == gym_id,
                Challenge.is_active == True,
                Challenge.start_date <= now,
                Challenge.end_date >= now,
                ChallengeEnrollment.member_user_id == user_id,
                ChallengeEnrollment.status == "enrolled"
            )
        )
        active_challenges_results = session.exec(active_challenges_stmt).all()
        
        for challenge, enrollment in active_challenges_results:
            # 4. Calcola l'incremento a seconda del tipo di challenge
            increment = 0.0
            if challenge.type == "workout_count":
                increment = 1.0
            elif challenge.type == "workout_duration":
                if workout.started_at and workout.ended_at:
                    duration_mins = (workout.ended_at - workout.started_at).total_seconds() / 60.0
                    increment = max(0.0, round(duration_mins, 2))
                else:
                    increment = 45.0  # Durata standard di fallback in minuti
            elif challenge.type == "volume_lifted":
                increment = calculate_volume(workout.exercises_data)
                
            if increment <= 0:
                continue
                
            # 5. Aggiorna o crea il record di progresso
            progress = session.exec(
                select(ChallengeProgress).where(
                    ChallengeProgress.challenge_id == challenge.id,
                    ChallengeProgress.member_user_id == user_id
                )
            ).first()
            
            if not progress:
                progress = ChallengeProgress(
                    challenge_id=challenge.id,
                    member_user_id=user_id,
                    current_value=0.0,
                    last_update_at=now
                )
                session.add(progress)
                
            progress.current_value += increment
            progress.last_update_at = now
            session.add(progress)
            print(f"[Engage] Aggiornato progresso challenge '{challenge.title}' per utente {user_id}: +{increment} {challenge.unit}")
            
            # 6. Verifica completamento challenge
            if progress.current_value >= challenge.target_value:
                enrollment.status = "completed"
                session.add(enrollment)
                
                # Assegna i punti bonus della challenge
                bonus_xp = PointsLedger(
                    gym_id=gym_id,
                    member_user_id=user_id,
                    source_type="challenge_completed",
                    source_id=challenge.id,
                    points=challenge.points_reward,
                    created_at=now
                )
                session.add(bonus_xp)
                print(f"[Engage] Challenge '{challenge.title}' COMPLETATA! Assegnati +{challenge.points_reward} XP bonus.")
                
        # 7. Sblocco dei Badge / Achievements
        # Trova tutti i badge della palestra che l'utente non ha ancora sbloccato
        unlocked_badge_ids_stmt = select(MemberBadge.badge_id).where(MemberBadge.member_user_id == user_id)
        unlocked_badge_ids = session.exec(unlocked_badge_ids_stmt).all()
        
        available_badges_stmt = select(Badge).where(Badge.gym_id == gym_id)
        if unlocked_badge_ids:
            available_badges_stmt = available_badges_stmt.where(Badge.id.notin_(unlocked_badge_ids))
            
        available_badges = session.exec(available_badges_stmt).all()
        
        for badge in available_badges:
            should_unlock = False
            
            if badge.criteria_type == "total_workouts":
                # Conta gli allenamenti totali eseguiti dall'utente
                workout_count = session.exec(
                    select(func.count(Workout.id)).where(Workout.user_id == user_id)
                ).one()
                if workout_count >= badge.criteria_value:
                    should_unlock = True
                    
            elif badge.criteria_type == "total_points":
                # Somma dei punti guadagnati in questa palestra
                points_sum = session.exec(
                    select(func.sum(PointsLedger.points)).where(
                        PointsLedger.member_user_id == user_id,
                        PointsLedger.gym_id == gym_id
                    )
                ).one() or 0
                if points_sum >= badge.criteria_value:
                    should_unlock = True
                    
            # Aggiungere altri tipi di criteri se necessario
            
            if should_unlock:
                new_member_badge = MemberBadge(
                    badge_id=badge.id,
                    member_user_id=user_id,
                    earned_at=now
                )
                session.add(new_member_badge)
                print(f"[Engage] BADGE SBLOCCATO: '{badge.name}' per l'utente {user_id}!")
                
    session.commit()
