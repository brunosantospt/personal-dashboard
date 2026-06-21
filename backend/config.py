from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração lida do .env (ver .env.example). Defaults servem para dev local."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # App
    database_url: str = "sqlite:///./backend/dashboard.db"
    secret_key: str = "dev-insecure-change-me"  # chave Fernet (encripta tokens OAuth)
    admin_password_hash: str = ""               # hash bcrypt da password do admin

    # Localização default para a meteorologia (Porto)
    location_lat: float = 41.1579
    location_lon: float = -8.6291

    # Rótulos das contas Google no dashboard (email -> nome). JSON no .env.
    account_labels: dict[str, str] = {}

    # Padrões de título a esconder nos próximos eventos (substring, case-insensitive).
    calendar_hide: list[str] = []

    # Só mostrar eventos dentro destes N dias (evita aniversários recorrentes a anos de distância).
    calendar_horizon_days: int = 30

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"

    # Spotify OAuth
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    spotify_redirect_uri: str = "http://localhost:8000/api/auth/spotify/callback"

    # CORS — só os domínios do dashboard e do admin
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8000"]


settings = Settings()
