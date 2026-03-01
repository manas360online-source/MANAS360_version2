from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    PATIENT = "PATIENT"
    THERAPIST = "THERAPIST"
    PSYCHIATRIST = "PSYCHIATRIST"
    COACH = "COACH"
    ADMIN = "ADMIN"


class ProviderType(str, Enum):
    THERAPIST = "THERAPIST"
    PSYCHIATRIST = "PSYCHIATRIST"
    COACH = "COACH"


class SessionStatus(str, Enum):
    PENDING_PAYMENT = "PENDING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    LIVE = "LIVE"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"
    CANCELLED = "CANCELLED"


class PaymentStatus(str, Enum):
    CREATED = "CREATED"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentType(str, Enum):
    SESSION = "SESSION"
    SUBSCRIPTION = "SUBSCRIPTION"
    LEAD_PURCHASE = "LEAD_PURCHASE"
    CONTENT_PURCHASE = "CONTENT_PURCHASE"
    THERAPIST_PLAN = "THERAPIST_PLAN"


class PayoutStatus(str, Enum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"


class CrisisLevel(str, Enum):
    NONE = "NONE"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    SEVERE = "SEVERE"


class SubscriptionTier(str, Enum):
    FREE = "FREE"
    BASIC = "BASIC"
    PREMIUM = "PREMIUM"


# ---- Auth Models ----

class RegisterRequest(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    role: UserRole = UserRole.PATIENT
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict


class RefreshRequest(BaseModel):
    refresh_token: str


# ---- Session Models ----

class BookSessionRequest(BaseModel):
    provider_id: str
    scheduled_at: str
    duration: int = 60
    notes: Optional[str] = None


class UpdateSessionStatusRequest(BaseModel):
    status: SessionStatus
    notes: Optional[str] = None


# ---- Payment Models ----

class CreatePaymentRequest(BaseModel):
    payment_type: PaymentType
    amount: int
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    metadata: Optional[dict] = None


# ---- Wallet Models ----

class PayoutRequestCreate(BaseModel):
    amount: int


# ---- AI Chat Models ----

class ChatMessageRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    crisis_detected: bool = False
    crisis_level: CrisisLevel = CrisisLevel.NONE
    created_at: str


# ---- Assessment Models ----

class AssessmentSubmitRequest(BaseModel):
    assessment_type: str = "PHQ-9"
    responses: dict


# ---- Mood Models ----

class MoodEntryRequest(BaseModel):
    mood: str
    intensity: int = Field(ge=1, le=10)
    notes: Optional[str] = None
    triggers: List[str] = []
    activities: List[str] = []


# ---- Provider Profile ----

class ProviderProfileUpdate(BaseModel):
    provider_type: Optional[ProviderType] = None
    license_number: Optional[str] = None
    license_body: Optional[str] = None
    specializations: Optional[List[str]] = None
    approaches: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    session_rate: Optional[int] = None
    bio: Optional[str] = None
    years_experience: Optional[int] = None
    is_accepting_patients: Optional[bool] = None


# ---- Admin Models ----

class PayoutActionRequest(BaseModel):
    action: str = Field(pattern="^(approve|reject)$")
    reason: Optional[str] = None


class UserStatusUpdate(BaseModel):
    is_active: bool
    reason: Optional[str] = None
