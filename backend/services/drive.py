import re
from pathlib import Path

import httpx
from sqlalchemy.orm import Session

from . import tokens

FILES_URL = "https://www.googleapis.com/drive/v3/files"
CACHE_DIR = Path(__file__).resolve().parent.parent.parent / "photos_cache"
CACHE_DIR.mkdir(exist_ok=True)


def _headers(db: Session, account: str) -> dict:
    token = tokens.get_valid_access_token(db, "google", account)
    if not token:
        raise PermissionError("conta Google não ligada")
    return {"Authorization": f"Bearer {token}"}


def list_folders(db: Session, account: str) -> list[dict]:
    """Pastas do Drive da conta (para o admin escolher)."""
    r = httpx.get(
        FILES_URL,
        params={
            "q": "mimeType='application/vnd.google-apps.folder' and trashed=false",
            "fields": "files(id,name)",
            "orderBy": "name",
            "pageSize": 200,
        },
        headers=_headers(db, account),
        timeout=15,
    )
    r.raise_for_status()
    return r.json().get("files", [])


def list_images(db: Session, account: str, folder_id: str) -> list[dict]:
    """Imagens dentro de uma pasta do Drive."""
    r = httpx.get(
        FILES_URL,
        params={
            "q": f"'{folder_id}' in parents and trashed=false and mimeType contains 'image/'",
            "fields": "files(id,name)",
            "orderBy": "name",
            "pageSize": 200,
        },
        headers=_headers(db, account),
        timeout=15,
    )
    r.raise_for_status()
    return r.json().get("files", [])


def fetch_image(db: Session, account: str, file_id: str, folder_id: str) -> tuple[Path, str]:
    """(caminho, media_type) da imagem, com cache local. Valida que é imagem e está na pasta."""
    key = f"{re.sub(r'[^A-Za-z0-9]', '_', account)}_{file_id}"
    cache = CACHE_DIR / key
    ct_file = CACHE_DIR / f"{key}.ct"
    if cache.exists():
        ct = ct_file.read_text() if ct_file.exists() else "application/octet-stream"
        return cache, ct
    headers = _headers(db, account)
    # validação: imagem e dentro da pasta configurada (evita servir ficheiros arbitrários)
    m = httpx.get(
        f"{FILES_URL}/{file_id}",
        params={"fields": "mimeType,parents"},
        headers=headers, timeout=15,
    )
    m.raise_for_status()
    meta = m.json()
    mime = meta.get("mimeType", "")
    if not mime.startswith("image/") or folder_id not in (meta.get("parents") or []):
        raise PermissionError("ficheiro não permitido")
    b = httpx.get(f"{FILES_URL}/{file_id}", params={"alt": "media"}, headers=headers, timeout=30)
    b.raise_for_status()
    cache.write_bytes(b.content)
    ct = b.headers.get("content-type", mime) or mime
    ct_file.write_text(ct)
    return cache, ct
