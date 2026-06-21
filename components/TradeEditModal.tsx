"use client";

import { useEffect, useState } from "react";
import type {
  Side,
  TradeCategory,
  TradeStatus,
  TradeType,
  TradeWithPL,
} from "@/lib/types";

const CATEGORIES: TradeCategory[] = [
  "match",
  "group_winner",
  "tournament_winner",
  "first_half",
  "total_goals",
];

export interface TradeForm {
  label: string;
  teamCode: string;
  teamName: string;
  match: string;
  side: Side;
  category: TradeCategory;
  isFirstHalf: boolean;
  favorite: boolean;
  shares: number;
  buyPrice: number;
  realizedPnl: number | null;
  status: TradeStatus;
  tradeType: TradeType;
  myProbability: number | null;
  marketTicker: string;
  kickoffAt: string;
  notes: string;
}

/** Normalize a stored kickoff value to the datetime-local input format (YYYY-MM-DDTHH:mm). */
function toLocalInput(v: string): string {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${v}T00:00`; // date only
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return v.slice(0, 16);
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fromTrade(t?: TradeWithPL | null): TradeForm {
  return {
    label: t?.label ?? "",
    teamCode: t?.teamCode ?? "",
    teamName: t?.teamName ?? "",
    match: t?.match ?? "",
    side: t?.side ?? "for",
    category: t?.category ?? "match",
    isFirstHalf: t?.isFirstHalf ?? false,
    favorite: t?.favorite ?? false,
    shares: t?.shares ?? 0,
    buyPrice: t?.buyPrice ?? 0,
    realizedPnl: t?.realizedPnl ?? null,
    status: t?.status ?? "open",
    tradeType: t?.tradeType ?? "current",
    myProbability: t?.myProbability ?? null,
    marketTicker: t?.marketTicker ?? "",
    kickoffAt: t?.kickoffAt ?? "",
    notes: t?.notes ?? "",
  };
}

const field =
  "w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue/60";
const lbl = "text-[11px] uppercase tracking-wider text-muted mb-1 block";

export function TradeEditModal({
  trade,
  onClose,
  onSaved,
}: {
  trade: TradeWithPL | null | undefined; // null = closed, undefined = new
  onClose: () => void;
  onSaved: () => void;
}) {
  const isOpen = trade !== null;
  const isNew = trade === undefined;
  const [form, setForm] = useState<TradeForm>(fromTrade(trade));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) setForm(fromTrade(trade));
  }, [trade, isOpen]);

  if (!isOpen) return null;

  const set = <K extends keyof TradeForm>(k: K, v: TradeForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    setErr(null);
    const payload = {
      ...form,
      teamCode: form.teamCode || null,
      teamName: form.teamName || null,
      match: form.match || null,
      marketTicker: form.marketTicker || null,
      marketSource: form.marketTicker ? "kalshi" : "manual",
      kickoffAt: form.kickoffAt || null,
      notes: form.notes || null,
      isFirstHalf: form.category === "first_half" || form.isFirstHalf,
      // Override only applies to settled trades.
      realizedPnl: form.status === "open" ? null : form.realizedPnl,
    };
    const res = await fetch(
      isNew ? "/api/trades" : `/api/trades/${trade!.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setSaving(false);
    if (res.status === 401) {
      setErr("Log in (top right) to save changes.");
      return;
    }
    if (!res.ok) {
      setErr("Save failed.");
      return;
    }
    onSaved();
    onClose();
  }

  const cost = form.shares * form.buyPrice;
  const profit = form.shares * 1 - cost;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-surface glow-edge p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold glow-text">
            {isNew ? "Add trade" : "Edit trade"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl leading-none">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={lbl}>Label</label>
            <input className={field} value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="GER · Ecuador vs Germany" />
          </div>
          <div>
            <label className={lbl}>Team name</label>
            <input className={field} value={form.teamName} onChange={(e) => set("teamName", e.target.value)} placeholder="Germany" />
          </div>
          <div>
            <label className={lbl}>Flag code (ISO2)</label>
            <input className={field} value={form.teamCode} onChange={(e) => set("teamCode", e.target.value)} placeholder="de" />
          </div>
          <div className="col-span-2">
            <label className={lbl}>Match</label>
            <input className={field} value={form.match} onChange={(e) => set("match", e.target.value)} placeholder="Ecuador vs Germany" />
          </div>

          <div>
            <label className={lbl}>Side</label>
            <select className={field} value={form.side} onChange={(e) => set("side", e.target.value as Side)}>
              <option value="for">Bet FOR</option>
              <option value="against">Bet AGAINST</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Category</label>
            <select className={field} value={form.category} onChange={(e) => set("category", e.target.value as TradeCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={lbl}>Shares</label>
            <input type="number" className={field} value={form.shares} onChange={(e) => set("shares", Number(e.target.value))} />
          </div>
          <div>
            <label className={lbl}>Buy price ($, 0–1)</label>
            <input type="number" step="0.01" min="0" max="1" className={field} value={form.buyPrice} onChange={(e) => set("buyPrice", Number(e.target.value))} />
          </div>

          <div>
            <label className={lbl}>My probability (%)</label>
            <input type="number" min="0" max="100" className={field} value={form.myProbability ?? ""} onChange={(e) => set("myProbability", e.target.value === "" ? null : Number(e.target.value))} placeholder="—" />
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select className={field} value={form.status} onChange={(e) => set("status", e.target.value as TradeStatus)}>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {form.status !== "open" && (
            <div className="col-span-2 rounded-lg border border-de-gold/30 bg-de-gold/[0.04] p-3">
              <label className={lbl}>Actual P/L ($) — override</label>
              <input
                type="number"
                step="0.01"
                className={field}
                value={form.realizedPnl ?? ""}
                onChange={(e) => set("realizedPnl", e.target.value === "" ? null : Number(e.target.value))}
                placeholder={
                  form.status === "won"
                    ? `default +${(form.shares * (1 - form.buyPrice)).toFixed(2)}`
                    : `default -${(form.shares * form.buyPrice).toFixed(2)}`
                }
              />
              <p className="text-[11px] text-muted mt-1">
                Net dollars you actually made/lost on this game (use this if you bought &amp; sold at
                multiple prices). Leave blank to use the default settlement shown.
              </p>
            </div>
          )}

          <div>
            <label className={lbl}>Bucket</label>
            <select className={field} value={form.tradeType} onChange={(e) => set("tradeType", e.target.value as TradeType)}>
              <option value="current">Current</option>
              <option value="potential">Potential</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Match date & time (resolves)</label>
            <input
              type="datetime-local"
              className={field}
              value={toLocalInput(form.kickoffAt)}
              onChange={(e) => set("kickoffAt", e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className={lbl}>Market ticker (live price link)</label>
            <input className={field} value={form.marketTicker} onChange={(e) => set("marketTicker", e.target.value)} placeholder="kx:… or pm:… (optional)" />
          </div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.favorite}
                onChange={(e) => set("favorite", e.target.checked)}
                className="accent-de-gold w-4 h-4"
              />
              <span className="text-de-gold">★ Favorite</span>
              <span className="text-muted text-xs">— pin to your watchlist</span>
            </label>
          </div>
          <div className="col-span-2">
            <label className={lbl}>Notes</label>
            <textarea className={field} rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted">
            Cost <b className="text-foreground tabular-nums">${cost.toFixed(2)}</b> · Projected profit{" "}
            <b className="text-win tabular-nums">${profit.toFixed(2)}</b>
          </span>
        </div>

        {err && <p className="text-loss text-sm mt-2">{err}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving} className="flex-1 rounded-lg bg-blue-dim/30 glow-edge text-foreground py-2 text-sm font-medium hover:bg-blue-dim/50 disabled:opacity-50">
            {saving ? "Saving…" : isNew ? "Add trade" : "Save changes"}
          </button>
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
