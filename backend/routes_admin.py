from fastapi import APIRouter, HTTPException, Depends, Query

from models import PayoutActionRequest, UserStatusUpdate
from middleware import require_roles
from wallet_service import process_payout_action
from database import (
    users_col, sessions_col, payments_col,
    payout_requests_col, provider_wallets_col,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard")
async def dashboard(user: dict = Depends(require_roles(["ADMIN"]))):
    total_users = await users_col.count_documents({})
    total_patients = await users_col.count_documents({"role": "PATIENT"})
    total_providers = await users_col.count_documents({"role": {"$in": ["THERAPIST", "PSYCHIATRIST", "COACH"]}})
    total_sessions = await sessions_col.count_documents({})
    completed_sessions = await sessions_col.count_documents({"status": "COMPLETED"})
    pending_payouts = await payout_requests_col.count_documents({"status": "REQUESTED"})

    return {
        "total_users": total_users,
        "total_patients": total_patients,
        "total_providers": total_providers,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "pending_payouts": pending_payouts,
    }


@router.get("/users")
async def list_users(
    role: str = Query(None),
    is_active: bool = Query(None),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: dict = Depends(require_roles(["ADMIN"])),
):
    query = {}
    if role:
        query["role"] = role
    if is_active is not None:
        query["is_active"] = is_active

    cursor = users_col.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    total = await users_col.count_documents(query)
    return {"users": users, "total": total}


@router.patch("/users/{user_id}/status")
async def update_user_status(user_id: str, req: UserStatusUpdate, admin: dict = Depends(require_roles(["ADMIN"]))):
    target = await users_col.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    await users_col.update_one(
        {"id": user_id},
        {"$set": {"is_active": req.is_active}}
    )
    return {"message": f"User {'activated' if req.is_active else 'deactivated'}", "user_id": user_id}


@router.get("/payouts")
async def list_payouts(
    status: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: dict = Depends(require_roles(["ADMIN"])),
):
    query = {}
    if status:
        query["status"] = status

    cursor = payout_requests_col.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    payouts = await cursor.to_list(length=limit)
    total = await payout_requests_col.count_documents(query)
    return {"payouts": payouts, "total": total}


@router.post("/payouts/{payout_id}/action")
async def payout_action(payout_id: str, req: PayoutActionRequest, admin: dict = Depends(require_roles(["ADMIN"]))):
    try:
        return await process_payout_action(payout_id, req.action, admin["id"], req.reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/sessions")
async def list_all_sessions(
    status: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: dict = Depends(require_roles(["ADMIN"])),
):
    query = {}
    if status:
        query["status"] = status

    cursor = sessions_col.find(query, {"_id": 0}).sort("scheduled_at", -1).skip(skip).limit(limit)
    sessions = await cursor.to_list(length=limit)
    total = await sessions_col.count_documents(query)
    return {"sessions": sessions, "total": total}
