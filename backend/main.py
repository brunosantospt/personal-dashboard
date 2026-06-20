from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db, init_db
from .routers import admin, auth, ws
from .services import data

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


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
def dashboard_data(db: Session = Depends(get_db)):
    # Agrega calendário + tasks + spotify + meteo. Push em tempo real (WS) vem na Fase 4.
    return data.dashboard(db)


# A Dashboard View (frontend estático) é servida na raiz. Registar POR ÚLTIMO para
# não sombrear as rotas /api e /ws.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
