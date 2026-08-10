from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timezone

# ========== USER ==========
class UserBase(SQLModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str = "member"

class User(UserBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    password_hash: Optional[str] = None
    device_id: Optional[str] = None
    
    # Verifica email
    email_verified: bool = False
    verification_code: Optional[str] = None
    verification_code_expires: Optional[datetime] = None
    # HIGH-02 FIX: protezione brute-force OTP
    otp_attempts: int = 0
    otp_locked_until: Optional[datetime] = None
    
    # Stato certificato
    certificate_uploaded: bool = False
    certificate_filename: Optional[str] = None
    certificate_uploaded_at: Optional[datetime] = None
    certificate_expires_at: Optional[datetime] = None
    
    # Stats
    workouts_completed: int = 0
    streak: int = 0
    training_days_goal: int = 3
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_sync_at: Optional[datetime] = None
    
    # Relationships
    workouts: List["Workout"] = Relationship(back_populates="user")

# === REQUEST / RESPONSE SCHEMAS ===

class UserRegister(SQLModel):
    name: str
    email: str
    phone: Optional[str] = None
    password: str

class UserLogin(SQLModel):
    email: str
    password: str

class VerifyEmail(SQLModel):
    email: str
    code: str

class UserCreate(SQLModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    device_id: Optional[str] = None

class UserRead(SQLModel):
    id: UUID
    name: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    email_verified: bool
    certificate_uploaded: bool
    workouts_completed: int
    streak: int
    training_days_goal: int
    created_at: datetime

class UserSync(SQLModel):
    device_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    certificate_uploaded: bool = False
    certificate_filename: Optional[str] = None
    certificate_expires_at: Optional[datetime] = None
    workouts_completed: int = 0
    streak: int = 0
    training_days_goal: int = 3

class UserPublic(SQLModel):
    id: UUID
    name: str
    email: Optional[str]
    phone: Optional[str]
    email_verified: bool
    certificate_uploaded: bool
    certificate_filename: Optional[str]
    certificate_uploaded_at: Optional[datetime]
    certificate_expires_at: Optional[datetime]
    workouts_completed: int
    streak: int
    created_at: datetime
    last_sync_at: Optional[datetime]

# ========== REFRESH TOKEN ==========
class RefreshToken(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    token_hash: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ========== WORKOUT ==========
class Workout(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="user.id")
    name: Optional[str] = "Allenamento"
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    exercises_data: Optional[str] = None
    
    user: Optional[User] = Relationship(back_populates="workouts")

# ========== ADMIN STATS ==========
class AdminStats(SQLModel):
    total_users: int
    users_with_certificate: int
    users_without_certificate: int
    certificates_expiring_soon: int
    total_workouts: int
    active_users_last_7_days: int

# Registrazione dei modelli Engage per la creazione automatica delle tabelle
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
    MemberReward,
    Event
)

