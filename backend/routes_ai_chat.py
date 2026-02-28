from fastapi import APIRouter, HTTPException, Depends

from models import ChatMessageRequest, CrisisLevel
from middleware import get_current_user
from database import ai_chat_sessions_col, ai_chat_messages_col
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api/ai-chat", tags=["ai-chat"])

SYSTEM_PROMPT = """You are AnytimeBuddy, a compassionate and empathetic AI mental wellness companion for MANAS360.
Your role is to:
- Provide emotional support and active listening
- Help users explore their feelings in a safe, non-judgmental space
- Suggest evidence-based coping strategies (breathing exercises, grounding techniques, journaling prompts)
- Encourage professional help when appropriate
- Detect crisis situations and respond with appropriate resources

You are NOT a therapist. You do not diagnose, prescribe, or replace professional mental health care.
Always be warm, validating, and culturally sensitive. Support users in Hindi, English, or Hinglish as they prefer.

CRISIS DETECTION: If a user expresses suicidal ideation, self-harm intent, or immediate danger, respond with:
1. Acknowledge their pain with empathy
2. Provide AASRA helpline: 9820466726
3. Provide iCall: 9152987821
4. Encourage them to reach out to someone they trust
5. Set crisis_detected to true in your response"""

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "want to die", "no reason to live",
    "self harm", "cut myself", "overdose", "jump off", "hang myself",
    "marna chahta", "marna chahti", "jee nahi lagta", "zindagi se tang",
]


def detect_crisis(message: str) -> tuple:
    msg_lower = message.lower()
    for keyword in CRISIS_KEYWORDS:
        if keyword in msg_lower:
            return True, CrisisLevel.HIGH
    return False, CrisisLevel.NONE


# AI service - uses mock response if no API key configured
ai_client = None


def get_ai_client():
    global ai_client
    if ai_client is not None:
        return ai_client
    try:
        from emergentintegrations.llm import ChatLLM
        ai_client = ChatLLM
        return ai_client
    except ImportError:
        return None


async def generate_ai_response(messages: list, user_message: str) -> str:
    client_cls = get_ai_client()
    if client_cls:
        try:
            import os
            llm = client_cls(
                api_key=os.environ.get("EMERGENT_LLM_KEY", ""),
                model="claude-sonnet-4-20250514",
            )
            formatted = [{"role": "system", "content": SYSTEM_PROMPT}]
            for m in messages[-10:]:
                formatted.append({"role": m["role"], "content": m["content"]})
            formatted.append({"role": "user", "content": user_message})

            response = await llm.chat_async(formatted)
            return response
        except Exception as e:
            print(f"AI service error: {e}")

    # Fallback mock response
    crisis, _ = detect_crisis(user_message)
    if crisis:
        return ("I hear you, and I want you to know that your feelings are valid. "
                "Please reach out to AASRA helpline: 9820466726 or iCall: 9152987821. "
                "You don't have to go through this alone. Would you like to talk about what you're feeling?")

    return ("Thank you for sharing that with me. I'm here to listen and support you. "
            "Could you tell me more about how you're feeling? Remember, it's okay to take things one step at a time.")


@router.post("/message")
async def send_message(req: ChatMessageRequest, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()

    # Get or create chat session
    session_id = req.session_id
    if not session_id:
        session_id = str(uuid.uuid4())
        await ai_chat_sessions_col.insert_one({
            "id": session_id,
            "user_id": user["id"],
            "created_at": now,
            "updated_at": now,
        })

    # Detect crisis
    crisis_detected, crisis_level = detect_crisis(req.message)

    # Store user message
    user_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user["id"],
        "role": "user",
        "content": req.message,
        "crisis_detected": crisis_detected,
        "crisis_level": crisis_level.value,
        "created_at": now,
    }
    await ai_chat_messages_col.insert_one(user_msg)

    # Get conversation history
    history_cursor = ai_chat_messages_col.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).limit(20)
    history = await history_cursor.to_list(length=20)

    # Generate AI response
    ai_response = await generate_ai_response(history, req.message)

    # Store AI response
    ai_msg = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "user_id": user["id"],
        "role": "assistant",
        "content": ai_response,
        "crisis_detected": crisis_detected,
        "crisis_level": crisis_level.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await ai_chat_messages_col.insert_one(ai_msg)

    user_msg.pop("_id", None)
    ai_msg.pop("_id", None)
    return {
        "session_id": session_id,
        "user_message": {
            "id": user_msg["id"],
            "content": user_msg["content"],
            "crisis_detected": crisis_detected,
        },
        "ai_response": {
            "id": ai_msg["id"],
            "content": ai_msg["content"],
            "crisis_detected": crisis_detected,
            "crisis_level": crisis_level.value,
        },
    }


@router.get("/sessions")
async def list_chat_sessions(user: dict = Depends(get_current_user)):
    cursor = ai_chat_sessions_col.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("updated_at", -1)
    return await cursor.to_list(length=50)


@router.get("/sessions/{session_id}/messages")
async def get_chat_messages(session_id: str, user: dict = Depends(get_current_user)):
    session = await ai_chat_sessions_col.find_one({"id": session_id, "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    cursor = ai_chat_messages_col.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1)
    return await cursor.to_list(length=200)
