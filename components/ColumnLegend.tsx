"use client";

import { useState } from "react";

const COLUMNS: { key: string; label: string; desc: string }[] = [
  { key: "#", label: "WC Rank", desc: "Current World Cup ranking across all teams, by the tiebreaker order below." },
  { key: "FIFA", label: "FIFA Ranking", desc: "Official FIFA ranking just before the tournament (used as the final tiebreaker)." },
  { key: "Grp", label: "Group", desc: "Which of the 12 groups (A–L) the team is in." },
  { key: "P", label: "Played", desc: "Matches played so far." },
  { key: "W", label: "Won", desc: "Matches won (worth 3 points each)." },
  { key: "D", label: "Drawn", desc: "Matches drawn (worth 1 point each)." },
  { key: "L", label: "Lost", desc: "Matches lost (0 points)." },
  { key: "GF", label: "Goals For", desc: "Goals scored." },
  { key: "GA", label: "Goals Against", desc: "Goals conceded." },
  { key: "GD", label: "Goal Difference", desc: "Goals For minus Goals Against." },
  { key: "Pts", label: "Points", desc: "3 × Won + 1 × Drawn. The primary ranking metric." },
  { key: "Win%", label: "Win Percentage", desc: "Share of played matches that were wins." },
  { key: "G/Gm", label: "Goals per Game", desc: "Average goals scored per match." },
  { key: "CS", label: "Clean Sheets", desc: "Matches where the team conceded zero goals." },
  { key: "Form", label: "Form", desc: "The team's last five results (most recent on the right)." },
];

const TIEBREAKERS = [
  "Points",
  "Goal Difference (GD)",
  "Goals For (GF)",
  "Wins (W)",
  "FIFA Ranking (final tiebreaker)",
];

export function ColumnLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl glow-edge-soft bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-surface-2/50 rounded-xl transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-blue-bright">ⓘ</span> What do the columns mean?
        </span>
        <span className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {COLUMNS.map((c) => (
              <div key={c.key} className="flex gap-3 text-sm">
                <span className="shrink-0 w-14 font-semibold text-blue-bright tabular-nums">
                  {c.key}
                </span>
                <span className="text-muted">
                  <span className="text-foreground">{c.label}</span> — {c.desc}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3">
            <div className="text-sm font-semibold mb-2">
              How current standing (#) is ranked
            </div>
            <p className="text-xs text-muted mb-2">
              Teams are ordered by each metric in turn; if two teams are equal,
              the next one breaks the tie.
            </p>
            <ol className="flex flex-wrap items-center gap-2 text-sm">
              {TIEBREAKERS.map((t, i) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 border border-border px-2.5 py-1">
                    <span className="text-blue-bright font-bold tabular-nums">{i + 1}</span>
                    {t}
                  </span>
                  {i < TIEBREAKERS.length - 1 && <span className="text-muted">→</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
