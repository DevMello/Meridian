import { BlueprintGrid } from "@/components/meridian";

/** Centered auth shell with a blueprint-grid backdrop. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <BlueprintGrid />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}
