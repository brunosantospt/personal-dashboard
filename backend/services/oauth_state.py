import secrets
import time

# state -> (code_verifier | None, created_at). Guarda o state CSRF e, no Spotify,
# o code_verifier do PKCE entre o /auth e o /callback. In-memory chega: o fluxo
# dura segundos e a app é single-instance.
_STORE: dict[str, tuple[str | None, float]] = {}
STATE_TTL = 600  # 10 min


def new_state(code_verifier: str | None = None) -> str:
    _purge()
    state = secrets.token_urlsafe(32)
    _STORE[state] = (code_verifier, time.time())
    return state


def pop_state(state: str) -> tuple[bool, str | None]:
    """Devolve (válido, code_verifier) e consome o state (uso único)."""
    _purge()
    entry = _STORE.pop(state, None)
    if entry is None:
        return False, None
    return True, entry[0]


def _purge() -> None:
    now = time.time()
    for s in [s for s, (_, t) in _STORE.items() if now - t > STATE_TTL]:
        _STORE.pop(s, None)
