from fastapi import APIRouter, HTTPException

from models import RegisterRequest, LoginRequest, RefreshRequest
from auth_service import register_user, login_user, refresh_tokens, logout_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
async def register(req: RegisterRequest):
    try:
        user = await register_user(
            email=req.email,
            password=req.password,
            first_name=req.first_name,
            last_name=req.last_name,
            role=req.role.value,
            phone=req.phone,
        )
        tokens = await login_user(req.email, req.password)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login")
async def login(req: LoginRequest):
    try:
        return await login_user(req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/refresh")
async def refresh(req: RefreshRequest):
    try:
        return await refresh_tokens(req.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/logout")
async def logout(req: RefreshRequest):
    await logout_user(req.refresh_token)
    return {"message": "Logged out successfully"}
