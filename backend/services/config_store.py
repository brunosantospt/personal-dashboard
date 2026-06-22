import copy

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Setting

CONFIG_KEY = "dashboard_config"
SECTIONS = ("appearance", "layout", "widgets")


def _defaults() -> dict:
    """Config inicial. Os valores arrancam do .env e são sobreponíveis pelo admin."""
    return {
        "appearance": {"theme": "dark", "accent": "#5eead4", "font_scale": 1.0},
        "layout": {
            # grelha fixa 12 colunas x 12 linhas (canvas WYSIWYG no admin)
            "cols": 12,
            "rows": 12,
            # posição/tamanho de cada widget na grelha (drag/resize no admin)
            "items": {
                "weather": {"x": 0, "y": 0, "w": 4, "h": 4},
                "photos": {"x": 0, "y": 4, "w": 4, "h": 8},
                "calendar": {"x": 4, "y": 0, "w": 4, "h": 12},
                "tasks": {"x": 8, "y": 0, "w": 4, "h": 12},
            },
        },
        "widgets": {
            "weather": {"enabled": True, "lat": settings.location_lat, "lon": settings.location_lon},
            "calendar": {
                "enabled": True,
                "horizon_days": settings.calendar_horizon_days,
                "hide": list(settings.calendar_hide),
            },
            "tasks": {"enabled": True, "done_window_hours": 2},
            "photos": {
                "enabled": True,
                "interval_seconds": 8,
                # se drive.folder_id estiver definido, o carousel usa o Drive; senão a pasta local
                "drive": {"account": "", "folder_id": "", "folder_name": ""},
            },
            "spotify": {"enabled": True},
        },
    }


def _deep_merge(base: dict, over: dict | None) -> dict:
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def get_config(db: Session) -> dict:
    row = db.scalar(select(Setting).where(Setting.key == CONFIG_KEY))
    return _deep_merge(_defaults(), row.value if row else {})


def update_section(db: Session, section: str, value: dict) -> dict:
    if section not in SECTIONS:
        raise ValueError(f"secção inválida: {section}")
    row = db.scalar(select(Setting).where(Setting.key == CONFIG_KEY))
    stored = copy.deepcopy(row.value) if row else {}
    stored[section] = _deep_merge(stored.get(section, {}), value)
    if row is None:
        db.add(Setting(key=CONFIG_KEY, value=stored))
    else:
        row.value = stored  # reatribuir marca o objeto como sujo (JSON)
    db.commit()
    return get_config(db)
