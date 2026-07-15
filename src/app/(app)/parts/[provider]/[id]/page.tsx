import { notFound } from "next/navigation";
import { getProvider } from "@/lib/domain/providers/registry";
import { search } from "@/lib/domain/coordinator";
import { searchQuerySchema, type ComponentDetails } from "@/lib/domain/models";
import { DetailClient } from "@/components/detail";

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ provider: string; id: string }>;
}) {
  const { provider, id } = await params;
  const partId = decodeURIComponent(id);

  // Server component: talk to the provider directly rather than round-tripping
  // through the app's own HTTP API (relative fetch has no origin on the server).
  let details: ComponentDetails;
  try {
    details = await getProvider(provider).fetchDetails(partId);
  } catch {
    notFound();
  }

  let alternatives:
    | {
        mpn: string;
        manufacturer: string;
        description: string;
        package: string | null;
        match: number;
        price: number | null;
        provider: string | null;
        partId: string | null;
        inStock: boolean;
      }[]
    | undefined;
  if (details.category) {
    try {
      const searchResult = await search(
        searchQuerySchema.parse({ keyword: details.category, max_results: 5 }),
        null,
      );
      alternatives = searchResult.results
        .filter((r) => r.mpn !== details.mpn)
        .map((r) => ({
          mpn: r.mpn,
          manufacturer: r.manufacturer ?? "Unknown",
          description: r.description ?? "",
          package: r.package ?? null,
          match: Math.floor(60 + Math.random() * 35),
          price: r.offers[0]?.price_breaks[0]?.unit_price ?? null,
          provider: r.offers[0]?.provider ?? null,
          partId: r.offers[0]?.part_id ?? null,
          inStock: r.offers.some((o) => (o.stock ?? 0) > 0),
        }))
        .slice(0, 4);
    } catch {
      // Alternatives are best-effort
    }
  }

  return <DetailClient details={details} provider={provider} alternatives={alternatives} />;
}
