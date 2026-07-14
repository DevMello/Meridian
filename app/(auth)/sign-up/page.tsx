import { Panel } from "@/components/meridian";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <Panel corners className="p-8">
      <AuthForm initialMode="up" next={next} />
    </Panel>
  );
}
