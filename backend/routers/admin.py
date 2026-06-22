import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import admin_auth, config_store, drive, tokens

router = APIRouter(prefix="/api/admin", tags=["admin"])
protected = [Depends(admin_auth.require_admin)]


class LoginBody(BaseModel):
    password: str


@router.post("/login")
def login(body: LoginBody, request: Request):
    admin_auth.rate_limit(request)
    if not admin_auth.verify_password(body.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Password incorreta")
    return {"token": admin_auth.create_token()}


@router.post("/logout")
def logout():
    # JWT é stateless: o cliente descarta o token. Endpoint existe por simetria.
    return {"status": "ok"}


@router.get("/status", dependencies=protected)
def integrations_status(db: Session = Depends(get_db)):
    """Estado de todas as integrações (autenticadas / com erro)."""
    return tokens.status(db)


@router.get("/config", dependencies=protected)
def get_config(db: Session = Depends(get_db)):
    return config_store.get_config(db)


@router.put("/appearance", dependencies=protected)
def put_appearance(body: dict = Body(...), db: Session = Depends(get_db)):
    return config_store.update_section(db, "appearance", body)


@router.put("/layout", dependencies=protected)
def put_layout(body: dict = Body(...), db: Session = Depends(get_db)):
    return config_store.update_section(db, "layout", body)


@router.put("/widgets", dependencies=protected)
def put_widgets(body: dict = Body(...), db: Session = Depends(get_db)):
    return config_store.update_section(db, "widgets", body)


@router.get("/drive/folders", dependencies=protected)
def drive_folders(account: str, db: Session = Depends(get_db)):
    """Pastas do Drive da conta — para escolher a fonte do carousel."""
    try:
        return {"folders": drive.list_folders(db, account)}
    except PermissionError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "conta não ligada")
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (401, 403):
            raise HTTPException(403, "Sem acesso ao Drive — re-autentica a conta Google")
        raise HTTPException(502, f"Erro Drive ({e.response.status_code})")
