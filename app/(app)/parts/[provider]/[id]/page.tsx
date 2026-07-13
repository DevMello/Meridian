import { Placeholder } from "@/components/shell/Placeholder";

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ provider: string; id: string }>;
}) {
  const { provider, id } = await params;
  return <Placeholder title={`Part · ${decodeURIComponent(id)}`} unit={`Detail (${provider})`} />;
}
