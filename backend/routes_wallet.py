from fastapi import APIRouter, HTTPException, Depends, Query

from models import PayoutRequestCreate
from middleware import get_current_user, require_roles
from wallet_service import get_wallet, request_payout
from database import wallet_transactions_col

router = APIRouter(prefix="/api/wallet", tags=["wallet"])


@router.get("/balance")
async def balance(user: dict = Depends(require_roles(["THERAPIST", "PSYCHIATRIST", "COACH"]))):
    try:
        wallet = await get_wallet(user["id"])
        return {
            "available_balance": wallet["available_balance"],
            "pending_balance": wallet["pending_balance"],
            "lifetime_earnings": wallet["lifetime_earnings"],
            "total_withdrawn": wallet["total_withdrawn"],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/payout-request")
async def create_payout(req: PayoutRequestCreate, user: dict = Depends(require_roles(["THERAPIST", "PSYCHIATRIST", "COACH"]))):
    try:
        return await request_payout(user["id"], req.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/transactions")
async def transactions(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    user: dict = Depends(require_roles(["THERAPIST", "PSYCHIATRIST", "COACH"])),
):
    try:
        wallet = await get_wallet(user["id"])
        cursor = wallet_transactions_col.find(
            {"wallet_id": wallet["id"]}, {"_id": 0}
        ).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
