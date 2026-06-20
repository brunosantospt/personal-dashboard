from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Setting(Base):
    """Configuração global: tema, layout, localização, params de widgets."""

    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String, unique=True, index=True)
    value: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=_utcnow, onupdate=_utcnow
    )


class OAuthToken(Base):
    """Tokens OAuth — encriptados (Fernet). Nunca expostos ao frontend."""

    __tablename__ = "oauth_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String, unique=True, index=True)  # google | spotify
    access_token: Mapped[str] = mapped_column(Text)
    refresh_token: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class WidgetConfig(Base):
    """Widgets ativos e a sua configuração. Novos widgets sem alterar o schema."""

    __tablename__ = "widget_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    widget_type: Mapped[str] = mapped_column(String, index=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    config_json: Mapped[dict] = mapped_column(JSON, default=dict)


class Cache(Base):
    """Cache local dos dados das APIs — reduz chamadas e dá fallback offline."""

    __tablename__ = "cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String, unique=True, index=True)
    data: Mapped[dict] = mapped_column(JSON)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow)
    ttl_seconds: Mapped[int] = mapped_column(Integer, default=0)
