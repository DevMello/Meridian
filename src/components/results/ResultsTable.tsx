"use client";

import { useRouter } from "next/navigation";
import { track } from "@pulse/sdk";
import { cn, formatUsd, formatStock } from "@/lib/utils";
import { useCompare } from "@/lib/hooks/useCompare";
import type { ComponentResult } from "@/lib/domain/models";

type SortKey = "mpn" | "price" | "stock" | "match";
type Dataset = "reg" | "esp" | "opamp";

const SPEC_COLS: Record<Dataset, { key: string; label: string }[]> = {
  reg: [
    { key: "VIN", label: "VIN" },
    { key: "EFF", label: "EFF" },
    { key: "FSW", label: "FSW" },
    { key: "IQ", label: "IQ" },
    { key: "PKG", label: "PKG" },
  ],
  esp: [
    { key: "CORE", label: "CORE" },
    { key: "RADIO", label: "RADIO" },
    { key: "USB", label: "USB" },
    { key: "FLASH", label: "FLASH" },
    { key: "GPIO", label: "GPIO" },
  ],
  opamp: [
    { key: "NOISE", label: "NOISE" },
    { key: "OFFSET", label: "OFFSET" },
    { key: "SUPPLY", label: "SUPPLY" },
    { key: "GBW", label: "GBW" },
    { key: "IQ", label: "IQ" },
  ],
};

export interface ResultsTableProps {
  results: ComponentResult[];
  sortKey: SortKey;
  sortDir: 1 | -1;
  onSort: (key: SortKey) => void;
  bestMpns: string[];
  dataset: Dataset;
}

const ARROW = (key: SortKey, active: SortKey, dir: 1 | -1) =>
  active === key ? (dir === 1 ? " ↑" : " ↓") : "";

function bestPrice(r: ComponentResult): number | null {
  const prices = r.offers
    .flatMap((o) => o.price_breaks.map((b) => b.unit_price))
    .filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : null;
}

const SPEC_ALIASES: Record<string, string[]> = {
  VIN: ["Input Voltage", "Input Voltage (Max)", "Input Voltage Range", "Supply Voltage", "VIN", "Vin"],
  EFF: ["Efficiency", "Efficiency (%)", "Efficiency (Typ)"],
  FSW: ["Switching Frequency", "Switching Frequency (Max)", "Frequency", "Frequency (Max)"],
  IQ: ["Quiescent Current", "Quiescent Current (Max)", "Supply Current", "IQ", "Iq"],
  CORE: ["Core", "Core Processor", "Core Architecture", "Processor"],
  RADIO: ["Wi-Fi", "Radio", "Wireless", "Connectivity", "Bluetooth", "Protocol"],
  USB: ["USB", "USB Interface", "USB Type"],
  FLASH: ["Flash", "Flash Memory", "Flash Size", "Memory Size", "Program Memory Size"],
  GPIO: ["GPIO", "Number of GPIO", "I/O Pins", "Digital I/O Pins"],
  NOISE: ["Input Noise", "Noise", "Noise Density", "Voltage Noise", "Noise (Typ)"],
  OFFSET: ["Offset", "Offset Voltage", "Offset Voltage (Max)", "Vos", "Input Offset Voltage"],
  SUPPLY: ["Supply Voltage", "Supply", "Supply Voltage (Max)", "Supply Voltage (Min)", "Operating Voltage", "Supply Range"],
  GBW: ["GBW", "Gain Bandwidth", "Gain Bandwidth Product", "Bandwidth", "Gain-Bandwidth"],
};

function specValue(r: ComponentResult, colKey: string): string | null {
  if (colKey === "PKG") return r.package ?? null;
  const aliases = SPEC_ALIASES[colKey] ?? [];
  for (const a of aliases) {
    const v = r.specifications?.[a];
    if (v != null) return v;
  }
  return null;
}

function totalStock(r: ComponentResult): number {
  return r.offers.reduce((sum, o) => sum + (o.stock ?? 0), 0);
}

export function ResultsTable({
  results,
  sortKey,
  sortDir,
  onSort,
  bestMpns,
  dataset,
}: ResultsTableProps) {
  const router = useRouter();
  const { has, toggle } = useCompare();
  const cols = SPEC_COLS[dataset];

  return (
    <div className="panel overflow-x-auto">
      <div className="min-w-[860px]">
        <div className="thead g-res">
          <button className={cn("thb", sortKey === "mpn" && "on")} onClick={() => onSort("mpn")}>
            Component{ARROW("mpn", sortKey, sortDir)}
          </button>
          {cols.map((c) => (
            <span key={c.key} className="thb">{c.label}</span>
          ))}
          <button
            className={cn("thb", sortKey === "price" && "on")}
            onClick={() => onSort("price")}
          >
            Best ${ARROW("price", sortKey, sortDir)}
          </button>
          <button
            className={cn("thb", sortKey === "stock" && "on")}
            onClick={() => onSort("stock")}
          >
            Stock{ARROW("stock", sortKey, sortDir)}
          </button>
          <span className="thb">+CMP</span>
        </div>
        {results.map((r) => {
          const isBest = bestMpns.includes(r.mpn);
          const price = bestPrice(r);
          const stock = totalStock(r);
          const partId = r.offers[0]?.part_id ?? r.mpn;
          const provider = r.offers[0]?.provider ?? "unknown";
          return (
            <div
              key={r.mpn}
              className={cn(
                "trow click g-res cursor-pointer",
                isBest && "best",
              )}
              onClick={() => {
                track("result_opened", { mpn: r.mpn, provider, layout: "table" });
                router.push(`/parts/${provider}/${encodeURIComponent(partId)}`);
              }}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[13px] font-semibold">{r.mpn}</span>
                  {isBest && <span className="tag acc">Best match</span>}
                </div>
                <div className="mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-ink3">
                  {r.manufacturer ?? "—"} · {r.description?.slice(0, 60) ?? ""}
                </div>
              </div>
              {cols.map((c) => {
                const v = specValue(r, c.key);
                return (
                  <span key={c.key} className="mono text-[11.5px]">
                    {v ?? "—"}
                  </span>
                );
              })}
              <span className="mono text-[12.5px] font-semibold">
                {formatUsd(price)}
              </span>
              <span>
                <span
                  className={cn(
                    "mono text-[11px]",
                    stock === 0
                      ? "text-bad"
                      : stock < 10000
                        ? "text-warn"
                        : "text-ink",
                  )}
                >
                  {formatStock(stock)}
                </span>
              </span>
              <button
                className={cn(
                  "btn sm",
                  has(r.mpn) ? "on" : "",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle({
                    provider,
                    part_id: partId,
                    mpn: r.mpn,
                  });
                }}
              >
                {has(r.mpn) ? "✓" : "+CMP"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
