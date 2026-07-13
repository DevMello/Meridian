"""Provider registry. Add a new connector by appending it to _PROVIDERS."""

from .. import config
from .base import Provider, ProviderError
from .demo import DemoProvider
from .digikey import DigiKeyProvider
from .jlcsearch import JlcsearchProvider
from .mouser import MouserProvider
from .octopart import OctopartProvider
from .snapmagic import SnapMagicProvider
from .ultralibrarian import UltraLibrarianProvider

_ALL_PROVIDERS: list[Provider] = [
    DemoProvider(),
    DigiKeyProvider(),
    MouserProvider(),
    JlcsearchProvider(),
    OctopartProvider(),
    SnapMagicProvider(),
    UltraLibrarianProvider(),
]


def _filter_providers() -> dict[str, Provider]:
    """Filter providers based on ENABLED_PROVIDERS / DISABLED_PROVIDERS env vars.

    ENABLED_PROVIDERS (allowlist): if set, only these providers are active.
    DISABLED_PROVIDERS (denylist): if set, these providers are excluded.
    If both are set, ENABLED_PROVIDERS takes precedence.
    """
    enabled = config.enabled_providers()
    disabled = config.disabled_providers()

    result: dict[str, Provider] = {}
    for p in _ALL_PROVIDERS:
        if enabled is not None:
            if p.name in enabled:
                result[p.name] = p
        elif p.name not in disabled:
            result[p.name] = p
    return result


_PROVIDERS = _filter_providers()


def all_providers() -> dict[str, Provider]:
    return _PROVIDERS


def get_provider(name: str) -> Provider:
    provider = _PROVIDERS.get(name.lower())
    if provider is None:
        raise ProviderError(
            f"Unknown provider {name!r}. Available: {', '.join(sorted(_PROVIDERS))}"
        )
    return provider


__all__ = ["Provider", "ProviderError", "all_providers", "get_provider"]
