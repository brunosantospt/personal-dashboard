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


def save_token(db: Session, provider: str, token: dict, account: str = "") -> OAuthToken:
    """Guarda/atualiza tokens (encriptados). Chave: (provider, account)."""
    row = db.scalar(
        select(OAuthToken).where(
            OAuthToken.provider == provider, OAuthToken.account == account
        )
    )
    if row is None:
        row = OAuthToken(provider=provider, account=account)
        db.add(row)
    row.access_token = encrypt(token["access_token"])
    # Em refresh, alguns providers não devolvem novo refresh_token: mantém o atual.
    if token.get("refresh_token"):
        row.refresh_token = encrypt(token["refresh_token"])
    row.expires_at = _utcnow() + timedelta(seconds=int(token.get("expires_in", 3600)))
    db.commit()
    db.refresh(row)
    return row


def accounts(db: Session, provider: str) -> list[OAuthToken]:
    return list(
        db.scalars(
            select(OAuthToken)
            .where(OAuthToken.provider == provider)
            .order_by(OAuthToken.account)
        )
    )


def get_valid_access_token(
    db: Session, provider: str, account: str = ""
) -> str | None:
    """Access token desencriptado da conta, renovado automaticamente se a expirar."""
    row = db.scalar(
        select(OAuthToken).where(
            OAuthToken.provider == provider, OAuthToken.account == account
        )
    )
    if row is None:
        return None
    if _aware(row.expires_at) - EXPIRY_BUFFER > _utcnow():
        return decrypt(row.access_token)
    new = _REFRESH[provider](decrypt(row.refresh_token))
    row = save_token(db, provider, new, account)
    return decrypt(row.access_token)


def status(db: Session) -> dict:
    google_accounts = [
        {"account": r.account, "expires_at": _aware(r.expires_at).isoformat()}
        for r in accounts(db, "google")
    ]
    spotify_rows = accounts(db, "spotify")
    return {
        "google": {
            "authenticated": bool(google_accounts),
            "accounts": google_accounts,
        },
        "spotify": {
            "authenticated": bool(spotify_rows),
            "expires_at": _aware(spotify_rows[0].expires_at).isoformat()
            if spotify_rows
            else None,
        },
    }
