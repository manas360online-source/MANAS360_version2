from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import create_indexes
from routes_auth import router as auth_router
from routes_sessions import router as sessions_router
from routes_wallet import router as wallet_router
from routes_admin import router as admin_router
from routes_providers import router as providers_router
from routes_patient import router as patient_router
from routes_ai_chat import router as ai_chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_indexes()
    yield


app = FastAPI(
    title="MANAS360 API",
    description="Mental Wellness Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(wallet_router)
app.include_router(admin_router)
app.include_router(providers_router)
app.include_router(patient_router)
app.include_router(ai_chat_router)


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "MANAS360",
        "version": "1.0.0",
    }
