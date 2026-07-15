"use client";

import * as React from "react";
import type { Offer } from "@/lib/domain/models";
import { formatStock } from "@/lib/utils";

const Q_BASE =
  "mono text-[11px] font-semibold text-ink2 bg-panel2 border border-line2 px-3 py-2 rounded-sm cursor-pointer transition-colors";
const Q_ON =
  "mono text-[11px] font-bold text-onacc bg-acc border border-acc px-3 py-2 rounded-sm cursor-pointer";

function compactQty(q: number): string {
  if (q >= 1000) return `${q / 1000}K`;
  return String(q);
}

/**
 * Quantity price calculator for a single distributor offer — mirrors the
 * Meridian Component design's break-driven calculator, driven by the offer's
 * real price_breaks.
 */
export function PriceCalculator({ offer }: { offer: Offer }) {
  const breaks = React.useMemo(
    () => [...offer.price_breaks].sort((a, b) => a.quantity - b.quantity),
    [offer.price_breaks],
  );
  const [qty, setQty] = React.useState(breaks[0]?.quantity ?? 1);

  if (breaks.length === 0) {
    return (
      <div className="border border-line bg-panel rounded-sm p-[18px] mono text-[11px] text-ink3">
        No price breaks reported for {offer.provider}.
      </div>
    );
  }

  let unit = breaks[0].unit_price;
  for (const b of breaks) if (qty >= b.quantity) unit = b.unit_price;
  const ext = unit * qty;

  const providerLabel = offer.provider.charAt(0).toUpperCase() + offer.provider.slice(1);

  return (
    <div className="border border-line bg-panel rounded-sm">
      <div className="p-[18px] border-b border-line">
        <div className="mono text-[9px] tracking-[0.12em] uppercase text-acc mb-3">
          Quantity calculator · {providerLabel}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {breaks.map((b) => (
            <button
              key={b.quantity}
              className={qty === b.quantity ? Q_ON : Q_BASE}
              onClick={() => setQty(b.quantity)}
            >
              {compactQty(b.quantity)}
            </button>
          ))}
        </div>
        <div className="flex justify-between items-baseline mt-4">
          <div>
            <div className="mono text-[9px] tracking-[0.1em] uppercase text-ink3">Unit</div>
            <div className="mono text-xl font-extrabold">${unit.toFixed(4)}</div>
          </div>
          <div className="text-right">
            <div className="mono text-[9px] tracking-[0.1em] uppercase text-ink3">
              Ext · {qty.toLocaleString()} pcs
            </div>
            <div className="mono text-xl font-extrabold text-ok">
              ${ext.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
      <div className="px-[18px] py-2 pb-3.5">
        {breaks.map((b, i) => (
          <div
            key={b.quantity}
            className="flex justify-between py-[7px] mono text-[11px] text-ink3"
            style={{ borderBottom: i === breaks.length - 1 ? "none" : "1px solid var(--line)" }}
          >
            <span>{b.quantity.toLocaleString()}</span>
            <span className="text-ink">${b.unit_price.toFixed(5)}</span>
          </div>
        ))}
        <div className="mono text-[10px] text-ink3 pt-2.5">
          {formatStock(offer.stock)} in stock · {breaks[0].currency ?? "USD"}
        </div>
      </div>
    </div>
  );
}
