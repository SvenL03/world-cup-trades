import { getStandings } from "@/lib/standings";
import { buildBracket } from "@/lib/bracket";
import { RankingsView } from "@/components/RankingsView";
import { Stat } from "@/components/GlowCard";

export const revalidate = 600;

export default async function RankingsPage() {
  let data;
  let error: string | null = null;
  try {
    data = await getStandings();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight glow-text">
          Rankings
        </h1>
        <p className="text-sm text-muted mt-1">
          Live group standings, computed from match results · sortable &
          filterable.
        </p>
      </div>

      {error || !data ? (
        <div className="rounded-xl glow-edge-soft bg-surface p-6 text-sm text-loss">
          Could not load standings ({error ?? "unknown"}). The data source may be
          temporarily unavailable — try refreshing.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Teams" value={data.all.length} />
            <Stat
              label="Results (played)"
              value={
                data.matchesPlayed === 0 ? (
                  "—"
                ) : (
                  <span className="text-base">
                    <span className="text-win">{Math.round((data.results.homeWin / data.matchesPlayed) * 100)}% W</span>
                    {" · "}
                    <span className="text-de-gold">{Math.round((data.results.draw / data.matchesPlayed) * 100)}% D</span>
                    {" · "}
                    <span className="text-loss">{Math.round((data.results.awayWin / data.matchesPlayed) * 100)}% L</span>
                  </span>
                )
              }
              sub="home win · draw · away win"
            />
            <Stat label="Matches played" value={data.matchesPlayed} tone="gold" />
            <Stat
              label="Data updated"
              value={
                new Date(data.fetchedAt).toLocaleTimeString("en-US", {
                  timeZone: "America/New_York",
                  hour: "numeric",
                  minute: "2-digit",
                }) + " ET"
              }
              sub={new Date(data.fetchedAt).toLocaleDateString("en-US", {
                timeZone: "America/New_York",
                month: "short",
                day: "numeric",
              })}
            />
          </div>
          <RankingsView teams={data.all} groups={data.groups} bracket={buildBracket(data)} />
        </>
      )}
    </div>
  );
}
