from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db, init_db
from .routers import admin, auth, ws
from .services import config_store, data, spotify, tokens

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"
ADMIN_DIST = ROOT_DIR / "admin" / "dist"
PHOTOS_DIR = ROOT_DIR / "photos"
PHOTOS_DIR.mkdir(exist_ok=True)
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


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


@app.get("/api/config", tags=["dashboard"])
def public_config(db: Session = Depends(get_db)):
    # Config de apresentação que a Dashboard View consome (sem auth).
    return config_store.get_config(db)


@app.get("/api/dashboard", tags=["dashboard"])
def dashboard_data(db: Session = Depends(get_db)):
    # Agrega calendário + tasks + spotify + meteo. Push em tempo real (WS) vem na Fase 4.
    return data.dashboard(db)


@app.get("/api/photos", tags=["photos"])
def list_photos():
    photos = sorted(
        f"/photos/{p.name}"
        for p in PHOTOS_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS
    )
    return {"photos": photos}


@app.post("/api/spotify/{action}", tags=["spotify"])
def spotify_control(action: str, db: Session = Depends(get_db)):
    if action not in spotify.CONTROLS:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "ação inválida")
    token = tokens.get_valid_access_token(db, "spotify")
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Spotify não autenticado")
    try:
        spotify.control(action, token)
    except httpx.HTTPStatusError as e:
        code = e.response.status_code
        if code == 403:
            raise HTTPException(403, "Controlo requer Spotify Premium")
        if code == 404:
            raise HTTPException(404, "Sem dispositivo Spotify ativo")
        raise HTTPException(502, f"Erro Spotify ({code})")
    return {"action": action, "status": "ok"}


# Pasta de fotos (carousel) servida estaticamente. Antes do mount da raiz.
app.mount("/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")

# Admin Panel (build Vite). Só montado se já existir build (admin/dist).
if ADMIN_DIST.is_dir():
    app.mount("/admin", StaticFiles(directory=ADMIN_DIST, html=True), name="admin")

# A Dashboard View (frontend estático) é servida na raiz. Registar POR ÚLTIMO para
# não sombrear as rotas /api e /ws.
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
