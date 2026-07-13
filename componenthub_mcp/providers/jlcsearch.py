"""JLCSearch connector — keyless search via jlcsearch.tscircuit.com.

Uses the public JLCSearch API (no authentication required) to search JLCPCB
in-stock components. Provides search, details, pricing, availability, and CAD
models. Datasheets are not available through this API.

part_id is the LCSC product code (e.g. C15742).
"""

import json
from typing import Any

import httpx

from ..models import (
    CadAsset,
    Capability,
    ComponentDetails,
    ComponentResult,
    Offer,
    PriceBreak,
    SearchQuery,
)
from .base import Provider, ProviderError

_JLCSEARCH_BASE = "https://jlcsearch.tscircuit.com"
_EASYEDA_VERSION = "6.4.19.5"
_HEADERS = {"User-Agent": "Mozilla/5.0 (ComponentHub MCP)"}

_CAPABILITIES = frozenset(
    {Capability.SEARCH, Capability.DETAILS, Capability.PRICING, Capability.AVAILABILITY, Capability.CAD_MODELS}
)


def _to_lcsc_number(part_id: str) -> int:
    """Convert C-number (e.g. C15742) to integer LCSC code (15742)."""
    code = part_id.strip().upper()
    if code.startswith("C"):
        code = code[1:]
    try:
        return int(code)
    except ValueError:
        raise ProviderError(f"jlcsearch: invalid LCSC code {part_id!r} (expected C<number>)")


def _to_c_number(lcsc: int | str) -> str:
    """Convert integer LCSC code to C-number string."""
    return f"C{lcsc}"


def _product_url(number: str) -> str:
    return f"https://www.lcsc.com/product-detail/{number}.html"


def _parse_price_breaks(raw: str | None) -> list[PriceBreak]:
    """Parse the JSON price breaks string from JLCSearch full=true response."""
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return []
    breaks = []
    for tier in data:
        qty = tier.get("qFrom")
        price = tier.get("price")
        if qty is not None and price is not None:
            try:
                breaks.append(PriceBreak(quantity=int(qty), unit_price=float(price)))
            except (TypeError, ValueError):
                continue
    return breaks


class JlcsearchProvider(Provider):
    name = "lcsc"
    display_name = "JLCPCB (via JLCSearch)"
    capabilities = _CAPABILITIES

    def is_configured(self) -> bool:
        return True  # no authentication required

    async def _get(self, path: str, params: dict | None = None) -> Any:
        async with httpx.AsyncClient(timeout=20, headers=_HEADERS) as client:
            resp = await client.get(f"{_JLCSEARCH_BASE}{path}", params=params)
            if resp.status_code != 200:
                raise ProviderError(f"jlcsearch: request failed ({resp.status_code}): {resp.text[:200]}")
            return resp.json()

    def _map_component(self, comp: dict) -> ComponentResult | None:
        lcsc = comp.get("lcsc")
        if not lcsc:
            return None
        number = _to_c_number(lcsc)
        return ComponentResult(
            mpn=comp.get("mfr") or number,
            description=comp.get("description"),
            category=comp.get("category"),
            package=comp.get("package"),
            offers=[
                Offer(
                    provider=self.name,
                    part_id=number,
                    product_url=_product_url(number),
                    stock=comp.get("stock"),
                    price_breaks=_parse_price_breaks(comp.get("price")),
                )
            ],
        )

    async def search(self, query: SearchQuery) -> list[ComponentResult]:
        params: dict[str, Any] = {"q": query.keyword, "limit": query.max_results}
        data = await self._get("/api/search", params)
        results = []
        for comp in data.get("components") or []:
            mapped = self._map_component(comp)
            if mapped is None:
                continue
            if query.manufacturer and (
                not mapped.manufacturer or query.manufacturer.lower() not in mapped.manufacturer.lower()
            ):
                continue
            if query.in_stock_only and (comp.get("stock") or 0) <= 0:
                continue
            results.append(mapped)
        return results

    async def fetch_details(self, part_id: str) -> ComponentDetails:
        lcsc_num = _to_lcsc_number(part_id)
        params: dict[str, Any] = {"search": str(lcsc_num), "full": "true"}
        data = await self._get("/components/list.json", params)
        components = data.get("components") or []
        target = _to_c_number(lcsc_num).upper()
        for comp in components:
            if _to_c_number(comp.get("lcsc", 0)).upper() == target:
                mapped = self._map_component(comp)
                if mapped is None:
                    break
                return ComponentDetails(
                    **mapped.model_dump(),
                    specifications={
                        "category": comp.get("category") or "",
                        "subcategory": comp.get("subcategory") or "",
                        "is_basic": str(comp.get("is_basic", False)),
                        "is_preferred": str(comp.get("is_preferred", False)),
                    },
                    cad_assets=await self.fetch_models(part_id),
                )
        raise ProviderError(f"jlcsearch: part {part_id!r} not found")

    async def fetch_pricing(self, part_id: str) -> Offer:
        details = await self.fetch_details(part_id)
        return details.offers[0]

    async def fetch_models(self, part_id: str) -> list[CadAsset]:
        return [
            CadAsset(
                kind="library",
                format="easyeda",
                filename=f"{part_id}-easyeda-component.json",
                url=f"https://easyeda.com/api/products/{part_id}/components?version={_EASYEDA_VERSION}",
            ),
            CadAsset(
                kind="symbol",
                format="easyeda",
                filename=f"{part_id}-preview.json",
                url=f"https://easyeda.com/api/products/{part_id}/svgs",
            ),
        ]
