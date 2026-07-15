"use client";

import * as React from "react";
import type { ComponentDetails } from "@/lib/domain/models";

type ViewId = "3d" | "photo" | "drawing";

const TAB_BASE =
  "mono text-[10px] font-semibold tracking-[0.06em] uppercase px-4 py-3 bg-transparent border-0 border-b-2 border-transparent cursor-pointer text-ink3 whitespace-nowrap transition-colors";
const TAB_ON =
  "mono text-[10px] font-semibold tracking-[0.06em] uppercase px-4 py-3 border-0 border-b-2 border-b-acc cursor-pointer text-ink whitespace-nowrap bg-[color:var(--accsoft)]";

/**
 * Media viewer for the component hero. STEP models are fetched on demand from
 * the provider (never stored), so the interactive 3D tab shows the download
 * fallback here; Photo renders the provider image when present.
 */
export function ComponentViewer({ details }: { details: ComponentDetails }) {
  const hasPhoto = Boolean(details.image_url);
  const [view, setView] = React.useState<ViewId>(hasPhoto ? "photo" : "3d");

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
      <div className="flex items-stretch border-b border-line">
        <button className={view === "3d" ? TAB_ON : TAB_BASE} onClick={() => setView("3d")}>
          3D Model
        </button>
        <button className={view === "photo" ? TAB_ON : TAB_BASE} onClick={() => setView("photo")}>
          Photo
        </button>
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
