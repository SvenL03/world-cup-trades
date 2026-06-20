import type { ReactNode } from "react";

export function GlowCard({
  children,
  className = "",
  soft = false,
}: {
  children: ReactNode;
  className?: string;
  soft?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-surface ${
        soft ? "glow-edge-soft" : "glow-edge"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
  sub,
  big = false,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "win" | "loss" | "gold";
  sub?: ReactNode;
  big?: boolean;
}) {
  const toneClass =
    tone === "win"
      ? "text-win"
      : tone === "loss"
        ? "text-loss"
        : tone === "gold"
          ? "text-de-gold"
          : "text-foreground";
  return (
    <GlowCard soft={!big} className={`px-4 py-3 ${big ? "glow-edge" : ""}`}>
      <div className={`uppercase tracking-wider text-muted ${big ? "text-xs font-semibold" : "text-[11px]"}`}>
        {label}
      </div>
      <div
        className={`font-semibold tabular-nums ${toneClass} ${
          big ? "text-3xl sm:text-4xl glow-text" : "text-xl"
        }`}
      >
        {value}
      </div>
      {sub ? <div className="text-xs text-muted mt-0.5">{sub}</div> : null}
    </GlowCard>
  );
}
