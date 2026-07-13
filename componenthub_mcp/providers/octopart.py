"""Octopart connector — via the official Nexar GraphQL API (Octopart's platform).

Octopart is an aggregator: one search returns offers from many distributors, so
each result carries multiple offers with the `seller` field set.

Capabilities: search, details, pricing, availability, datasheet.
Enable with NEXAR_CLIENT_ID / NEXAR_CLIENT_SECRET (nexar.com, Supply scope).
"""

import time

import httpx

from .. import config
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

_TOKEN_URL = "https://identity.nexar.com/connect/token"
_GRAPHQL_URL = "https://api.nexar.com/graphql"
_MAX_SELLERS = 5

_PART_FIELDS = """
  mpn
  manufacturer { name }
  shortDescription
  category { name }
  bestDatasheet { url }
  octopartUrl
  specs { attribute { name } displayValue }
  sellers(includeBrokers: false) {
    company { name }
    offers {
      clickUrl
      inventoryLevel
      packaging
      prices { quantity price currency }
    }
  }
"""

_SEARCH_QUERY = f"""
query ($q: String!, $limit: Int!) {{
  supSearch(q: $q, limit: $limit) {{
    results {{ part {{ {_PART_FIELDS} }} }}
  }}
}}
"""

_MPN_QUERY = f"""
query ($q: String!) {{
  supSearchMpn(q: $q, limit: 1) {{
    results {{ part {{ {_PART_FIELDS} }} }}
  }}
}}
"""


class OctopartProvider(Provider):
    name = "octopart"
    display_name = "Octopart (Nexar)"
    capabilities = frozenset(
        {
            Capability.SEARCH,
            Capability.DETAILS,
            Capability.PRICING,
            Capability.AVAILABILITY,
            Capability.DATASHEET,
        }
    )

    def __init__(self) -> None:
        self._token: str | None = None
        self._token_expiry: float = 0.0

    def is_configured(self) -> bool:
        return bool(config.nexar_client_id() and config.nexar_client_secret())

    def missing_config(self) -> str | None:
        if self.is_configured():
            return None
        return "Set NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET (nexar.com — Octopart's API platform)"

    async def _get_token(self, client: httpx.AsyncClient) -> str:
        if self._token and time.monotonic() < self._token_expiry - 60:
            return self._token
        resp = await client.post(
            _TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": config.nexar_client_id(),
                "client_secret": config.nexar_client_secret(),
                "scope": "supply.domain",
            },
        )
        if resp.status_code != 200:
            raise ProviderError(f"octopart: Nexar token request failed ({resp.status_code})")
        data = resp.json()
        self._token = data["access_token"]
        self._token_expiry = time.monotonic() + int(data.get("expires_in", 3600))
        return self._token

    async def _graphql(self, query: str, variables: dict) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            token = await self._get_token(client)
            resp = await client.post(
                _GRAPHQL_URL,
                json={"query": query, "variables": variables},
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code != 200:
                raise ProviderError(f"octopart: GraphQL request failed ({resp.status_code})")
            data = resp.json()
            if data.get("errors"):
                raise ProviderError(f"octopart: {data['errors'][0].get('message', 'GraphQL error')}")
            return data.get("data") or {}

    def _map_part(self, part: dict) -> ComponentResult:
        mpn = part.get("mpn") or ""
        offers: list[Offer] = []
        for seller in (part.get("sellers") or [])[:_MAX_SELLERS]:
            company = (seller.get("company") or {}).get("name")
            for o in seller.get("offers") or []:
                breaks = [
                    PriceBreak(
                        quantity=p.get("quantity", 1),
                        unit_price=p.get("price", 0.0),
                        currency=p.get("currency", "USD"),
                    )
                    for p in (o.get("prices") or [])
                ]
                offers.append(
                    Offer(
                        provider=self.name,
                        part_id=mpn,
                        seller=company,
                        product_url=o.get("clickUrl") or part.get("octopartUrl"),
                        stock=o.get("inventoryLevel"),
                        price_breaks=breaks,
                        packaging=o.get("packaging"),
                    )
                )
                break  # one offer per seller keeps results compact
        if not offers:
            offers = [Offer(provider=self.name, part_id=mpn, product_url=part.get("octopartUrl"))]
        return ComponentResult(
            mpn=mpn,
            manufacturer=(part.get("manufacturer") or {}).get("name"),
            description=part.get("shortDescription"),
            category=(part.get("category") or {}).get("name"),
            datasheet_url=(part.get("bestDatasheet") or {}).get("url"),
            offers=offers,
        )

    async def _find_part(self, part_id: str) -> dict:
        data = await self._graphql(_MPN_QUERY, {"q": part_id})
        results = (data.get("supSearchMpn") or {}).get("results") or []
        if not results:
            raise ProviderError(f"octopart: part {part_id!r} not found")
        return results[0]["part"]

    async def search(self, query: SearchQuery) -> list[ComponentResult]:
        data = await self._graphql(_SEARCH_QUERY, {"q": query.keyword, "limit": query.max_results})
        results = []
        for entry in (data.get("supSearch") or {}).get("results") or []:
            r = self._map_part(entry.get("part") or {})
            if query.manufacturer and (
                not r.manufacturer or query.manufacturer.lower() not in r.manufacturer.lower()
            ):
                continue
            if query.in_stock_only and not any((o.stock or 0) > 0 for o in r.offers):
                continue
            results.append(r)
        return results

    async def fetch_details(self, part_id: str) -> ComponentDetails:
        part = await self._find_part(part_id)
        base = self._map_part(part)
        specs = {
            ((s.get("attribute") or {}).get("name") or ""): (s.get("displayValue") or "")
            for s in part.get("specs") or []
        }
        return ComponentDetails(**base.model_dump(), specifications=specs, cad_assets=[])

    async def fetch_pricing(self, part_id: str) -> Offer:
        details = await self.fetch_details(part_id)
        priced = [o for o in details.offers if o.price_breaks]
        if not priced:
            raise ProviderError(f"octopart: no pricing for {part_id!r}")
        return priced[0]

    async def fetch_datasheet(self, part_id: str) -> str | None:
        return (await self.fetch_details(part_id)).datasheet_url
