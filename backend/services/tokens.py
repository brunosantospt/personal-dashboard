from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..crypto import decrypt, encrypt
from ..models import OAuthToken
from . import google, spotify

_REFRESH = {"google": google.refresh, "spotify": spotify.refresh}
EXPIRY_BUFFER = timedelta(seconds=60)  # renova um pouco antes de expirar


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    # SQLite devolve datetime naive; assumimos UTC.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def save_token(db: Session, provider: str, token: dict) -> OAuthToken:
    """Guarda/atualiza tokens (encriptados) a partir de uma resposta OAuth."""
    row = db.scalar(select(OAuthToken).where(OAuthToken.provider == provider))
    if row is None:
        row = OAuthToken(provider=provider)
        db.add(row)
    row.access_token = encrypt(token["access_token"])
    # Em refresh, alguns providers não devolvem novo refresh_token: mantém o atual.
    if token.get("refresh_token"):
        row.refresh_token = encrypt(token["refresh_token"])
    row.expires_at = _utcnow() + timedelta(seconds=int(token.get("expires_in", 3600)))
    db.commit()
    db.refresh(row)
    return row


def get_valid_access_token(db: Session, provider: str) -> str | None:
    """Access token desencriptado, renovado automaticamente se estiver a expirar."""
    row = db.scalar(select(OAuthToken).where(OAuthToken.provider == provider))
    if row is None:
        return None
    if _aware(row.expires_at) - EXPIRY_BUFFER > _utcnow():
        return decrypt(row.access_token)
    new = _REFRESH[provider](decrypt(row.refresh_token))
    row = save_token(db, provider, new)
    return decrypt(row.access_token)


def status(db: Session) -> dict:
    out = {}
    for provider in ("google", "spotify"):
        row = db.scalar(select(OAuthToken).where(OAuthToken.provider == provider))
        out[provider] = {
            "authenticated": row is not None,
            "expires_at": _aware(row.expires_at).isoformat() if row else None,
        }
    return out
