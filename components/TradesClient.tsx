"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Flag } from "./Flag";
import { Stat } from "./GlowCard";
import { TradeEditModal } from "./TradeEditModal";
import { totals, usd, cents } from "@/lib/pl";
import type { TradeWithPL } from "@/lib/types";

const fetcher = (u: string) => fetch(u).then((r) => r.json());

type SortKey =
  | "label" | "side" | "category" | "shares" | "buyPrice" | "livePrice"
  | "projectedProfit" | "liveUnrealizedPL" | "myProbability" | "status"
  | "kickoffAt";

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
  authed: initialAuthed,
}: {
  initial: TradeWithPL[];
  authed: boolean;
}) {
  const { data, mutate, isValidating } = useSWR<{ trades: TradeWithPL[]; fetchedAt: string }>(
    "/api/trades",
    fetcher,
    { refreshInterval: 900_000, fallbackData: { trades: initial, fetchedAt: new Date().toISOString() } },
  );
  const trades = data?.trades ?? initial;

  const [authed, setAuthed] = useState(initialAuthed);
  const [bucket, setBucket] = useState<"current" | "potential" | "all">("current");
  const [fav, setFav] = useState<"all" | "favorites">("all");
  const [side, setSide] = useState<"all" | "for" | "against">("all");
  const [status, setStatus] = useState<"all" | "open" | "won" | "lost">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "projectedProfit", desc: true });
  const [editing, setEditing] = useState<TradeWithPL | null | undefined>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mapping, setMapping] = useState(false);
  const [mapMsg, setMapMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let rows = trades;
    if (bucket !== "all") rows = rows.filter((t) => t.tradeType === bucket);
    if (fav === "favorites") rows = rows.filter((t) => t.favorite);
    if (side !== "all") rows = rows.filter((t) => t.side === side);
    if (status !== "all") rows = rows.filter((t) => t.status === status);
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((t) =>
        [t.label, t.teamName, t.match, t.notes].some((v) => v?.toLowerCase().includes(s)),
      );
    }
    const dir = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [trades, bucket, fav, side, status, q, sort]);

  const sums = useMemo(() => totals(filtered), [filtered]);
  const favCount = useMemo(() => trades.filter((t) => t.favorite).length, [trades]);

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
    const password = prompt("Enter edit password:");
    if (!password) return;
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) setAuthed(true);
    else alert("Wrong password.");
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
            <button onClick={login} className="rounded-lg border border-blue/50 px-3 py-1.5 text-sm text-blue-bright hover:bg-blue/10">
              🔒 Log in to edit
            </button>
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
          value={usd(sums.realizedPL)}
          tone={sums.realizedPL >= 0 ? "win" : "loss"}
          sub={`${sums.won} won · ${sums.lost} lost`}
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
              <span className="text-win">{sums.won}W</span>{" · "}
              <span className="text-foreground">{sums.open}O</span>{" · "}
              <span className="text-loss">{sums.lost}L</span>
            </span>
          }
          sub={`${sums.count} positions shown`}
        />
      </div>

      {/* Projections */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="At risk (open cost)" value={usd(sums.totalCost)} />
        <Stat label="Payout if all win" value={usd(sums.totalPayout)} tone="gold" />
        <Stat label="Projected profit" value={usd(sums.totalProjectedProfit)} tone="win" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Seg value={bucket} set={setBucket} opts={[["current", "Current"], ["potential", "Potential"], ["all", "All"]]} />
        <Seg value={fav} set={setFav} opts={[["all", "All"], ["favorites", `★ Favorites${favCount ? ` (${favCount})` : ""}`]]} />
        <Seg value={side} set={setSide} opts={[["all", "For + Against"], ["for", "Bet for"], ["against", "Bet against"]]} />
        <Seg value={status} set={setStatus} opts={[["all", "All status"], ["open", "Open"], ["won", "Won"], ["lost", "Lost"]]} />
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
              {th("livePrice", "Live", true)}
              {th("projectedProfit", "Proj. profit", true)}
              {th("liveUnrealizedPL", "Live P/L", true)}
              {th("myProbability", "My %", true)}
              {th("kickoffAt", "Resolves")}
              {th("status", "Status")}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className={`border-b border-border/50 hover:bg-surface-2/60 transition-colors ${t.favorite ? "bg-de-gold/[0.04]" : ""}`}>
                <td className="px-2 py-2.5 text-center">
                  <button
                    onClick={() => toggleFav(t)}
                    title={t.favorite ? "Unfavorite" : "Add to favorites"}
                    className={`text-base leading-none transition-colors ${t.favorite ? "text-de-gold" : "text-muted/40 hover:text-de-gold"}`}
                  >
                    {t.favorite ? "★" : "☆"}
                  </button>
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
                <td className="px-3 py-2.5 text-right tabular-nums">{cents(t.livePrice)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-win">{usd(t.projectedProfit)}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums ${t.liveUnrealizedPL == null ? "text-muted" : t.liveUnrealizedPL >= 0 ? "text-win" : "text-loss"}`}>
                  {usd(t.liveUnrealizedPL)}
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
                  <button onClick={() => setEditing(t)} className="text-muted hover:text-blue-bright px-1.5" title="Edit">✎</button>
                  {authed && (
                    <button onClick={() => remove(t.id)} className="text-muted hover:text-loss px-1.5" title="Delete">🗑</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={13} className="px-3 py-10 text-center text-muted">No trades match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Live prices come from Kalshi + Polymarket and update every 15 min. A position shows live P/L
        only once it&apos;s mapped to a market ticker (edit a trade to set one). Buy-ins are editable.
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
