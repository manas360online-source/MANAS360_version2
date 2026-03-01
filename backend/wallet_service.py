import os
import uuid
from datetime import datetime, timezone

from database import (
    provider_wallets_col, wallet_transactions_col, payout_requests_col
)

COMMISSION_PERCENT = int(os.environ.get("PLATFORM_COMMISSION_PERCENT", "40"))
THERAPIST_SHARE = int(os.environ.get("THERAPIST_SHARE_PERCENT", "60"))
MIN_PAYOUT = int(os.environ.get("MIN_PAYOUT_AMOUNT", "100000"))


def calculate_split(total_amount: int) -> dict:
    provider_earning = int(total_amount * THERAPIST_SHARE / 100)
    platform_commission = total_amount - provider_earning
    return {
        "provider_earning": provider_earning,
        "platform_commission": platform_commission,
    }


async def get_wallet(provider_id: str) -> dict:
    wallet = await provider_wallets_col.find_one(
        {"provider_id": provider_id}, {"_id": 0}
    )
    if not wallet:
        raise ValueError("Wallet not found")
    return wallet


async def credit_pending(provider_id: str, amount: int, description: str, ref_type: str = None, ref_id: str = None):
    wallet = await get_wallet(provider_id)
    now = datetime.now(timezone.utc).isoformat()
    balance_before = wallet["pending_balance"]
    balance_after = balance_before + amount

    await provider_wallets_col.update_one(
        {"provider_id": provider_id},
        {"$inc": {"pending_balance": amount}, "$set": {"updated_at": now}}
    )

    tx = {
        "id": str(uuid.uuid4()),
        "wallet_id": wallet["id"],
        "user_id": provider_id,
        "type": "CREDIT",
        "amount": amount,
        "balance_before": balance_before,
        "balance_after": balance_after,
        "description": description,
        "reference_type": ref_type,
        "reference_id": ref_id,
        "created_at": now,
    }
    await wallet_transactions_col.insert_one(tx)
    return tx


async def settle_pending(provider_id: str, amount: int, description: str, ref_type: str = None, ref_id: str = None):
    wallet = await get_wallet(provider_id)
    if wallet["pending_balance"] < amount:
        raise ValueError("Insufficient pending balance")

    now = datetime.now(timezone.utc).isoformat()

    await provider_wallets_col.update_one(
        {"provider_id": provider_id},
        {
            "$inc": {
                "pending_balance": -amount,
                "available_balance": amount,
                "lifetime_earnings": amount,
            },
            "$set": {"updated_at": now}
        }
    )

    tx = {
        "id": str(uuid.uuid4()),
        "wallet_id": wallet["id"],
        "user_id": provider_id,
        "type": "CREDIT",
        "amount": amount,
        "balance_before": wallet["available_balance"],
        "balance_after": wallet["available_balance"] + amount,
        "description": description,
        "reference_type": ref_type,
        "reference_id": ref_id,
        "created_at": now,
    }
    await wallet_transactions_col.insert_one(tx)


async def request_payout(provider_id: str, amount: int) -> dict:
    wallet = await get_wallet(provider_id)
    if wallet["available_balance"] < amount:
        raise ValueError("Insufficient available balance")
    if amount < MIN_PAYOUT:
        raise ValueError(f"Minimum payout amount is {MIN_PAYOUT} paise")

    now = datetime.now(timezone.utc).isoformat()
    payout = {
        "id": str(uuid.uuid4()),
        "wallet_id": wallet["id"],
        "provider_id": provider_id,
        "amount": amount,
        "status": "REQUESTED",
        "created_at": now,
        "updated_at": now,
    }
    await payout_requests_col.insert_one(payout)

    # Deduct from available balance
    await provider_wallets_col.update_one(
        {"provider_id": provider_id},
        {"$inc": {"available_balance": -amount}, "$set": {"updated_at": now}}
    )

    tx = {
        "id": str(uuid.uuid4()),
        "wallet_id": wallet["id"],
        "user_id": provider_id,
        "type": "DEBIT",
        "amount": amount,
        "balance_before": wallet["available_balance"],
        "balance_after": wallet["available_balance"] - amount,
        "description": f"Payout request #{payout['id'][:8]}",
        "reference_type": "payout",
        "reference_id": payout["id"],
        "created_at": now,
    }
    await wallet_transactions_col.insert_one(tx)

    payout.pop("_id", None)
    return payout


async def process_payout_action(payout_id: str, action: str, admin_id: str, reason: str = None) -> dict:
    payout = await payout_requests_col.find_one({"id": payout_id}, {"_id": 0})
    if not payout:
        raise ValueError("Payout request not found")
    if payout["status"] != "REQUESTED":
        raise ValueError("Payout already processed")

    now = datetime.now(timezone.utc).isoformat()

    if action == "approve":
        await payout_requests_col.update_one(
            {"id": payout_id},
            {"$set": {
                "status": "APPROVED",
                "approved_by": admin_id,
                "approved_at": now,
                "updated_at": now,
            }}
        )
        await provider_wallets_col.update_one(
            {"provider_id": payout["provider_id"]},
            {"$inc": {"total_withdrawn": payout["amount"]}, "$set": {"last_payout_at": now, "updated_at": now}}
        )
    elif action == "reject":
        await payout_requests_col.update_one(
            {"id": payout_id},
            {"$set": {
                "status": "REJECTED",
                "rejection_reason": reason,
                "approved_by": admin_id,
                "updated_at": now,
            }}
        )
        # Refund balance
        await provider_wallets_col.update_one(
            {"provider_id": payout["provider_id"]},
            {"$inc": {"available_balance": payout["amount"]}, "$set": {"updated_at": now}}
        )

    updated = await payout_requests_col.find_one({"id": payout_id}, {"_id": 0})
    return updated
