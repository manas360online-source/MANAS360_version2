from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional

from models import BookSessionRequest, UpdateSessionStatusRequest
from middleware import get_current_user, require_roles
from session_service import (
    book_session, confirm_session, complete_session,
    mark_no_show, get_user_sessions, get_session_by_id,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.post("/book")
async def book(req: BookSessionRequest, user: dict = Depends(require_roles(["PATIENT"]))):
    try:
        session = await book_session(
            patient_id=user["id"],
            provider_id=req.provider_id,
            scheduled_at=req.scheduled_at,
            duration=req.duration,
            notes=req.notes,
        )
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{session_id}/confirm")
async def confirm(session_id: str, user: dict = Depends(get_current_user)):
    try:
        return await confirm_session(session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{session_id}/complete")
async def complete(session_id: str, user: dict = Depends(require_roles(["THERAPIST", "PSYCHIATRIST", "COACH", "ADMIN"]))):
    try:
        return await complete_session(session_id, user["id"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{session_id}/no-show")
async def no_show(session_id: str, user: dict = Depends(require_roles(["THERAPIST", "PSYCHIATRIST", "COACH", "ADMIN"]))):
    try:
        return await mark_no_show(session_id, user["role"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
async def list_sessions(
    status: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: dict = Depends(get_current_user),
):
    return await get_user_sessions(user["id"], user["role"], status, limit, skip)


@router.get("/{session_id}")
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    try:
        return await get_session_by_id(session_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
