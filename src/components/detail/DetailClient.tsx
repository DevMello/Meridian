"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ComponentViewer } from "./ComponentViewer";
import { PriceCalculator } from "./PriceCalculator";
import { api } from "@/lib/api-client";
import { addBomLine } from "@/lib/data/bom";
import { useCompare } from "@/lib/hooks/useCompare";
import { useSavedParts, useProjects } from "@/lib/hooks/data";
import { useToast } from "@/lib/hooks/useToast";
import { formatUsd, formatStock } from "@/lib/utils";
import type { ComponentDetails } from "@/lib/domain/models";

interface Alternate {
  mpn: string;
  manufacturer: string;
  description: string;
  package: string | null;
  match: number;
  price: number | null;
  provider: string | null;
  partId: string | null;
  inStock: boolean;
}

interface DetailClientProps {
  details: ComponentDetails;
  provider: string;
  alternatives?: Alternate[];
}

const EDA_TARGETS = ["KiCad", "Altium", "EasyEDA", "Fusion 360"] as const;

function lowestUnitPrice(details: ComponentDetails): number | null {
  const prices = details.offers.flatMap((o) => o.price_breaks.map((b) => b.unit_price));
  return prices.length ? Math.min(...prices) : null;
}

function totalStock(details: ComponentDetails): number {
  return details.offers.reduce((sum, o) => sum + (o.stock ?? 0), 0);
}

/** Lowest-quantity break of the primary offer — the "@ qty N" snapshot price. */
function entryPrice(details: ComponentDetails): { price: number | null; qty: number } {
  const offer = details.offers[0];
  if (!offer || offer.price_breaks.length === 0) return { price: null, qty: 1 };
  const sorted = [...offer.price_breaks].sort((a, b) => a.quantity - b.quantity);
  return { price: sorted[0].unit_price, qty: sorted[0].quantity };
}

function SectionHead({ n, title, note }: { n: string; title: string; note?: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-5 flex-wrap">
      <span className="mono text-[10px] tracking-[0.14em] uppercase text-acc">§ {n}</span>
      <h2 className="text-[26px] font-extrabold tracking-[-0.02em] m-0">{title}</h2>
      {note && <span className="mono text-[10px] text-ink3">{note}</span>}
    </div>
  );
}

function SpecCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="border border-line bg-panel rounded-sm px-[22px] py-5">
      <div className="mono text-[10px] tracking-[0.12em] uppercase text-acc mb-2">{title}</div>
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="flex justify-between gap-4 py-[9px] border-t border-line text-[13px]"
        >
          <span className="text-ink3">{k}</span>
          <span className="text-right">{v}</span>
        </div>
      ))}
    </div>
  );
}

