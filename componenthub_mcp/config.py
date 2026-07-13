"""Runtime configuration, all via environment variables (.env is loaded if present)."""

import os

from dotenv import load_dotenv

load_dotenv()


def base_url() -> str:
    """Public base URL of this server, used to build export links."""
    return os.getenv("COMPONENTHUB_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def enabled_providers() -> set[str] | None:
    """Comma-separated list of providers to enable. If set, only these are active.
    Example: ENABLED_PROVIDERS=digikey,mouser"""
    raw = os.getenv("ENABLED_PROVIDERS")
    if not raw:
        return None
    return {name.strip().lower() for name in raw.split(",") if name.strip()}


def disabled_providers() -> set[str]:
    """Comma-separated list of providers to disable.
    Example: DISABLED_PROVIDERS=demo,octopart"""
    raw = os.getenv("DISABLED_PROVIDERS")
    if not raw:
        return set()
    return {name.strip().lower() for name in raw.split(",") if name.strip()}


def digikey_client_id() -> str | None:
    return os.getenv("DIGIKEY_CLIENT_ID")


def digikey_client_secret() -> str | None:
    return os.getenv("DIGIKEY_CLIENT_SECRET")


def mouser_api_key() -> str | None:
    return os.getenv("MOUSER_API_KEY")


def snapmagic_token() -> str | None:
    return os.getenv("SNAPMAGIC_TOKEN")


def nexar_client_id() -> str | None:
    return os.getenv("NEXAR_CLIENT_ID")


def nexar_client_secret() -> str | None:
    return os.getenv("NEXAR_CLIENT_SECRET")


def ultralibrarian_client_id() -> str | None:
    return os.getenv("ULTRA_LIBRARIAN_CLIENT_ID")


def ultralibrarian_client_secret() -> str | None:
    return os.getenv("ULTRA_LIBRARIAN_CLIENT_SECRET")


def ultralibrarian_api_base() -> str:
    return os.getenv("ULTRA_LIBRARIAN_API_BASE", "https://api.ultralibrarian.com").rstrip("/")


def ultralibrarian_token_url() -> str:
    return os.getenv(
        "ULTRA_LIBRARIAN_TOKEN_URL", "https://identity.ultralibrarian.com/connect/token"
    )
