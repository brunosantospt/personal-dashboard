from functools import lru_cache

from cryptography.fernet import Fernet

from .config import settings


@lru_cache
def _fernet() -> Fernet:
    # Lazy: só valida a SECRET_KEY quando há mesmo algo para encriptar.
    return Fernet(settings.secret_key.encode())


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    return _fernet().decrypt(ciphertext.encode()).decode()
