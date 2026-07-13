"""Ultra Librarian connector — symbols, footprints, and STEP models.

Ultra Librarian's REST API is partner-gated (developers.ultralibrarian.com) and
uses OAuth2 client credentials. Endpoint paths follow their published API; if
your partner account uses a different base or identity server, override with
ULTRA_LIBRARIAN_API_BASE / ULTRA_LIBRARIAN_TOKEN_URL.

Capabilities: search, cad_models, datasheet.
Enable with ULTRA_LIBRARIAN_CLIENT_ID / ULTRA_LIBRARIAN_CLIENT_SECRET.
"""

import time

import httpx

from .. import config
from ..models import CadAsset, Capability, ComponentResult, Offer, SearchQuery
from .base import Provider, ProviderError


class UltraLibrarianProvider(Provider):
    name = "ultralibrarian"
    display_name = "Ultra Librarian"
    capabilities = frozenset({Capability.SEARCH, Capability.CAD_MODELS, Capability.DATASHEET})

    def __init__(self) -> None:
        self._token: str | None = None
        self._token_expiry: float = 0.0

    def is_configured(self) -> bool:
        return bool(config.ultralibrarian_client_id() and config.ultralibrarian_client_secret())

    def missing_config(self) -> str | None:
        if self.is_configured():
            return None
        return (
            "Set ULTRA_LIBRARIAN_CLIENT_ID and ULTRA_LIBRARIAN_CLIENT_SECRET "
            "(developers.ultralibrarian.com)"
        )

    async def _get_token(self, client: httpx.AsyncClient) -> str:
        if self._token and time.monotonic() < self._token_expiry - 60:
            return self._token
        resp = await client.post(
            config.ultralibrarian_token_url(),
            data={
                "grant_type": "client_credentials",
                "client_id": config.ultralibrarian_client_id(),
                "client_secret": config.ultralibrarian_client_secret(),
            },
        )
        if resp.status_code != 200:
            raise ProviderError(f"ultralibrarian: token request failed ({resp.status_code})")
        data = resp.json()
        self._token = data["access_token"]
        self._token_expiry = time.monotonic() + int(data.get("expires_in", 3600))
        return self._token

    async def _get(self, path: str, params: dict) -> dict:
        async with httpx.AsyncClient(timeout=20) as client:
            token = await self._get_token(client)
            resp = await client.get(
                f"{config.ultralibrarian_api_base()}{path}",
                params=params,
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code != 200:
                raise ProviderError(
                    f"ultralibrarian: request failed ({resp.status_code}): {resp.text[:200]}"
                )
            return resp.json()

    def _map_part(self, p: dict) -> ComponentResult:
        mpn = p.get("partNumber") or p.get("PartNumber") or ""
        manufacturer = p.get("manufacturer") or p.get("Manufacturer")
        if isinstance(manufacturer, dict):
            manufacturer = manufacturer.get("name") or manufacturer.get("Name")
        page = (
            p.get("detailsUrl")
            or p.get("DetailsUrl")
            or f"https://app.ultralibrarian.com/search?queryText={mpn}"
        )
        return ComponentResult(
            mpn=mpn,
            manufacturer=manufacturer,
            description=p.get("description") or p.get("Description"),
            package=p.get("package") or p.get("Package"),
            datasheet_url=p.get("datasheetUrl") or p.get("DatasheetUrl"),
            offers=[Offer(provider=self.name, part_id=mpn, product_url=page)],
        )

    async def _search_raw(self, keyword: str, limit: int) -> list[dict]:
        data = await self._get(
            "/v1/parts/search", {"queryText": keyword, "pageRecords": limit, "startRecord": 0}
        )
        return data.get("parts") or data.get("Parts") or data.get("results") or []

    async def search(self, query: SearchQuery) -> list[ComponentResult]:
        parts = await self._search_raw(query.keyword, query.max_results)
        results = []
        for p in parts:
            r = self._map_part(p)
            if query.manufacturer and (
                not r.manufacturer or query.manufacturer.lower() not in r.manufacturer.lower()
            ):
                continue
            results.append(r)
        return results[: query.max_results]

    async def _find_part(self, part_id: str) -> dict:
        for p in await self._search_raw(part_id, 10):
            if (p.get("partNumber") or p.get("PartNumber") or "").lower() == part_id.lower():
                return p
        raise ProviderError(f"ultralibrarian: part {part_id!r} not found")

    async def fetch_models(self, part_id: str) -> list[CadAsset]:
        p = await self._find_part(part_id)
        page = (
            p.get("detailsUrl")
            or p.get("DetailsUrl")
            or f"https://app.ultralibrarian.com/search?queryText={part_id}"
        )
        assets = []
        flags = {
            "symbol": p.get("hasSymbol", p.get("HasSymbol")),
            "footprint": p.get("hasFootprint", p.get("HasFootprint")),
            "step": p.get("has3dModel", p.get("Has3DModel")),
        }
        for kind, available in flags.items():
            if available:
                assets.append(
                    CadAsset(kind=kind, format="universal", filename=f"{part_id}-{kind}", url=page)
                )
        if not assets:
            # UL indexes CAD content; if flags are absent, still point at the part page
            assets.append(CadAsset(kind="library", format="universal", filename=part_id, url=page))
        return assets

    async def fetch_datasheet(self, part_id: str) -> str | None:
        return self._map_part(await self._find_part(part_id)).datasheet_url
