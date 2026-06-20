"use client";

import { useState } from "react";
import { RankingsTable } from "./RankingsTable";
import { BracketView } from "./BracketView";
import { ColumnLegend } from "./ColumnLegend";
import type { Bracket, TeamRow } from "@/lib/types";

export function RankingsView({
  teams,
  bracket,
}: {
  teams: TeamRow[];
  bracket: Bracket;
}) {
  const [tab, setTab] = useState<"standings" | "bracket">("standings");

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg bg-surface border border-border p-0.5">
        {(["standings", "bracket"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm capitalize transition-colors ${
              tab === t
                ? "bg-surface-2 text-foreground glow-edge-soft"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t === "standings" ? "Standings" : "Bracket"}
          </button>
        ))}
      </div>

      {tab === "standings" ? (
        <div className="space-y-4">
          <RankingsTable data={teams} />
          <ColumnLegend />
        </div>
      ) : (
        <BracketView bracket={bracket} />
      )}
    </div>
  );
}
