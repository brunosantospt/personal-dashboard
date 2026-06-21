from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import admin_auth, config_store, tokens

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
