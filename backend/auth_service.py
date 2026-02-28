import os
from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from passlib.context import CryptContext
from jose import JWTError, jwt

from database import users_col, refresh_tokens_col, provider_wallets_col, patient_profiles_col

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_SECRET = os.environ.get("JWT_ACCESS_SECRET")
REFRESH_SECRET = os.environ.get("JWT_REFRESH_SECRET")
ACCESS_EXPIRY = int(os.environ.get("JWT_ACCESS_EXPIRY_MINUTES", "15"))
REFRESH_EXPIRY = int(os.environ.get("JWT_REFRESH_EXPIRY_DAYS", "7"))


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRY),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, ACCESS_SECRET, algorithm="HS256")


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRY),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, REFRESH_SECRET, algorithm="HS256")


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, ACCESS_SECRET, algorithms=["HS256"])
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, REFRESH_SECRET, algorithms=["HS256"])
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None


async def register_user(email: str, password: str, first_name: str, last_name: str, role: str, phone: str = None) -> dict:
    existing = await users_col.find_one({"email": email})
    if existing:
        raise ValueError("Email already registered")

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    user_doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(password),
        "first_name": first_name,
        "last_name": last_name,
        "role": role,
        "phone": phone,
        "is_active": True,
        "email_verified": False,
        "created_at": now,
        "updated_at": now,
    }
    await users_col.insert_one(user_doc)

    # Create role-specific profiles
    if role in ("THERAPIST", "PSYCHIATRIST", "COACH"):
        wallet_doc = {
            "id": str(uuid.uuid4()),
            "provider_id": user_id,
            "available_balance": 0,
            "pending_balance": 0,
            "lifetime_earnings": 0,
            "total_withdrawn": 0,
            "created_at": now,
            "updated_at": now,
        }
        await provider_wallets_col.insert_one(wallet_doc)

    if role == "PATIENT":
        patient_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "subscription_tier": "FREE",
            "primary_concerns": [],
            "preferred_languages": ["en"],
            "consent_given": False,
            "created_at": now,
            "updated_at": now,
        }
        await patient_profiles_col.insert_one(patient_doc)

    return _safe_user(user_doc)


async def login_user(email: str, password: str) -> dict:
    user = await users_col.find_one({"email": email})
    if not user or not verify_password(password, user["password_hash"]):
        raise ValueError("Invalid email or password")

    if not user.get("is_active", True):
        raise ValueError("Account is deactivated")

    # Update last login
    await users_col.update_one(
        {"id": user["id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}}
    )

    access = create_access_token(user["id"], user["role"])
    refresh = create_refresh_token(user["id"])

    # Store refresh token
    await refresh_tokens_col.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "token": refresh,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRY),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "user": _safe_user(user),
    }


async def refresh_tokens(refresh_token: str) -> dict:
    payload = decode_refresh_token(refresh_token)
    if not payload:
        raise ValueError("Invalid refresh token")

    stored = await refresh_tokens_col.find_one({"token": refresh_token})
    if not stored or stored.get("revoked_at"):
        raise ValueError("Refresh token revoked or not found")

    # Revoke old token (rotation)
    await refresh_tokens_col.update_one(
        {"token": refresh_token},
        {"$set": {"revoked_at": datetime.now(timezone.utc).isoformat()}}
    )

    user = await users_col.find_one({"id": payload["sub"]})
    if not user:
        raise ValueError("User not found")

    access = create_access_token(user["id"], user["role"])
    new_refresh = create_refresh_token(user["id"])

    await refresh_tokens_col.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "token": new_refresh,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=REFRESH_EXPIRY),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "access_token": access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": _safe_user(user),
    }


async def logout_user(refresh_token: str):
    await refresh_tokens_col.update_one(
        {"token": refresh_token},
        {"$set": {"revoked_at": datetime.now(timezone.utc).isoformat()}}
    )


def _safe_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "role": user["role"],
        "phone": user.get("phone"),
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at"),
    }
