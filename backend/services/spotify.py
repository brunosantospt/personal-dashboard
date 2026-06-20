import base64
import hashlib
import secrets
from urllib.parse import urlencode

import httpx

from ..config import settings

AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
SCOPES = [
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-modify-playback-state",  # controlo: play/pause/next/previous (requer Premium)
]


def make_pkce() -> tuple[str, str]:
    """(code_verifier, code_challenge) — PKCE S256."""
    verifier = secrets.token_urlsafe(64)[:128]
    digest = hashlib.sha256(verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    return verifier, challenge


def authorization_url(state: str, code_challenge: str) -> str:
    params = {
        "client_id": settings.spotify_client_id,
        "response_type": "code",
        "redirect_uri": settings.spotify_redirect_uri,
        "scope": " ".join(SCOPES),
        "code_challenge_method": "S256",
        "code_challenge": code_challenge,
        "state": state,
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def exchange_code(code: str, code_verifier: str) -> dict:
    resp = httpx.post(
        TOKEN_URL,
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.spotify_redirect_uri,
            "client_id": settings.spotify_client_id,
            "code_verifier": code_verifier,
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def refresh(refresh_token: str) -> dict:
    resp = httpx.post(
        TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.spotify_client_id,
        },
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


PLAYER_URL = "https://api.spotify.com/v1/me/player"
CONTROLS = {
    "play": ("PUT", "/play"),
    "pause": ("PUT", "/pause"),
    "next": ("POST", "/next"),
    "previous": ("POST", "/previous"),
}


def control(action: str, access_token: str) -> None:
    """Controlo de playback. 204 = ok; 403 = sem Premium; 404 = sem device ativo."""
    method, path = CONTROLS[action]
    r = httpx.request(
        method,
        PLAYER_URL + path,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    r.raise_for_status()
