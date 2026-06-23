import secrets
import time
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..config import settings

ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)

# Rate limit do login: por IP, máx. tentativas numa janela. In-memory chega (single-instance).
_LOGIN_ATTEMPTS: dict[str, list[float]] = {}
MAX_ATTEMPTS = 10
WINDOW_SECONDS = 60


def verify_password(password: str) -> bool:
    # Opção 1: password em texto simples (ADMIN_PASSWORD) — evita problemas de $ no hash.
    if settings.admin_password:
        return secrets.compare_digest(password, settings.admin_password)
    # Opção 2: hash bcrypt (ADMIN_PASSWORD_HASH). Hash inválido -> False (não rebenta).
    if not settings.admin_password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode(), settings.admin_password_hash.encode())
    except (ValueError, TypeError):
        return False


def create_token() -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "admin",
        "iat": now,
        "exp": now + timedelta(hours=settings.admin_session_hours),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def rate_limit(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    attempts = [t for t in _LOGIN_ATTEMPTS.get(ip, []) if now - t < WINDOW_SECONDS]
    if len(attempts) >= MAX_ATTEMPTS:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Demasiadas tentativas. Tenta daqui a pouco."
        )
    attempts.append(now)
    _LOGIN_ATTEMPTS[ip] = attempts


def require_admin(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> None:
    """Dependency que protege rotas: exige um JWT de admin válido."""
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Não autenticado")
    try:
        jwt.decode(creds.credentials, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sessão inválida ou expirada")
