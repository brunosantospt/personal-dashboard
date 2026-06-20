from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import google, spotify, tokens
from ..services.oauth_state import new_state, pop_state

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    """Que integrações estão autenticadas e quando expiram."""
    return tokens.status(db)


# ---- Google (Calendar + Tasks) ----
@router.get("/google")
def google_start():
    state = new_state()
    return RedirectResponse(google.authorization_url(state), status_code=307)


@router.get("/google/callback")
def google_callback(
    code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)
):
    valid, _ = pop_state(state)
    if not valid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "state inválido ou expirado")
    tokens.save_token(db, "google", google.exchange_code(code))
    return {"provider": "google", "status": "connected"}


# ---- Spotify (Authorization Code + PKCE) ----
@router.get("/spotify")
def spotify_start():
    verifier, challenge = spotify.make_pkce()
    state = new_state(verifier)
    return RedirectResponse(
        spotify.authorization_url(state, challenge), status_code=307
    )


@router.get("/spotify/callback")
def spotify_callback(
    code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)
):
    valid, verifier = pop_state(state)
    if not valid or verifier is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "state inválido ou expirado")
    tokens.save_token(db, "spotify", spotify.exchange_code(code, verifier))
    return {"provider": "spotify", "status": "connected"}