export function DetailClient({ details, provider, alternatives = [] }: DetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { has: hasCompare, toggle: toggleCompare } = useCompare();
  const savedParts = useSavedParts();
  const projects = useProjects();

  const [copied, setCopied] = React.useState(false);
  const [bomOpen, setBomOpen] = React.useState(false);
  const bomRef = React.useRef<HTMLDivElement>(null);

  const activeProvider = details.offers[0]?.provider ?? provider;
  const isCompared = hasCompare(details.mpn);
  const isSaved = savedParts.data?.some(
    (s) => s.provider === activeProvider && s.part_id === details.mpn,
  );

  const addBom = useMutation({
    mutationFn: ({ projectId }: { projectId: string }) =>
      addBomLine(projectId, {
        mpn: details.mpn,
        provider: activeProvider,
        part_id: details.mpn,
        description: details.description ?? "",
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["bom", vars.projectId] });
      toast("Added to BOM", "ok");
      setBomOpen(false);
    },
    onError: (err: Error) => toast(err.message, "bad"),
  });

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bomRef.current && !bomRef.current.contains(e.target as Node)) setBomOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const specEntries = Object.entries(details.specifications ?? {});
  const highlights = specEntries.slice(0, 4);
  const stock = totalStock(details);
  const snapshot = entryPrice(details);
  const volumeLow = lowestUnitPrice(details);
  const isActive = (details.lifecycle_status ?? "").toLowerCase() === "active";

  // At-a-glance: curated fields, padded out with any remaining specs, capped at 6.
  const glance: [string, string][] = [
    ...(details.package ? ([["Package", details.package]] as [string, string][]) : []),
    ...(details.lifecycle_status
      ? ([["Lifecycle", details.lifecycle_status]] as [string, string][])
      : []),
    ["Distributors", String(details.offers.length)] as [string, string],
    ["Total stock", formatStock(stock)] as [string, string],
    ...specEntries.slice(4),
  ].slice(0, 6);

  // Split specs across two cards for the full-spec grid.
  const half = Math.ceil(specEntries.length / 2);
  const specColA = specEntries.slice(0, half);
  const specColB = specEntries.slice(half);

  const overviewRows: [string, string][] = [
    ["Manufacturer", details.manufacturer ?? "—"],
    ["Mfr part number", details.mpn],
    ...(details.category ? ([["Category", details.category]] as [string, string][]) : []),
    ...(details.package ? ([["Package / case", details.package]] as [string, string][]) : []),
    ["Product status", details.lifecycle_status ?? "—"],
  ];

  function copyMpn() {
    if (navigator.clipboard) navigator.clipboard.writeText(details.mpn);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function exportCad() {
    window.open(api.exportLink(activeProvider, details.mpn), "_blank");
    toast("Opening CAD export…", "ok");
  }

  function saveWatch() {
    savedParts.save.mutate(
      {
        provider: activeProvider,
        part_id: details.mpn,
        mpn: details.mpn,
        description: details.description ?? "",
      },
      {
        onSuccess: () => toast("Watching part", "ok"),
        onError: (err: Error) => toast(err.message, "bad"),
      },
    );
  }

  function compare() {
    toggleCompare({ provider: activeProvider, part_id: details.mpn, mpn: details.mpn });
    toast(isCompared ? "Removed from compare" : "Added to compare", "ok");
  }

  return (
    <div className="pb-16">
      {/* Breadcrumb / action bar */}
      <div className="flex items-center justify-between gap-5 flex-wrap px-10 py-3.5 border-b border-line bg-bg">
        <div className="mono text-[11px] tracking-[0.04em] text-ink3 flex items-center gap-2 flex-wrap">
          <a href="/search" className="text-ink2 no-underline hover:text-acc">
            Search
          </a>
          {details.category && (
            <>
              <span>/</span>
              <span className="text-ink2">{details.category}</span>
            </>
          )}
          <span>/</span>
          <span className="text-ink">{details.mpn}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className={`btn sm ${isSaved ? "on" : ""}`} onClick={saveWatch}>
            {isSaved ? "★ Watching" : "☆ Watch"}
          </button>
          <button className={`btn sm ${isCompared ? "on" : ""}`} onClick={compare}>
            {isCompared ? "✓ Comparing" : "Compare"}
          </button>
          <div className="relative" ref={bomRef}>
            <button className="btn sm" onClick={() => setBomOpen((o) => !o)}>
              ＋ Add to BOM ▾
            </button>
            {bomOpen && (
              <div className="panel absolute right-0 top-9 z-20 w-[240px] p-1 border-line2">
                {projects.data && projects.data.length > 0 ? (
                  projects.data.map((p) => (
                    <button
                      key={p.id}
                      className="nv border-l-0 text-[12.5px]"
                      onClick={() => addBom.mutate({ projectId: p.id })}
                    >
                      <span className="flex-1">{p.name}</span>
                      <span className="lbl text-[8.5px]">project</span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-xs text-ink3">No projects yet</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MCP provenance strip */}
      <div className="max-w-[1160px] mx-auto px-10 pt-4">
        <div className="flex items-center gap-3.5 flex-wrap mono text-[11px] border border-line bg-field rounded-sm px-4 py-[11px]">
          <span className="text-acc">▸ componenthub · get_component_details</span>
          <span className="text-ink">
            (&quot;{details.mpn}&quot;, provider=&quot;{activeProvider}&quot;)
          </span>
          <span className="flex-1" />
          <span className="text-ok">
            ◇ live · merged from {details.offers.length} provider
            {details.offers.length === 1 ? "" : "s"}
          </span>
          <span className="text-ink3">· nothing stored</span>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-[1160px] mx-auto px-10 pt-7 pb-2 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <ComponentViewer details={details} />

        <div>
          {details.category && (
            <div className="mono text-[10px] tracking-[0.14em] uppercase text-ink3 mb-3">
              {details.category}
            </div>
          )}
          <div className="flex items-start gap-3 flex-wrap">
            <h1 className="text-[40px] leading-[1.02] font-extrabold tracking-[-0.03em] m-0 break-words">
              {details.mpn}
            </h1>
            <button className="btn sm mt-1.5" onClick={copyMpn}>
              {copied ? "Copied ✓" : "Copy MPN"}
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3.5 flex-wrap">
            <span className="text-[15px] font-semibold">{details.manufacturer}</span>
            {details.lifecycle_status && (
              <span className={`tag ${isActive ? "ok" : "warn"}`}>
                {isActive && <span className="dot rounded-full bg-ok" />}
                {details.lifecycle_status}
              </span>
            )}
          </div>
          {details.description && (
            <p className="text-[15px] leading-[1.6] text-ink2 mt-[18px] mb-0">
              {details.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-5">
            <span className={`tag ${stock > 0 ? "ok" : "bad"}`}>
              {stock > 0 && <span className="dot rounded-full bg-ok" />}
              {stock > 0 ? `In stock · ${stock.toLocaleString()}` : "Out of stock"}
            </span>
            {details.package && <span className="tag mut">{details.package}</span>}
            {details.offers.map((o) => (
              <span key={o.provider} className="tag mut">
                {o.provider}
              </span>
            ))}
          </div>

          {/* Key highlights */}
          {highlights.length > 0 && (
            <div className="grid grid-cols-2 gap-px bg-line border border-line mt-[22px] rounded-sm overflow-hidden">
              {highlights.map(([k, v]) => (
                <div key={k} className="bg-panel px-4 py-3.5">
                  <div className="mono text-[9.5px] tracking-[0.1em] uppercase text-ink3">{k}</div>
                  <div className="text-[18px] font-bold mt-1">{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Price snapshot */}
          <div className="flex items-baseline gap-3.5 mt-[22px] flex-wrap">
            <span className="text-[30px] font-extrabold tracking-[-0.02em]">
              {formatUsd(snapshot.price)}
            </span>
            <span className="mono text-[11px] text-ink3">/ ea @ qty {snapshot.qty}</span>
            {volumeLow !== null && volumeLow !== snapshot.price && (
              <span className="mono text-[11px] text-ink2">— volume to {formatUsd(volumeLow)}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2.5 mt-5">
            <button className="btn pri" onClick={exportCad}>
              Export to CAD ↗
            </button>
            {details.datasheet_url && (
              <a
                className="btn"
                href={details.datasheet_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Datasheet PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {/* At a glance */}
      {glance.length > 0 && (
        <div className="max-w-[1160px] mx-auto px-10 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-line border border-line rounded-sm overflow-hidden">
            {glance.map(([k, v]) => (
              <div key={k} className="bg-panel px-[18px] py-4">
                <div className="mono text-[9px] tracking-[0.1em] uppercase text-ink3">{k}</div>
                <div className="text-[15px] font-bold mt-[5px] break-words">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* §01 Availability & pricing */}
      <div className="max-w-[1160px] mx-auto px-10 py-6">
        <SectionHead
          n="01"
          title="Availability & pricing"
          note={`live · ${details.offers.length} distributor${details.offers.length === 1 ? "" : "s"} · unranked`}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-4 items-start">
          {/* Distributors */}
          <div className="border border-line bg-panel rounded-sm overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1fr_0.9fr_0.7fr] gap-2.5 px-[18px] py-[11px] border-b border-line mono text-[9px] tracking-[0.1em] uppercase text-ink3">
              <span>Distributor</span>
              <span>Stock</span>
              <span>@ Qty {snapshot.qty}</span>
              <span className="text-right">Action</span>
            </div>
            {details.offers.length > 0 ? (
              details.offers.map((o, i) => {
                const sorted = [...o.price_breaks].sort((a, b) => a.quantity - b.quantity);
                const q1 = sorted[0]?.unit_price ?? null;
                return (
                  <div
                    key={o.provider + i}
                    className="grid grid-cols-[1.4fr_1fr_0.9fr_0.7fr] gap-2.5 px-[18px] py-[15px] items-center"
                    style={{
                      borderBottom:
                        i === details.offers.length - 1 ? "none" : "1px solid var(--line)",
                    }}
                  >
                    <div>
                      <div className="font-semibold text-[13px] capitalize">{o.provider}</div>
                      <div className="mono text-[10px] text-ink3 mt-0.5">{o.part_id}</div>
                    </div>
                    <div>
                      <div
                        className={`mono text-[13px] ${(o.stock ?? 0) > 0 ? "text-ok" : "text-ink3"}`}
                      >
                        {formatStock(o.stock)}
                      </div>
                    </div>
                    <div className="mono text-[13px]">{formatUsd(q1)}</div>
                    <div className="text-right">
                      {o.product_url ? (
                        <a
                          href={o.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mono text-[10px] font-semibold no-underline px-2.5 py-[7px] rounded-sm ${
                            i === 0
                              ? "text-onacc bg-acc"
                              : "text-ink border border-line2 inline-block"
                          }`}
                        >
                          Buy ↗
                        </a>
                      ) : (
                        <span className="mono text-[10px] text-ink3">—</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-[18px] py-6 mono text-[11px] text-ink3">
                No distributor data available.
              </div>
            )}
          </div>

          {/* Calculator */}
          {details.offers[0] && <PriceCalculator offer={details.offers[0]} />}
        </div>
      </div>

      {/* §02 Full specifications */}
      {specEntries.length > 0 && (
        <div className="max-w-[1160px] mx-auto px-10 py-6">
          <SectionHead
            n="02"
            title="Full specifications"
            note="every normalized parameter returned by the provider"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SpecCard title="Overview" rows={overviewRows} />
            {specColA.length > 0 && <SpecCard title="Parameters" rows={specColA} />}
            {specColB.length > 0 && <SpecCard title="Parameters (cont.)" rows={specColB} />}
          </div>
        </div>
      )}

      {/* §03 Documents & media */}
      <div className="max-w-[1160px] mx-auto px-10 py-6">
        <SectionHead
          n="03"
          title="Documents & CAD"
          note="fetched live from the provider — nothing cached"
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {/* Docs list */}
          <div className="border border-line bg-panel rounded-sm overflow-hidden">
            {details.datasheet_url ? (
              <a
                href={details.datasheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 px-[18px] py-[15px] no-underline text-inherit border-b border-line hover:bg-panel2"
              >
                <span className="mono text-[9px] text-bad border border-[color:var(--badsoft)] px-[7px] py-[5px] rounded-sm">
                  PDF
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] font-semibold">
                    Datasheet — {details.mpn}
                  </span>
                  <span className="mono text-[10px] text-ink3">manufacturer document</span>
                </span>
                <span className="text-ink2">↓</span>
              </a>
            ) : (
              <div className="px-[18px] py-[15px] mono text-[11px] text-ink3">
                No datasheet reported by this provider.
              </div>
            )}
            {details.cad_assets.slice(0, 4).map((a) => (
              <a
                key={a.filename}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 px-[18px] py-[15px] no-underline text-inherit border-t border-line hover:bg-panel2"
              >
                <span className="mono text-[9px] text-acc border border-[color:var(--accline)] px-[7px] py-[5px] rounded-sm uppercase">
                  {a.kind}
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] font-semibold">{a.filename}</span>
                  <span className="mono text-[10px] text-ink3">{a.format}</span>
                </span>
                <span className="text-ink2">↓</span>
              </a>
            ))}
          </div>

          {/* CAD export */}
          <div
            className="rounded-sm p-[22px] border"
            style={{
              borderColor: "var(--accline)",
              background: "linear-gradient(180deg, var(--accsoft), var(--panel) 60%)",
            }}
          >
            <div className="mono text-[10px] tracking-[0.12em] uppercase text-acc">
              Export to CAD · get_export_link
            </div>
            <p className="text-[13px] leading-[1.6] text-ink2 mt-3 mb-[18px]">
              Symbol, footprint and STEP model bundled on demand from the provider and zipped on the
              fly. Pick your tool:
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {EDA_TARGETS.map((t) => (
                <button
                  key={t}
                  onClick={exportCad}
                  className="flex items-center justify-between mono text-[12px] font-semibold text-ink border border-line2 bg-panel2 px-4 py-3.5 rounded-sm cursor-pointer hover:border-ink3"
                >
                  {t} <span className="text-ink3">.zip ↓</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* §04 Family & alternates */}
      {alternatives.length > 0 && (
        <div className="max-w-[1160px] mx-auto px-10 py-6">
          <SectionHead n="04" title="Family & alternates" note="same category · cross-references" />
          <div className="border border-line bg-panel rounded-sm overflow-hidden">
            {alternatives.map((alt, i) => {
              const clickable = Boolean(alt.provider && alt.partId);
              const go = () =>
                clickable &&
                router.push(
                  `/parts/${alt.provider}/${encodeURIComponent(alt.partId as string)}`,
                );
              return (
                <div
                  key={alt.mpn}
                  onClick={go}
                  className={`grid grid-cols-[1.2fr_1.6fr_0.8fr_0.7fr] gap-3 px-[18px] py-[15px] items-center ${
                    clickable ? "cursor-pointer hover:bg-panel2" : ""
                  }`}
                  style={{
                    borderBottom: i === alternatives.length - 1 ? "none" : "1px solid var(--line)",
                  }}
                >
                  <span className="mono font-semibold text-[13px]">{alt.mpn}</span>
                  <span className="text-ink2 text-[13px] truncate">{alt.description}</span>
                  <span className="mono text-[12px] text-ink3">{alt.package ?? "—"}</span>
                  <span className="text-right mono text-[12px]">
                    {alt.inStock ? (
                      <span className="text-ok">in stock</span>
                    ) : (
                      <span className="text-ink3">{formatUsd(alt.price)}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-[1160px] mx-auto px-10 pt-6 mt-6 border-t border-line flex items-center justify-between mono text-[10px] tracking-[0.1em] uppercase text-ink3">
        <span>Meridian · ComponentHub MCP</span>
        <span>get_component_details · live only · no database</span>
      </div>
    </div>
  );
}
