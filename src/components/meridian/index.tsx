/**
 * Meridian design-system primitives. Import from "@/components/meridian".
 * These mirror the prototype's class API (see app/globals.css).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------- Panel */
export function Panel({
  className,
  corners = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { corners?: boolean }) {
  return (
    <div className={cn("panel relative", className)} {...props}>
      {corners && <CornerTicks />}
      {children}
    </div>
  );
}

export function CornerTicks() {
  return (
    <>
      <span className="ct tl" />
      <span className="ct tr" />
      <span className="ct bl" />
      <span className="ct br" />
    </>
  );
}

export function BlueprintGrid({ className }: { className?: string }) {
  return <div className={cn("bgrid pointer-events-none absolute inset-0", className)} />;
}

/* ------------------------------------------------------------------ Label */
export function Lbl({
  className,
  accent = false,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { accent?: boolean }) {
  return <span className={cn("lbl", accent && "acc", className)} {...props} />;
}

/* -------------------------------------------------------------------- Tag */
export type TagKind = "ok" | "warn" | "bad" | "acc" | "mut";
export function Tag({
  kind = "mut",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { kind?: TagKind }) {
  return <span className={cn("tag", kind, className)} {...props} />;
}

/* ------------------------------------------------------------------- Chip */
export function Chip({
  className,
  relaxable = false,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { relaxable?: boolean }) {
  return <span className={cn("chip", relaxable && "rx", className)} {...props} />;
}

/* ----------------------------------------------------------------- Button */
type ButtonVariant = "default" | "pri" | "on";
export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "default" | "sm";
  }
>(function Button(
  { className, variant = "default", size = "default", disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        "btn",
        variant === "pri" && "pri",
        variant === "on" && "on",
        size === "sm" && "sm",
        disabled && "dis",
        className,
      )}
      {...props}
    />
  );
});

/* --------------------------------------------------------- Segmented control */
export function Seg<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("seg", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          className={cn("segbtn", value === o.value && "on")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Modal */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={cn(
          "panel relative mt-[8vh] w-full max-w-2xl animate-fadeUp p-6",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <CornerTicks />
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <div className="lbl acc">{title}</div>
            <button className="chipb" onClick={onClose}>
              Close ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Spinner */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-3 w-3 animate-spin rounded-full border border-ink3 border-t-acc",
        className,
      )}
    />
  );
}
