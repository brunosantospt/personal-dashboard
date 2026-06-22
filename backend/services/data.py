import datetime as dt

import httpx
from sqlalchemy.orm import Session

from ..config import settings
from . import config_store, tokens

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
CALENDAR_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
TASKS_URL = "https://www.googleapis.com/tasks/v1/lists/@default/tasks"
SPOTIFY_NOW_URL = "https://api.spotify.com/v1/me/player/currently-playing"


def weather(cfg: dict) -> dict:
    r = httpx.get(
        WEATHER_URL,
        params={
            "latitude": cfg.get("lat", settings.location_lat),
            "longitude": cfg.get("lon", settings.location_lon),
            "current": "temperature_2m,weather_code,wind_speed_10m",
            "timezone": "auto",
        },
        timeout=10,
    )
    r.raise_for_status()
    c = r.json()["current"]
    return {
        "temperature": c["temperature_2m"],
        "weather_code": c["weather_code"],
        "wind_speed": c["wind_speed_10m"],
    }


def _sort_key(start: str | None) -> float:
    if not start:
        return float("inf")
    try:
        d = dt.datetime.fromisoformat(start.replace("Z", "+00:00"))
    except ValueError:
        return float("inf")
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.timestamp()


def _google_accounts(db: Session) -> list[str]:
    return [a.account for a in tokens.accounts(db, "google")]


def _label(account: str) -> str:
    # Rótulo configurado (.env) ou, na falta, a parte antes do @.
    return settings.account_labels.get(account) or (account.split("@")[0] if account else "")


def _hidden(summary: str | None, patterns: list[str]) -> bool:
    s = (summary or "").lower()
    return any(pat.lower() in s for pat in patterns)


def calendar(db: Session, cfg: dict) -> list[dict]:
    """Eventos das próximas, juntos de todas as contas Google e ordenados por hora."""
    now = dt.datetime.now(dt.timezone.utc)
    horizon = now + dt.timedelta(days=cfg.get("horizon_days", settings.calendar_horizon_days))
    hide = cfg.get("hide", settings.calendar_hide)
    out: list[dict] = []
    for account in _google_accounts(db):
        token = tokens.get_valid_access_token(db, "google", account)
        if not token:
            continue
        try:
            r = httpx.get(
                CALENDAR_URL,
                params={
                    "maxResults": 5,
                    "timeMin": now.isoformat(),
                    "timeMax": horizon.isoformat(),
                    "singleEvents": "true",
                    "orderBy": "startTime",
                },
                headers={"Authorization": f"Bearer {token}"},
                timeout=10,
            )
            r.raise_for_status()
        except Exception:
            continue  # uma conta a falhar não derruba a outra
        for e in r.json().get("items", []):
            if _hidden(e.get("summary"), hide):
                continue
            start = e.get("start", {})
            out.append({
                "summary": e.get("summary"),
                "start": start.get("dateTime") or start.get("date"),
                "account": account,
                "label": _label(account),
            })
    out.sort(key=lambda e: _sort_key(e["start"]))
    return out[:6]


def tasks_pending(db: Session, cfg: dict) -> list[dict]:
    """Tarefas pendentes + concluídas nas últimas N horas (estas riscadas, no fim)."""
    window_h = cfg.get("done_window_hours", 2)
    completed_min = (
        dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=window_h)
    ).isoformat()
    pending: list[dict] = []
    done: list[dict] = []
    for account in _google_accounts(db):
        token = tokens.get_valid_access_token(db, "google", account)
        if not token:
            continue
        headers = {"Authorization": f"Bearer {token}"}
        label = _label(account)
        # pendentes
        try:
            r = httpx.get(
                TASKS_URL,
                params={"maxResults": 20, "showCompleted": "false"},
                headers=headers, timeout=10,
            )
            r.raise_for_status()
            for t in r.json().get("items", []):
                if t.get("status") == "completed":
                    continue
                pending.append({
                    "id": t.get("id"), "title": t.get("title"), "due": t.get("due"),
                    "account": account, "label": label, "done": False,
                })
        except Exception:
            pass
        # concluídas recentemente (janela)
        try:
            r = httpx.get(
                TASKS_URL,
                params={
                    "maxResults": 20, "showCompleted": "true",
                    "showHidden": "true", "completedMin": completed_min,
                },
                headers=headers, timeout=10,
            )
            r.raise_for_status()
            for t in r.json().get("items", []):
                if t.get("status") != "completed":
                    continue
                done.append({
                    "id": t.get("id"), "title": t.get("title"), "due": t.get("due"),
                    "account": account, "label": label, "done": True,
                    "completed": t.get("completed"),
                })
        except Exception:
            pass
    pending.sort(key=lambda t: _sort_key(t.get("due")))
    done.sort(key=lambda t: _sort_key(t.get("completed")), reverse=True)  # recentes primeiro
    return pending + done  # pendentes em cima, concluídas no fim


def complete_task(db: Session, account: str, task_id: str) -> None:
    """Marca uma tarefa como concluída no Google Tasks (lista @default da conta)."""
    token = tokens.get_valid_access_token(db, "google", account)
    if not token:
        raise PermissionError("conta Google não ligada")
    r = httpx.patch(
        f"{TASKS_URL}/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "completed"},
        timeout=10,
    )
    r.raise_for_status()


def spotify_now(db: Session) -> dict | None:
    token = tokens.get_valid_access_token(db, "spotify")
    if not token:
        return None
    r = httpx.get(SPOTIFY_NOW_URL, headers={"Authorization": f"Bearer {token}"}, timeout=10)
    if r.status_code == 204 or not r.content:
        return None
    r.raise_for_status()
    d = r.json()
    item = d.get("item") or {}
    if not item:
        return None
    imgs = item.get("album", {}).get("images", [])
    return {
        "name": item.get("name"),
        "artists": ", ".join(a["name"] for a in item.get("artists", [])),
        "image": imgs[0]["url"] if imgs else None,
        "progress_ms": d.get("progress_ms"),
        "duration_ms": item.get("duration_ms"),
        "is_playing": d.get("is_playing"),
    }


def dashboard(db: Session) -> dict:
    """Agrega todas as fontes. Resiliência por widget: se uma falha, as outras seguem.

    Widgets desativados na config não são chamados (poupa chamadas às APIs).
    """
    w = config_store.get_config(db)["widgets"]
    sources = {
        "weather": (lambda: weather(w["weather"]), None),
        "calendar": (lambda: calendar(db, w["calendar"]), []),
        "tasks": (lambda: tasks_pending(db, w["tasks"]), []),
        "spotify": (lambda: spotify_now(db), None),
    }
    out: dict = {}
    errors: dict = {}
    for key, (fn, default) in sources.items():
        if not w.get(key, {}).get("enabled", True):
            out[key] = default  # widget desativado
            continue
        try:
            out[key] = fn()
        except Exception as e:  # falha de uma API não derruba o resto
            out[key] = default
            errors[key] = str(e)
    # Contas Google ligadas (autoritativo) — o frontend usa para o flip Work/Pessoal,
    # mesmo que uma conta não tenha itens visíveis agora.
    out["accounts"] = [{"account": a, "label": _label(a)} for a in _google_accounts(db)]
    out["errors"] = errors
    out["server_time"] = dt.datetime.now(dt.timezone.utc).isoformat()
    return out
