"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Flag } from "./Flag";
import { Stat } from "./GlowCard";
import { TradeEditModal } from "./TradeEditModal";
import { totals, usd, cents, estCommission } from "@/lib/pl";
import type { TradeWithPL } from "@/lib/types";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type SortKey =
  | "label" | "side" | "category" | "shares" | "buyPrice" | "livePrice"
  | "projectedProfit" | "liveUnrealizedPL" | "realizedPL" | "myProbability" | "status"
  | "kickoffAt" | "cost" | "margin" | "weight";

/** Sort value for a column, including the computed ones. */
function metric(t: TradeWithPL, key: SortKey): number | string | null {
  if (key === "margin") return t.cost > 0 ? t.projectedProfit / t.cost : null;
  if (key === "weight") return t.cost; // weight is proportional to cost
  return (t as unknown as Record<string, unknown>)[key] as number | string | null;
}

/** Format a kickoff/resolve timestamp; supports date-only or full datetime. */
function fmtKickoff(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v);
  if (isNaN(d.getTime())) return v;
  const hasTime = v.length > 10;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    ...(hasTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

const badge = (cls: string) =>
  `inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${cls}`;

export function TradesClient({
  initial,
  canEdit: initialCanEdit,
}: {
  initial: TradeWithPL[];
  canEdit: boolean;
}) {
  const { data, mutate, isValidating } = useSWR<{ trades: TradeWithPL[]; fetchedAt: string }>(
    "/api/trades",
    fetcher,
    { refreshInterval: 900_000, fallbackData: { trades: initial, fetchedAt: new Date().toISOString() } },
  );
  const trades = data?.trades ?? initial;

  const [authed, setAuthed] = useState(initialCanEdit);
  const [bucket, setBucket] = useState<"current" | "potential" | "all">("current");
  const [fav, setFav] = useState<"all" | "favorites">("all");
  const [side, setSide] = useState<"all" | "for" | "against">("all");
  const [status, setStatus] = useState<"all" | "open" | "won" | "lost" | "settled">("open");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "kickoffAt", desc: false });
  const [editing, setEditing] = useState<TradeWithPL | null | undefined>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [mapMsg, setMapMsg] = useState<string | null>(null);

  // Everything except the status filter — Realized P/L & Record are derived from
  // this, so toggling Open/Won/Lost doesn't change settled (set-in-stone) results.
  const scopedNoStatus = useMemo(() => {
    let rows = trades;
    if (bucket !== "all") rows = rows.filter((t) => t.tradeType === bucket);
    if (fav === "favorites") rows = rows.filter((t) => t.favorite);
    if (side !== "all") rows = rows.filter((t) => t.side === side);
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((t) =>
        [t.label, t.teamName, t.match, t.notes].some((v) => v?.toLowerCase().includes(s)),
      );
    }
    return rows;
  }, [trades, bucket, fav, side, q]);

  const filtered = useMemo(() => {
    const rows =
      status === "all"
        ? scopedNoStatus
        : status === "settled"
          ? scopedNoStatus.filter((t) => t.status !== "open")
          : scopedNoStatus.filter((t) => t.status === status);
    const dir = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = metric(a, sort.key), bv = metric(b, sort.key);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [scopedNoStatus, status, sort]);

  const sums = useMemo(() => totals(filtered), [filtered]);
  // Settled record/realized: independent of the status filter.
  const record = useMemo(() => totals(scopedNoStatus), [scopedNoStatus]);
  const favCount = useMemo(() => trades.filter((t) => t.favorite).length, [trades]);

  // Estimated fees (entry side) across every position taken. Commission uses the
  // Gold rate (5%); exchange fee is ~$0.02 per contract per side.
  const { commission, exchange, feesTotal } = useMemo(() => {
    let commission = 0;
    let exchange = 0;
    for (const t of trades) {
      if (t.shares <= 0) continue;
      commission += estCommission(t.buyPrice, t.shares, true);
      exchange += t.shares * 0.02;
    }
    return { commission, exchange, feesTotal: commission + exchange };
  }, [trades]);

  async function refreshPrices() {
    setRefreshing(true);
    await fetch("/api/refresh-prices").catch(() => {});
    await mutate();
    setRefreshing(false);
  }

  // Keep prices fresh without relying on the (unreliable) GitHub cron: refresh
  // on mount and every 15 min while the page is open, then revalidate.
  const didInit = useRef(false);
  useEffect(() => {
    async function tick() {
      await fetch("/api/refresh-prices").catch(() => {});
      mutate();
    }
    if (!didInit.current) {
      didInit.current = true;
      tick();
    }
    const id = setInterval(tick, 900_000);
    return () => clearInterval(id);
  }, [mutate]);

  async function autoMap() {
    setMapping(true);
    setMapMsg(null);
    // refresh prices first so newly-listed markets are available to match
    await fetch("/api/refresh-prices").catch(() => {});
    const res = await fetch("/api/automap", { method: "POST" });
    setMapping(false);
    if (res.status === 401) {
      setMapMsg("Log in to auto-map.");
      return;
    }
    if (!res.ok) {
      setMapMsg("Auto-map failed.");
      return;
    }
    const j = (await res.json()) as {
      mapped: number;
      total: number;
      details: { label: string; ticker: string | null }[];
    };
    const nowMapped = j.details.filter((d) => d.ticker).length;
    const pending = j.total - nowMapped;
    setMapMsg(
      `${j.mapped} newly mapped · ${nowMapped}/${j.total} now have a live market` +
        (pending ? ` · ${pending} pending (markets not listed yet)` : ""),
    );
    await mutate();
  }

  async function toggleFav(t: TradeWithPL) {
    // optimistic update
    mutate(
      (cur) =>
        cur
          ? {
              ...cur,
              trades: cur.trades.map((x) =>
                x.id === t.id ? { ...x, favorite: !x.favorite } : x,
              ),
            }
          : cur,
      { revalidate: false },
    );
    const res = await fetch(`/api/trades/${t.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ favorite: !t.favorite }),
    });
    if (res.status === 401) {
      alert("Log in to change favorites.");
      mutate();
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this trade?")) return;
    const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
    if (res.status === 401) { alert("Log in to delete."); return; }
    mutate();
  }

  async function login() {
    const password = prompt("Enter the EDIT password to unlock changes:");
    if (!password) return;
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      alert("Wrong password.");
      return;
    }
    const j = (await res.json()) as { canEdit?: boolean };
    if (j.canEdit) {
      setAuthed(true);
      mutate();
    } else {
      alert("That's the view-only password — editing stays locked.");
    }
  }

  const th = (key: SortKey, label: string, right = false) => (
    <th
      onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : true }))}
      className={`px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-semibold cursor-pointer select-none hover:text-foreground ${right ? "text-right" : "text-left"}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sort.key === key ? (sort.desc ? "▼" : "▲") : ""}
      </span>
    </th>
  );

  const updated = data?.fetchedAt ? new Date(data.fetchedAt) : null;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight glow-text">Trades</h1>
          <p className="text-sm text-muted mt-1">
            {updated
              ? `Prices as of ${updated.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
              : "Loading…"}
            {isValidating ? " · refreshing…" : ""}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={refreshPrices} disabled={refreshing} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50">
            {refreshing ? "Refreshing…" : "↻ Refresh prices"}
          </button>
          {authed ? (
            <>
              <button onClick={autoMap} disabled={mapping} className="rounded-lg border border-blue/50 px-3 py-1.5 text-sm text-blue-bright hover:bg-blue/10 disabled:opacity-50" title="Attach unmapped trades to live markets">
                {mapping ? "Mapping…" : "🔗 Auto-map"}
              </button>
              <button onClick={() => setEditing(undefined)} className="rounded-lg bg-blue-dim/30 glow-edge px-3 py-1.5 text-sm font-medium hover:bg-blue-dim/50">
                + Add trade
              </button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 border border-border px-2.5 py-1.5 text-sm text-muted" title="You're viewing with the read-only password">
                👁 View-only
              </span>
              <button onClick={login} className="rounded-lg border border-blue/50 px-3 py-1.5 text-sm text-blue-bright hover:bg-blue/10">
                🔒 Unlock editing
              </button>
            </>
          )}
        </div>
      </div>

      {mapMsg && (
        <div className="rounded-lg glow-edge-soft bg-surface px-3 py-2 text-sm text-blue-bright flex items-center justify-between">
          <span>🔗 {mapMsg}</span>
          <button onClick={() => setMapMsg(null)} className="text-muted hover:text-foreground">×</button>
        </div>
      )}

      {/* Settled money — prominent */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          big
          label="Realized P/L (settled)"
          value={usd(record.realizedPL)}
          tone={record.realizedPL >= 0 ? "win" : "loss"}
          sub={`${record.won} won · ${record.lost} lost · click to break down`}
          onClick={() => setStatus(status === "settled" ? "all" : "settled")}
        />
        <Stat
          big
          label="Live P/L (unrealized)"
          value={usd(sums.totalLiveUnrealizedPL)}
          tone={sums.totalLiveUnrealizedPL >= 0 ? "win" : "loss"}
          sub={sums.totalLiveValue ? `position value ${usd(sums.totalLiveValue)}` : "no live prices yet"}
        />
        <Stat
          label="Record"
          value={
            <span className="text-2xl">
              <span className="text-win">{record.won}W</span>{" · "}
              <span className="text-foreground">{record.open}O</span>{" · "}
              <span className="text-loss">{record.lost}L</span>
            </span>
          }
          sub={`${record.count} positions · ${sums.count} shown`}
        />
      </div>

      {/* Projections + fees */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat
          label="Cost → Payout (if all win)"
          value={`${usd(sums.totalCost)} → ${usd(sums.totalPayout)}`}
          sub={`${sums.open} open · projected profit ${usd(sums.totalProjectedProfit)}`}
        />
        <Stat label="Projected profit" value={usd(sums.totalProjectedProfit)} tone="win" />
        <Stat
          label="Est. fees paid"
          value={usd(feesTotal)}
          tone="loss"
          sub={`${usd(commission)} commission + ${usd(exchange)} exchange`}
        />
      </div>

      {/* Fees explainer */}
      <details className="rounded-xl glow-edge-soft bg-surface text-sm">
        <summary className="px-4 py-3 cursor-pointer text-muted hover:text-foreground">
          <span className="text-blue-bright">ⓘ</span> How Robinhood event-contract fees work (and this estimate)
        </summary>
        <div className="px-4 pb-4 pt-0 text-muted space-y-2 leading-relaxed">
          <p>
            <span className="text-foreground">Commission</span> ({usd(commission)}): since June 1, 2026
            Robinhood charges a probability-weighted commission per side —
            <span className="text-foreground"> 5% × price × (1 − price) × contracts</span>, rounded up
            to the cent (the 5% Gold rate, applied here). It&apos;s highest near 50¢ and tiny near
            1¢/99¢.
          </p>
          <p>
            <span className="text-foreground">Exchange fee</span> ({usd(exchange)}): a separate
            ~<span className="text-foreground">$0.02 per contract</span>, per side, charged by the
            exchange (Rothera/Kalshi).
          </p>
          <p>
            Both count the <span className="text-foreground">entry side</span> of each position
            (total <span className="text-foreground">{usd(feesTotal)}</span>). If you sold before a
            game settled you&apos;d pay a second exit-side set too, so treat this as a floor.
          </p>
        </div>
      </details>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Seg value={bucket} set={setBucket} opts={[["current", "Current"], ["potential", "Potential"], ["all", "All"]]} />
        <Seg value={fav} set={setFav} opts={[["all", "All"], ["favorites", `★ Favorites${favCount ? ` (${favCount})` : ""}`]]} />
        <Seg value={side} set={setSide} opts={[["all", "For + Against"], ["for", "Bet for"], ["against", "Bet against"]]} />
        <Seg value={status} set={setStatus} opts={[["all", "All status"], ["open", "Open"], ["settled", "Settled"], ["won", "Won"], ["lost", "Lost"]]} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-blue/60" />
        <span className="ml-auto text-xs text-muted">{filtered.length} shown</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl glow-edge-soft bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-2 py-2.5 w-8" />
              {th("label", "Position")}
              {th("side", "Side")}
              {th("category", "Type")}
              {th("shares", "Shares", true)}
              {th("buyPrice", "Buy", true)}
              {th("cost", "Cost", true)}
              {th("weight", "Weight", true)}
              {th("livePrice", "Live", true)}
              {th("projectedProfit", "Proj. profit", true)}
              {th("margin", "Margin", true)}
              {th("liveUnrealizedPL", "Live P/L", true)}
              {th("realizedPL", "Realized", true)}
              {th("myProbability", "My %", true)}
              {th("kickoffAt", "Resolves")}
              {th("status", "Status")}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const closed = t.status === "won" || t.status === "lost";
              return (
              <tr key={t.id} className={`border-b border-border/50 hover:bg-surface-2/60 transition-colors ${t.favorite ? "bg-de-gold/[0.04]" : ""}`}>
                <td className="px-2 py-2.5 text-center">
                  {authed ? (
                    <button
                      onClick={() => toggleFav(t)}
                      title={t.favorite ? "Unfavorite" : "Add to favorites"}
                      className={`text-base leading-none transition-colors ${t.favorite ? "text-de-gold" : "text-muted/40 hover:text-de-gold"}`}
                    >
                      {t.favorite ? "★" : "☆"}
                    </button>
                  ) : (
                    <span className={`text-base leading-none ${t.favorite ? "text-de-gold" : "text-transparent"}`}>★</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Flag code={t.teamCode} name={t.teamName} size={22} />
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5">
                        {t.teamName ?? t.label}
                        {t.isFirstHalf && <span className={badge("bg-de-gold/15 text-de-gold")}>1st half</span>}
                      </div>
                      <div className="text-xs text-muted truncate">{t.match ?? t.label}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className={badge(t.side === "for" ? "bg-win/15 text-win" : "bg-loss/15 text-loss")}>
                    {t.side === "for" ? "FOR" : "AGAINST"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted capitalize">{t.category.replace(/_/g, " ")}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{t.shares.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{cents(t.buyPrice)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{t.cost > 0 ? usd(t.cost) : "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted">
                  {!closed && t.cost > 0 && sums.totalCost > 0 ? `${((t.cost / sums.totalCost) * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{closed ? "—" : cents(t.livePrice)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-win">{closed ? "—" : usd(t.projectedProfit)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-de-gold">
                  {!closed && t.cost > 0 ? `${Math.round((t.projectedProfit / t.cost) * 100)}%` : "—"}
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${t.liveUnrealizedPL == null ? "text-muted" : t.liveUnrealizedPL >= 0 ? "text-win" : "text-loss"}`}>
                  {usd(t.liveUnrealizedPL)}
                </td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${t.realizedPL == null ? "text-muted" : t.realizedPL >= 0 ? "text-win" : "text-loss"}`}>
                  {usd(t.realizedPL)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{t.myProbability == null ? "—" : `${t.myProbability}%`}</td>
                <td className="px-3 py-2.5 text-xs text-muted whitespace-nowrap">{fmtKickoff(t.kickoffAt)}</td>
                <td className="px-3 py-2.5">
                  <span className={badge(
                    t.status === "won" ? "bg-win/15 text-win" : t.status === "lost" ? "bg-loss/15 text-loss" : "bg-surface-2 text-muted",
                  )}>
                    {t.status}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  {authed ? (
                    <>
                      <button onClick={() => setEditing(t)} className="text-muted hover:text-blue-bright px-1.5" title="Edit">✎</button>
                      <button onClick={() => remove(t.id)} className="text-muted hover:text-loss px-1.5" title="Delete">🗑</button>
                    </>
                  ) : (
                    <span className="text-muted/30 px-1.5">—</span>
                  )}
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={17} className="px-3 py-10 text-center text-muted">No trades match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        <b className="text-foreground">Cost</b> = shares × buy price (what you put in). {" "}
        <b className="text-foreground">Weight</b> = this trade&apos;s share of total cost shown. {" "}
        <b className="text-foreground">Margin</b> = return on cost if it wins (profit ÷ cost). {" "}
        Live prices come from Kalshi + Polymarket and auto-refresh every 15 min; live P/L shows once a
        trade is mapped to a market (edit it to set one). Buy-ins are editable.
      </p>

      <TradeEditModal trade={editing} onClose={() => setEditing(null)} onSaved={() => mutate()} />
    </div>
  );
}

function Seg<T extends string>({
  value, set, opts,
}: {
  value: T;
  set: (v: T) => void;
  opts: [T, string][];
}) {
  return (
    <div className="inline-flex rounded-lg bg-surface border border-border p-0.5">
      {opts.map(([v, label]) => (
        <button
          key={v}
          onClick={() => set(v)}
          className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
            value === v ? "bg-surface-2 text-foreground glow-edge-soft" : "text-muted hover:text-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
