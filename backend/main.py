from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import admin, auth, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Cria as tabelas SQLite no arranque. Migrations formais ficam para depois, se preciso.
    init_db()
    yield


app = FastAPI(title="Personal Dashboard API", version="0.1.0", lifespan=lifespan)

# CORS: só os domínios do dashboard e do admin (ver config). Importa na Fase 5.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(ws.router)


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "service": "personal-dashboard", "version": app.version}


@app.get("/api/dashboard", tags=["dashboard"])
def dashboard_data():
    # Agrega calendário + tasks + spotify + meteo. Ligado na Fase 4.
    raise HTTPException(status.HTTP_501_NOT_IMPLEMENTED, "dados do dashboard — Fase 4")
