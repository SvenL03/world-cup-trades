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
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "win" | "loss" | "gold";
  sub?: ReactNode;
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
    <GlowCard soft className="px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`text-xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      {sub ? <div className="text-xs text-muted mt-0.5">{sub}</div> : null}
    </GlowCard>
  );
}
