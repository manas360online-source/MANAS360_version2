import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_col = db["users"]
user_profiles_col = db["user_profiles"]
provider_profiles_col = db["provider_profiles"]
patient_profiles_col = db["patient_profiles"]
provider_wallets_col = db["provider_wallets"]
wallet_transactions_col = db["wallet_transactions"]
sessions_col = db["sessions"]
payments_col = db["payments"]
payout_requests_col = db["payout_requests"]
refresh_tokens_col = db["refresh_tokens"]
ai_chat_sessions_col = db["ai_chat_sessions"]
ai_chat_messages_col = db["ai_chat_messages"]
assessments_col = db["assessments"]
mood_entries_col = db["mood_entries"]
notifications_col = db["notifications"]
audit_logs_col = db["audit_logs"]
subscription_plans_col = db["subscription_plans"]
subscriptions_col = db["subscriptions"]


async def create_indexes():
    await users_col.create_index("email", unique=True)
    await users_col.create_index("phone", sparse=True)
    await users_col.create_index("role")
    await refresh_tokens_col.create_index("token", unique=True)
    await refresh_tokens_col.create_index("user_id")
    await refresh_tokens_col.create_index("expires_at", expireAfterSeconds=0)
    await sessions_col.create_index("patient_id")
    await sessions_col.create_index("provider_id")
    await sessions_col.create_index("status")
    await sessions_col.create_index("scheduled_at")
    await payments_col.create_index("user_id")
    await payments_col.create_index("razorpay_order_id", sparse=True, unique=True)
    await payments_col.create_index("status")
    await provider_wallets_col.create_index("provider_id", unique=True)
    await wallet_transactions_col.create_index("wallet_id")
    await wallet_transactions_col.create_index("created_at")
    await payout_requests_col.create_index("provider_id")
    await payout_requests_col.create_index("status")
    await ai_chat_sessions_col.create_index("user_id")
    await ai_chat_messages_col.create_index("session_id")
    await ai_chat_messages_col.create_index("created_at")
    await assessments_col.create_index("user_id")
    await mood_entries_col.create_index([("user_id", 1), ("date", -1)])
    await audit_logs_col.create_index("created_at")
    await notifications_col.create_index([("user_id", 1), ("read_at", 1)])
