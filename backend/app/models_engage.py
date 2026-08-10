from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone

# ========== MULTI-TENANT ORGANIZATIONS ==========

class Gym(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    logo_url: Optional[str] = None
    country: str = "IT"
    timezone: str = "Europe/Rome"
    plan: str = "basic"  # basic, pro
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class GymMember(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    gym_id: UUID = Field(foreign_key="gym.id", index=True)
    user_id: UUID = Field(foreign_key="user.id", index=True)
    role: str = "member"  # member, coach, admin
    status: str = "active"  # active, inactive
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ========== BATTLE PASS / SEASONS & CHALLENGES ==========

class Season(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    gym_id: UUID = Field(foreign_key="gym.id", index=True)
    name: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Challenge(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    gym_id: UUID = Field(foreign_key="gym.id", index=True)
    season_id: Optional[UUID] = Field(default=None, foreign_key="season.id", index=True, nullable=True)
    title: str
    description: Optional[str] = None
    type: str  # workout_count, workout_duration, volume_lifted, streak_days
    target_value: float
    unit: str  # workouts, minutes, kg, days
    points_reward: int = 100
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChallengeEnrollment(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    challenge_id: UUID = Field(foreign_key="challenge.id", index=True)
    member_user_id: UUID = Field(foreign_key="user.id", index=True)
    enrolled_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "enrolled"  # enrolled, completed, failed

class ChallengeProgress(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    challenge_id: UUID = Field(foreign_key="challenge.id", index=True)
    member_user_id: UUID = Field(foreign_key="user.id", index=True)
    current_value: float = 0.0
    last_update_at: datetime = Field(default_factory=datetime.utcnow)

# ========== GAMIFICATION LOGS & REWARDS ==========

class PointsLedger(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    gym_id: UUID = Field(foreign_key="gym.id", index=True)
    member_user_id: UUID = Field(foreign_key="user.id", index=True)
    source_type: str  # workout_logged, check_in, challenge_completed, referral, manual_adjustment
    source_id: Optional[UUID] = None  # external ID
    points: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Badge(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    gym_id: UUID = Field(foreign_key="gym.id", index=True)
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    criteria_type: str  # total_workouts, total_points, streak_days
    criteria_value: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MemberBadge(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    badge_id: UUID = Field(foreign_key="badge.id", index=True)
    member_user_id: UUID = Field(foreign_key="user.id", index=True)
    earned_at: datetime = Field(default_factory=datetime.utcnow)

class Reward(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    gym_id: UUID = Field(foreign_key="gym.id", index=True)
    name: str
    description: Optional[str] = None
    cost_points: int
    stock: Optional[int] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MemberReward(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    reward_id: UUID = Field(foreign_key="reward.id", index=True)
    member_user_id: UUID = Field(foreign_key="user.id", index=True)
    redeemed_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"  # pending, approved, delivered, rejected
    notes: Optional[str] = None

class Event(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    gym_id: UUID = Field(foreign_key="gym.id", index=True)
    member_user_id: UUID = Field(foreign_key="user.id", index=True)
    event_type: str
    payload: str = "{}"  # Stored as JSON string
    created_at: datetime = Field(default_factory=datetime.utcnow)
