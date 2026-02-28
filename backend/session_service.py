import os
import uuid
from datetime import datetime, timezone

from database import sessions_col, users_col, payments_col
from wallet_service import calculate_split, credit_pending, settle_pending

COMMISSION = int(os.environ.get("PLATFORM_COMMISSION_PERCENT", "40"))


async def book_session(patient_id: str, provider_id: str, scheduled_at: str, duration: int = 60, notes: str = None) -> dict:
    provider = await users_col.find_one({"id": provider_id, "role": {"$in": ["THERAPIST", "PSYCHIATRIST", "COACH"]}}, {"_id": 0})
    if not provider:
        raise ValueError("Provider not found")

    # Check for scheduling conflict
    conflict = await sessions_col.find_one({
        "provider_id": provider_id,
        "scheduled_at": scheduled_at,
        "status": {"$nin": ["CANCELLED", "NO_SHOW"]},
    })
    if conflict:
        raise ValueError("Time slot not available")

    fee = 150000  # Default 1500 INR in paise, can be dynamic
    split = calculate_split(fee)
    now = datetime.now(timezone.utc).isoformat()

    session_doc = {
        "id": str(uuid.uuid4()),
        "patient_id": patient_id,
        "provider_id": provider_id,
        "scheduled_at": scheduled_at,
        "duration": duration,
        "status": "PENDING_PAYMENT",
        "fee": fee,
        "platform_commission": split["platform_commission"],
        "provider_earning": split["provider_earning"],
        "notes": notes,
        "created_at": now,
        "updated_at": now,
    }
    await sessions_col.insert_one(session_doc)
    session_doc.pop("_id", None)
    return session_doc


async def confirm_session(session_id: str, payment_id: str = None) -> dict:
    session = await sessions_col.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise ValueError("Session not found")
    if session["status"] != "PENDING_PAYMENT":
        raise ValueError(f"Cannot confirm session in {session['status']} state")

    now = datetime.now(timezone.utc).isoformat()
    await sessions_col.update_one(
        {"id": session_id},
        {"$set": {"status": "CONFIRMED", "payment_id": payment_id, "updated_at": now}}
    )

    # Credit provider's pending balance
    await credit_pending(
        session["provider_id"],
        session["provider_earning"],
        f"Session #{session_id[:8]} confirmed",
        ref_type="session",
        ref_id=session_id,
    )

    updated = await sessions_col.find_one({"id": session_id}, {"_id": 0})
    return updated


async def complete_session(session_id: str, user_id: str) -> dict:
    session = await sessions_col.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise ValueError("Session not found")
    if session["status"] not in ("CONFIRMED", "LIVE"):
        raise ValueError(f"Cannot complete session in {session['status']} state")

    now = datetime.now(timezone.utc).isoformat()
    await sessions_col.update_one(
        {"id": session_id},
        {"$set": {"status": "COMPLETED", "ended_at": now, "updated_at": now}}
    )

    # Settle pending to available
    await settle_pending(
        session["provider_id"],
        session["provider_earning"],
        f"Session #{session_id[:8]} completed",
        ref_type="session",
        ref_id=session_id,
    )

    updated = await sessions_col.find_one({"id": session_id}, {"_id": 0})
    return updated


async def mark_no_show(session_id: str, marked_by: str) -> dict:
    session = await sessions_col.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise ValueError("Session not found")
    if session["status"] not in ("CONFIRMED", "LIVE"):
        raise ValueError("Cannot mark no-show for this session")

    now = datetime.now(timezone.utc).isoformat()
    await sessions_col.update_one(
        {"id": session_id},
        {"$set": {
            "status": "NO_SHOW",
            "no_show_marked_by": marked_by,
            "no_show_marked_at": now,
            "updated_at": now,
        }}
    )
    updated = await sessions_col.find_one({"id": session_id}, {"_id": 0})
    return updated


async def get_user_sessions(user_id: str, role: str, status: str = None, limit: int = 20, skip: int = 0) -> list:
    query = {}
    if role == "PATIENT":
        query["patient_id"] = user_id
    else:
        query["provider_id"] = user_id

    if status:
        query["status"] = status

    cursor = sessions_col.find(query, {"_id": 0}).sort("scheduled_at", -1).skip(skip).limit(limit)
    return await cursor.to_list(length=limit)


async def get_session_by_id(session_id: str) -> dict:
    session = await sessions_col.find_one({"id": session_id}, {"_id": 0})
    if not session:
        raise ValueError("Session not found")
    return session
