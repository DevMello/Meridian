import { Placeholder } from "@/components/shell/Placeholder";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Placeholder title="Project / BOM" unit={`Project detail (${id.slice(0, 8)})`} />;
}
