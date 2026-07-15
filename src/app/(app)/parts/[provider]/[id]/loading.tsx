function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-line2 ${className}`} />;
}

/**
 * Next.js route-segment loading UI — shown instantly on navigation while the
 * server component above fetches live provider data (fetchDetails + related
 * search can take a few seconds). Mirrors DetailClient's layout so the swap
 * from skeleton to real content doesn't jump around.
 */
export default function PartDetailLoading() {
  return (
    <div className="pb-16">
      {/* Breadcrumb / action bar */}
      <div className="flex items-center justify-between gap-5 flex-wrap px-10 py-3.5 border-b border-line bg-bg">
        <div className="mono text-[11px] tracking-[0.04em] text-ink3 flex items-center gap-2 flex-wrap">
          <a href="/search" className="text-ink2 no-underline hover:text-acc">
            Search
          </a>
          <span>/</span>
          <Bar className="h-3 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Bar className="h-[27px] w-20" />
          <Bar className="h-[27px] w-24" />
          <Bar className="h-[27px] w-32" />
        </div>
      </div>

      {/* MCP provenance strip */}
      <div className="max-w-[1160px] mx-auto px-10 pt-4">
        <div className="flex items-center gap-3.5 flex-wrap mono text-[11px] border border-line bg-field rounded-sm px-4 py-[11px]">
          <span className="text-acc">▸ componenthub · get_component_details</span>
          <span className="flex-1" />
          <span className="text-warn flex items-center gap-2">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-spin"
              style={{ animationDuration: "1.2s" }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            querying provider…
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-[1160px] mx-auto px-10 pt-7 pb-2 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="border border-line bg-panel rounded-sm overflow-hidden">
          <div className="flex items-stretch border-b border-line px-1 py-2 gap-1">
            <Bar className="h-6 w-16 m-1.5" />
            <Bar className="h-6 w-14 m-1.5" />
            <Bar className="h-6 w-16 m-1.5" />
          </div>
          <div
            className="relative h-[440px] flex items-center justify-center"
            style={{ background: "radial-gradient(ellipse 80% 70% at 50% 40%, #101418, #08090a 75%)" }}
          >
            <div className="flex flex-col items-center gap-3 mono text-[11px] text-ink3">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--acc)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-spin"
                style={{ animationDuration: "1.2s" }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Fetching component data…
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-line">
            <Bar className="h-3 w-16" />
            <Bar className="h-3 w-20" />
          </div>
        </div>

        <div>
          <Bar className="h-3 w-24 mb-3" />
          <Bar className="h-9 w-3/4 mb-3.5" />
          <div className="flex items-center gap-3 mt-3.5">
            <Bar className="h-4 w-32" />
            <Bar className="h-5 w-20" />
          </div>
          <div className="mt-[18px] flex flex-col gap-2">
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-full" />
            <Bar className="h-3.5 w-2/3" />
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            <Bar className="h-5 w-24" />
            <Bar className="h-5 w-16" />
            <Bar className="h-5 w-20" />
          </div>

          <div className="grid grid-cols-2 gap-px bg-line border border-line mt-[22px] rounded-sm overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-panel px-4 py-3.5">
                <Bar className="h-2.5 w-16 mb-2" />
                <Bar className="h-4 w-12" />
              </div>
            ))}
          </div>

          <div className="flex items-baseline gap-3.5 mt-[22px]">
            <Bar className="h-8 w-28" />
            <Bar className="h-3 w-20" />
          </div>

          <div className="flex flex-wrap gap-2.5 mt-5">
            <Bar className="h-[38px] w-40" />
            <Bar className="h-[38px] w-32" />
          </div>
        </div>
      </div>

      {/* At a glance skeleton */}
      <div className="max-w-[1160px] mx-auto px-10 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-line border border-line rounded-sm overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-panel px-[18px] py-4">
              <Bar className="h-2 w-14 mb-2" />
              <Bar className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
