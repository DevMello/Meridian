import { Panel, Lbl } from "@/components/meridian";

/**
 * Foundation placeholder for routes whose real UI is built by a later work unit.
 * Keeps navigation working and the layout coherent before features land.
 */
export function Placeholder({ title, unit }: { title: string; unit: string }) {
  return (
    <div className="mx-auto max-w-[1040px] px-6 py-10">
      <Panel corners className="relative overflow-hidden p-8">
        <Lbl accent>{title}</Lbl>
        <h1 className="h1 mt-2">{title}</h1>
        <p className="sub">
          This screen is built by the <span className="mono text-acc">{unit}</span> work
          unit. The shared shell, theme, and data layer are in place.
        </p>
      </Panel>
    </div>
  );
}
