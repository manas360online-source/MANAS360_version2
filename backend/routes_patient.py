from fastapi import APIRouter, HTTPException, Depends, Query

from models import AssessmentSubmitRequest, MoodEntryRequest
from middleware import get_current_user, require_roles
from database import assessments_col, mood_entries_col, patient_profiles_col
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/patient", tags=["patient"])

PHQ9_SEVERITY = [
    (4, "minimal"), (9, "mild"), (14, "moderate"), (19, "moderately_severe"), (27, "severe")
]


def calculate_phq9_score(responses: dict) -> tuple:
    score = sum(int(v) for v in responses.values())
    severity = "severe"
    for threshold, label in PHQ9_SEVERITY:
        if score <= threshold:
            severity = label
            break
    is_crisis = score >= 20 or int(responses.get("q9", 0)) >= 2
    return score, severity, is_crisis


@router.post("/assessments")
async def submit_assessment(req: AssessmentSubmitRequest, user: dict = Depends(require_roles(["PATIENT"]))):
    now = datetime.now(timezone.utc).isoformat()

    score, severity, is_crisis = None, None, False
    if req.assessment_type == "PHQ-9":
        score, severity, is_crisis = calculate_phq9_score(req.responses)

    patient_profile = await patient_profiles_col.find_one({"user_id": user["id"]}, {"_id": 0})
    patient_id = patient_profile["id"] if patient_profile else user["id"]

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "patient_id": patient_id,
        "assessment_type": req.assessment_type,
        "responses": req.responses,
        "score": score,
        "severity": severity,
        "is_crisis": is_crisis,
        "crisis_level": "HIGH" if is_crisis else "NONE",
        "completed_at": now,
    }
    await assessments_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/assessments")
async def list_assessments(
    limit: int = Query(10, ge=1, le=50),
    user: dict = Depends(require_roles(["PATIENT"])),
):
    cursor = assessments_col.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("completed_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


@router.post("/mood")
async def log_mood(req: MoodEntryRequest, user: dict = Depends(require_roles(["PATIENT"]))):
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "mood": req.mood,
        "intensity": req.intensity,
        "notes": req.notes,
        "triggers": req.triggers,
        "activities": req.activities,
        "date": now,
        "created_at": now,
    }
    await mood_entries_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/mood")
async def get_mood_history(
    limit: int = Query(30, ge=1, le=100),
    user: dict = Depends(require_roles(["PATIENT"])),
):
    cursor = mood_entries_col.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("date", -1).limit(limit)
    return await cursor.to_list(length=limit)


@router.get("/profile")
async def get_profile(user: dict = Depends(require_roles(["PATIENT"]))):
    profile = await patient_profiles_col.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"user": {k: v for k, v in user.items() if k != "password_hash"}, "profile": profile}
