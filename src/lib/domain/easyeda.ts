/**
 * EasyEDA public component API — turns an LCSC product code (C#####) into
 * renderable schematic-symbol / footprint SVGs and downloadable 3D models.
 * Same endpoints easyeda2kicad.py uses; no key required.
 *
 *   https://easyeda.com/api/products/{code}/svgs        → pre-rendered SVGs
 *   https://easyeda.com/api/products/{code}/components  → EDA JSON + 3D uuid
 *   https://modules.easyeda.com/3dmodel/{uuid}          → OBJ (text)
 *   https://modules.easyeda.com/qAxj6KHrDKw4blvCG8QJPs7Y/{uuid} → STEP
 */
import { ProviderError } from "./providers/base";

export const EASYEDA_VERSION = "6.4.19.5";

// CloudFront in front of easyeda.com rejects sparse User-Agents.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
  Accept: "application/json, text/javascript, */*; q=0.01",
  Referer: "https://easyeda.com/",
};

/** Normalize and validate an LCSC product code ("c25804" → "C25804"). */
export function normalizeLcscCode(partId: string): string {
  const code = partId.trim().toUpperCase();
  if (!/^C\d+$/.test(code)) {
    throw new ProviderError(
      `easyeda: invalid LCSC code ${JSON.stringify(partId)} (expected C<number>)`,
    );
  }
  return code;
}

async function getJson(url: string): Promise<Record<string, unknown>> {
  const resp = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) {
    throw new ProviderError(`easyeda: request failed (${resp.status})`);
  }
  return (await resp.json()) as Record<string, unknown>;
}

export interface EasyEdaSvgs {
  /** Schematic symbol SVG (docType 2), if published. */
  symbol: string | null;
  /** PCB footprint SVG (docType 4), if published. */
  footprint: string | null;
}

export async function fetchEasyEdaSvgs(code: string): Promise<EasyEdaSvgs> {
  const data = await getJson(
    `https://easyeda.com/api/products/${normalizeLcscCode(code)}/svgs`,
  );
  const result = Array.isArray(data.result)
    ? (data.result as Record<string, unknown>[])
    : [];
  let symbol: string | null = null;
  let footprint: string | null = null;
  for (const doc of result) {
    const svg = typeof doc.svg === "string" ? doc.svg : null;
    if (!svg) continue;
    if (doc.docType === 2) symbol = svg;
    else if (doc.docType === 4) footprint = svg;
  }
  return { symbol, footprint };
}

/**
 * Extract the 3D-model uuid from the footprint document: it lives in an
 * `SVGNODE~{json}` shape entry under packageDetail. Returns null when the
 * part has no 3D model.
 */
export async function fetchEasyEda3dUuid(code: string): Promise<string | null> {
  const data = await getJson(
    `https://easyeda.com/api/products/${normalizeLcscCode(code)}/components?version=${EASYEDA_VERSION}`,
  );
  const result = (data.result ?? {}) as Record<string, unknown>;
  const packageDetail = (result.packageDetail ?? {}) as Record<string, unknown>;
  const dataStr = (packageDetail.dataStr ?? {}) as Record<string, unknown>;
  const shapes = Array.isArray(dataStr.shape) ? (dataStr.shape as unknown[]) : [];
  for (const shape of shapes) {
    if (typeof shape !== "string" || !shape.startsWith("SVGNODE~")) continue;
    try {
      const node = JSON.parse(shape.slice("SVGNODE~".length)) as {
        attrs?: { uuid?: string };
      };
      const uuid = node.attrs?.uuid;
      if (uuid && /^[0-9a-f]{32}$/i.test(uuid)) return uuid;
    } catch {
      // Malformed node — keep scanning.
    }
  }
  return null;
}

export function easyEdaStepUrl(uuid: string): string {
  return `https://modules.easyeda.com/qAxj6KHrDKw4blvCG8QJPs7Y/${uuid}`;
}

export function easyEdaObjUrl(uuid: string): string {
  return `https://modules.easyeda.com/3dmodel/${uuid}`;
}

/** Fetch a 3D model file (STEP or OBJ) for a part; null when none exists. */
export async function fetchEasyEda3dModel(
  code: string,
  kind: "step" | "obj",
): Promise<{ filename: string; body: ArrayBuffer } | null> {
  const normalized = normalizeLcscCode(code);
  const uuid = await fetchEasyEda3dUuid(normalized);
  if (!uuid) return null;
  const url = kind === "step" ? easyEdaStepUrl(uuid) : easyEdaObjUrl(uuid);
  const resp = await fetch(url, {
    headers: { "User-Agent": HEADERS["User-Agent"] },
    signal: AbortSignal.timeout(30_000),
  });
  if (!resp.ok) {
    throw new ProviderError(`easyeda: 3D model request failed (${resp.status})`);
  }
  return { filename: `${normalized}.${kind}`, body: await resp.arrayBuffer() };
}
