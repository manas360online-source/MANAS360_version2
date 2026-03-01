from fastapi import APIRouter, HTTPException, Depends, Query

from models import ProviderProfileUpdate
from middleware import get_current_user, require_roles
from database import users_col, provider_profiles_col, sessions_col

router = APIRouter(prefix="/api/providers", tags=["providers"])


@router.get("/")
async def list_providers(
    provider_type: str = Query(None),
    specialization: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    query = {"role": {"$in": ["THERAPIST", "PSYCHIATRIST", "COACH"]}, "is_active": True}
    if provider_type:
        query["role"] = provider_type

    cursor = users_col.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit)
    providers = await cursor.to_list(length=limit)

    # Enrich with profile data
    result = []
    for p in providers:
        profile = await provider_profiles_col.find_one({"user_id": p["id"]}, {"_id": 0})
        if specialization and profile:
            specs = profile.get("specializations", [])
            if specialization.lower() not in [s.lower() for s in specs]:
                continue
        result.append({**p, "profile": profile})

    return result


@router.get("/me/profile")
async def my_profile(user: dict = Depends(require_roles(["THERAPIST", "PSYCHIATRIST", "COACH"]))):
    profile = await provider_profiles_col.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"user": {k: v for k, v in user.items() if k != "password_hash"}, "profile": profile}


@router.put("/me/profile")
async def update_profile(req: ProviderProfileUpdate, user: dict = Depends(require_roles(["THERAPIST", "PSYCHIATRIST", "COACH"]))):
    import uuid
    from datetime import datetime, timezone

    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    existing = await provider_profiles_col.find_one({"user_id": user["id"]})
    if existing:
        await provider_profiles_col.update_one(
            {"user_id": user["id"]}, {"$set": update_data}
        )
    else:
        update_data["id"] = str(uuid.uuid4())
        update_data["user_id"] = user["id"]
        update_data["created_at"] = datetime.now(timezone.utc).isoformat()
        await provider_profiles_col.insert_one(update_data)

    profile = await provider_profiles_col.find_one({"user_id": user["id"]}, {"_id": 0})
    return profile


@router.get("/{provider_id}")
async def get_provider(provider_id: str):
    provider = await users_col.find_one(
        {"id": provider_id, "role": {"$in": ["THERAPIST", "PSYCHIATRIST", "COACH"]}},
        {"_id": 0, "password_hash": 0}
    )
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    profile = await provider_profiles_col.find_one({"user_id": provider_id}, {"_id": 0})
    total_sessions = await sessions_col.count_documents({"provider_id": provider_id, "status": "COMPLETED"})

    return {**provider, "profile": profile, "total_completed_sessions": total_sessions}


@router.get("/me/sessions")
async def my_sessions(
    status: str = Query(None),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: dict = Depends(require_roles(["THERAPIST", "PSYCHIATRIST", "COACH"])),
):
    query = {"provider_id": user["id"]}
    if status:
        query["status"] = status

    cursor = sessions_col.find(query, {"_id": 0}).sort("scheduled_at", -1).skip(skip).limit(limit)
    return await cursor.to_list(length=limit)
