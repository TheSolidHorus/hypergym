from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Carica variabili d'ambiente dal file .env
load_dotenv()

from .database import init_db
from .routers import auth, workouts, admin, sync, ai, engage

# ── MED-06 FIX: Disabilita Swagger/ReDoc in produzione ───────────────────────
IS_PRODUCTION = os.getenv("ENV", "development").lower() == "production"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown

app = FastAPI(
    title="HyperGym API",
    description="Backend API per HyperGym - Gym, Sport & Conditioning",
    version="1.0.0",
    lifespan=lifespan,
    # In produzione, disabilita le docs pubbliche
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# ── CRIT-04 FIX: CORS con whitelist configurabile ─────────────────────────────
# In .env: ALLOWED_ORIGINS=https://tuoapp.vercel.app,capacitor://localhost
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
if _raw_origins:
    allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
else:
    # Fallback per sviluppo locale: permette tutti (NON usare in produzione)
    allowed_origins = ["*"]
    if IS_PRODUCTION:
        raise RuntimeError(
            "❌ ERRORE DI SICUREZZA: ALLOWED_ORIGINS non configurata in produzione. "
            "Aggiungi il dominio frontend nel file .env."
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Token"],
)

# API Routes
app.include_router(auth.router)
app.include_router(workouts.router)
app.include_router(admin.router)
app.include_router(sync.router)
app.include_router(ai.router)
app.include_router(engage.router)

# Serve Admin Dashboard (static files)
admin_path = os.path.join(os.path.dirname(__file__), "..", "admin")
if os.path.exists(admin_path):
    app.mount("/dashboard", StaticFiles(directory=admin_path, html=True), name="admin")

@app.get("/")
def root():
    response = {
        "app": "HyperGym API",
        "version": "1.0.0",
        "admin": "/dashboard"
    }
    # Mostra il link docs solo in development
    if not IS_PRODUCTION:
        response["docs"] = "/docs"
    return response

@app.get("/health")
def health():
    return {"status": "ok"}

