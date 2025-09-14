from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .auth import router as auth_router
from .voice import router as voice_router
from .vault_ai import router as vault_ai_router
from .server_ai import router as server_ai_router
from .voice_agent import router as voice_agent_router
import os
from dotenv import load_dotenv

# Load environment variables from a .env file if present (local dev)
load_dotenv()

app = FastAPI(title="Collaborative AI Platform API")

# CORS configuration - allows both local development and production
allowed_origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Docker frontend
    "http://localhost:8080",  # Alternative dev port
]

# Add production origins if environment variables are set
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))

if os.getenv("ENVIRONMENT") == "production":
    # Add your production frontend URLs here
    allowed_origins.extend([
        "https://your-app.vercel.app",  # Vercel
        "https://your-app.netlify.app",  # Netlify
        "https://your-app.railway.app",  # Railway
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")
app.include_router(voice_router)
app.include_router(vault_ai_router)
app.include_router(server_ai_router)
app.include_router(voice_agent_router)
