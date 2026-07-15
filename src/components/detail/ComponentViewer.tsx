"use client";

import * as React from "react";
import type { CadAsset, ComponentDetails } from "@/lib/domain/models";

type ViewId = "3d" | "photo" | "symbol" | "footprint" | "drawing";

const TAB_BASE =
  "mono text-[10px] font-semibold tracking-[0.06em] uppercase px-4 py-3 bg-transparent border-0 border-b-2 border-transparent cursor-pointer text-ink3 whitespace-nowrap transition-colors";
const TAB_ON =
  "mono text-[10px] font-semibold tracking-[0.06em] uppercase px-4 py-3 border-0 border-b-2 border-b-acc cursor-pointer text-ink whitespace-nowrap bg-[color:var(--accsoft)]";

function svgAsset(details: ComponentDetails, kind: string): CadAsset | undefined {
  return details.cad_assets.find((a) => a.kind === kind && a.filename.endsWith(".svg"));
}

/** SVG pane with a graceful note when the provider has nothing published. */
function SvgStage({ asset, label, light }: { asset: CadAsset; label: string; light?: boolean }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center mono text-[11px] text-ink3">
        {label} preview unavailable for this part.
      </div>
    );
  }
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center p-9 ${light ? "bg-white" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {/* w/h-full so small intrinsic SVG canvases scale up to the stage */}
      <img
        src={asset.url}
        alt={label}
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

/**
 * Media viewer for the component hero. Symbol/footprint SVGs render live from
 * the provider when available (EasyEDA-backed parts); STEP models are fetched
 * on demand (never stored), so the interactive 3D tab shows the download
 * fallback here; Photo renders the provider image when present.
 */
export function ComponentViewer({ details }: { details: ComponentDetails }) {
  const hasPhoto = Boolean(details.image_url);
  const symbol = svgAsset(details, "symbol");
  const footprint = svgAsset(details, "footprint");
  const [view, setView] = React.useState<ViewId>(
    hasPhoto ? "photo" : symbol ? "symbol" : "3d",
  );

  const formats = Array.from(
    new Set(details.cad_assets.map((a) => a.format).filter((f) => f && f !== "universal")),
  );
  const formatLabel = formats.length
    ? formats.map((f) => f.charAt(0).toUpperCase() + f.slice(1)).join(" · ")
    : "STEP · IGES";
  const pkg = details.package ?? "Package n/a";

  return (
    <div className="border border-line bg-panel rounded-sm overflow-hidden">
      {/* Tab strip */}
      <div className="flex items-stretch border-b border-line overflow-x-auto">
        <button className={view === "3d" ? TAB_ON : TAB_BASE} onClick={() => setView("3d")}>
          3D Model
        </button>
        <button className={view === "photo" ? TAB_ON : TAB_BASE} onClick={() => setView("photo")}>
          Photo
        </button>
        {symbol && (
          <button
            className={view === "symbol" ? TAB_ON : TAB_BASE}
            onClick={() => setView("symbol")}
          >
            Symbol
          </button>
        )}
        {footprint && (
          <button
            className={view === "footprint" ? TAB_ON : TAB_BASE}
            onClick={() => setView("footprint")}
          >
            Footprint
          </button>
        )}
        <button
          className={view === "drawing" ? TAB_ON : TAB_BASE}
          onClick={() => setView("drawing")}
        >
          Drawing
        </button>
      </div>

      {/* Stage */}
      <div
        className="relative h-[440px]"
        style={{ background: "radial-gradient(ellipse 80% 70% at 50% 40%, #101418, #08090a 75%)" }}
      >
        {/* 3D — download fallback */}
        {view === "3d" && (
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 mono text-[11px] text-ink3 text-center px-8">
              <div className="w-11 h-11 border border-line2 flex items-center justify-center text-acc">
                ◧
              </div>
              <div className="leading-relaxed">
                STEP model fetched on demand from the provider.
                <br />
                Interactive viewer unavailable here — download the CAD bundle below.
              </div>
            </div>
            <div className="absolute right-3.5 top-3 mono text-[9px] tracking-[0.1em] uppercase text-acc border border-[color:var(--accline)] bg-[color:var(--accsoft)] px-2 py-1 rounded-sm pointer-events-none">
              STEP AP242 · live
            </div>
          </>
        )}

        {/* Photo */}
        {view === "photo" && (
          <div className="absolute inset-0 flex items-center justify-center p-9">
            {hasPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={details.image_url as string}
                alt={details.mpn}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div
                className="w-full h-full border border-dashed border-line2 rounded-sm flex items-center justify-center"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg,#0e1113 0,#0e1113 9px,#0b0d0e 9px,#0b0d0e 18px)",
                }}
              >
                <span className="mono text-[11px] tracking-[0.1em] uppercase text-ink3">
                  product photo · {details.mpn}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Schematic symbol — EasyEDA SVGs embed a white canvas, so keep it light */}
        {view === "symbol" && symbol && (
          <SvgStage asset={symbol} label="Schematic symbol" light />
        )}

        {/* Footprint — layer colors are drawn for a dark canvas */}
        {view === "footprint" && footprint && (
          <SvgStage asset={footprint} label="Footprint" />
        )}

        {/* Drawing */}
        {view === "drawing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-9 mono text-[11px] text-ink3 text-center">
            <div className="w-11 h-11 border border-line2 flex items-center justify-center text-acc">
              ▭
            </div>
            <div className="leading-relaxed">
              Mechanical drawing ships inside the datasheet and CAD footprint.
              <br />
              Package: {pkg}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-line mono text-[10px] tracking-[0.06em] text-ink3">
        <span>{pkg}</span>
        <span className="text-ink2">{formatLabel}</span>
      </div>
    </div>
  );
}
