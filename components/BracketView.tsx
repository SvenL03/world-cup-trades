"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Flag } from "./Flag";
import { formatET } from "@/lib/datetime";
import type { Bracket, BracketMatch, BracketRound, BracketSlot, TeamRow } from "@/lib/types";

type Conn = { src: string; dst: string; kind: "group" | "tree"; group?: string };
type Line = { d: string; kind: Conn["kind"]; src: string; dst: string; group?: string };
type Selected = { kind: "group"; id: string } | { kind: "match"; id: number } | null;

const groupLetter = (g: string) => g.replace("Group ", "");

/** Match number referenced by a "match:N" or "slot:N:side" key. */
function keyNum(k: string): number {
  const p = k.split(":");
  return Number(p[1]);
}

function sourceOf(slot: BracketSlot): { letter: string; rank: number } | null {
  const m = slot.label.match(/^([12])([A-L])$/);
  if (m) return { letter: m[2], rank: Number(m[1]) };
  if (/^3/.test(slot.label) && slot.team) return { letter: groupLetter(slot.team.group), rank: 3 };
  if (slot.team) return { letter: groupLetter(slot.team.group), rank: slot.team.groupRank };
  return null;
}

function originBadge(label: string): string | null {
  const m = label.match(/^([123])([A-L])?/);
  if (!m) return null;
  if (m[1] === "3") return "3rd";
  return `${m[1] === "1" ? "1st" : "2nd"}${m[2] ?? ""}`;
}

export function BracketView({
  bracket,
  groups,
}: {
  bracket: Bracket;
  groups: { group: string; teams: TeamRow[] }[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<Selected>(null);

  const reg = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el);
      else nodes.current.delete(key);
    },
    [],
  );

  const treeRounds = bracket.rounds.filter((r) => r.round !== "Match for third place");
  const thirdPlace = bracket.rounds.find((r) => r.round === "Match for third place");

  // Connections: group → R32 slot, and each feeder match → its parent match.
  const connections: Conn[] = [];
  const matchByNum = new Map<number, BracketMatch>();
  const r32 = bracket.rounds.find((r) => r.round === "Round of 32")?.matches ?? [];
  const qualifyingThirds = new Set<string>();
  for (const m of r32) {
    for (const [side, slot] of [["home", m.home], ["away", m.away]] as const) {
      const s = sourceOf(slot);
      if (!s) continue;
      if (s.rank === 3 && slot.team) qualifyingThirds.add(slot.team.name);
      connections.push({ src: `pos:${s.letter}:${s.rank}`, dst: `slot:${m.num}:${side}`, kind: "group", group: s.letter });
    }
  }
  for (const r of bracket.rounds)
    for (const m of r.matches) {
      matchByNum.set(m.num, m);
      for (const f of m.feeders)
        connections.push({ src: `match:${f}`, dst: `match:${m.num}`, kind: "tree" });
    }
  const groupConnByDst = new Map<string, Conn>();
  for (const c of connections) if (c.kind === "group") groupConnByDst.set(c.dst, c);

  // ---- Highlight sets based on the current selection ----
  const litLines = new Set<string>(); // `${src}|${dst}`
  const litSlots = new Set<string>(); // `slot:N:side`
  const litMatches = new Set<number>();
  const litLetters = new Set<string>();

  // Trace ONE team's single path back from match `num` to its group position.
  const traceTeam = (num: number, team: TeamRow | null) => {
    if (!team) return;
    const m = matchByNum.get(num);
    if (!m) return;
    litMatches.add(num);
    const side = m.home.team === team ? "home" : m.away.team === team ? "away" : null;
    if (!side) return;
    litSlots.add(`slot:${num}:${side}`);
    if (m.feeders.length === 0) {
      // Round of 32 — connect back to the group position that supplied it.
      const gc = groupConnByDst.get(`slot:${num}:${side}`);
      if (gc) {
        litLines.add(`${gc.src}|${gc.dst}`);
        litSlots.add(gc.dst);
        if (gc.group) litLetters.add(gc.group);
      }
      return;
    }
    // The feeder this team actually played in (winner-feeders, or loser for 3rd place).
    const f = m.feeders.find((fn) => {
      const fm = matchByNum.get(fn);
      return fm && (fm.home.team === team || fm.away.team === team);
    });
    if (f != null) {
      litLines.add(`match:${f}|match:${num}`);
      traceTeam(f, team);
    }
  };

  if (selected?.kind === "group") {
    litLetters.add(selected.id);
    for (const c of connections)
      if (c.kind === "group" && c.group === selected.id) {
        litLines.add(`${c.src}|${c.dst}`);
        litSlots.add(c.dst);
        litMatches.add(keyNum(c.dst));
      }
  } else if (selected?.kind === "match") {
    // Trace exactly the two teams in this match, each as one continuous path.
    const m = matchByNum.get(selected.id);
    if (m) {
      traceTeam(m.num, m.home.team);
      traceTeam(m.num, m.away.team);
    }
  }

  const recompute = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    setSize({ w: c.scrollWidth, h: c.scrollHeight });
    const out: Line[] = [];
    for (const conn of connections) {
      const s = nodes.current.get(conn.src);
      const d = nodes.current.get(conn.dst);
      if (!s || !d) continue;
      const sr = s.getBoundingClientRect();
      const dr = d.getBoundingClientRect();
      const x1 = sr.right - cr.left;
      const y1 = sr.top - cr.top + sr.height / 2;
      const x2 = dr.left - cr.left;
      const y2 = dr.top - cr.top + dr.height / 2;
      if (x2 < x1) continue;
      const dx = Math.max(24, (x2 - x1) / 2);
      out.push({
        d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
        kind: conn.kind,
        src: conn.src,
        dst: conn.dst,
        group: conn.group,
      });
    }
    setLines(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket]);

  useLayoutEffect(() => {
    recompute();
    const t = setTimeout(recompute, 400);
    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  const active = !!selected;
  const selectMatch = (num: number) =>
    setSelected(selected?.kind === "match" && selected.id === num ? null : { kind: "match", id: num });

  return (
    <div className="space-y-4">
      <div className="rounded-xl glow-edge-soft bg-surface px-4 py-3 text-sm text-muted">
        Projected from current standings, in <span className="text-foreground">Eastern Time</span>.
        Grey lines trace how each group&apos;s top two and the eight best third-placed teams flow into
        the bracket. <span className="text-blue-bright">Click a group</span> to light up where it goes,
        or <span className="text-blue-bright">click any match</span> to chart every path leading into it
        (click the Final to see them all). Real scores show as games are played.
        {selected && (
          <button onClick={() => setSelected(null)} className="ml-2 underline text-muted hover:text-foreground">
            clear
          </button>
        )}
      </div>

      <div className="overflow-x-auto pb-4">
        <div ref={containerRef} className="relative flex gap-6 items-stretch min-w-max min-h-[760px]">
          <svg className="absolute inset-0 pointer-events-none z-0" width={size.w} height={size.h}>
            {(active
              ? [...lines].sort((a, b) =>
                  (litLines.has(`${a.src}|${a.dst}`) ? 1 : 0) - (litLines.has(`${b.src}|${b.dst}`) ? 1 : 0),
                )
              : lines
            ).map((l, i) => {
              const lit = litLines.has(`${l.src}|${l.dst}`);
              const stroke = lit
                ? "#5ec2ff"
                : active
                  ? "rgba(170,182,205,0.06)"
                  : l.kind === "group"
                    ? "rgba(170,182,205,0.22)"
                    : "rgba(120,170,235,0.30)";
              return <path key={i} d={l.d} fill="none" stroke={stroke} strokeWidth={lit ? 2.2 : 1.25} />;
            })}
          </svg>

          {/* Group stage */}
          <div className="relative z-10 flex flex-col gap-2 w-[178px]">
            <div className="text-xs uppercase tracking-wider text-blue-bright font-semibold">Group stage</div>
            {groups.map((g) => {
              const letter = groupLetter(g.group);
              const lit = litLetters.has(letter);
              return (
                <div
                  key={g.group}
                  onClick={() =>
                    setSelected(selected?.kind === "group" && selected.id === letter ? null : { kind: "group", id: letter })
                  }
                  className={`rounded-lg bg-surface border overflow-hidden cursor-pointer transition ${
                    lit ? "border-blue-bright glow-edge" : "border-border hover:border-blue/40"
                  }`}
                >
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted border-b border-border/60 flex items-center justify-between">
                    <span>Group {letter}</span>
                    <span className="text-blue-bright/70 text-[9px]">
                      {selected?.kind === "group" && selected.id === letter ? "● tracing" : "tap"}
                    </span>
                  </div>
                  {g.teams.map((t) => {
                    const rank = t.groupRank;
                    const qualifies = rank <= 2 || (rank === 3 && qualifyingThirds.has(t.name));
                    return (
                      <div
                        key={t.name}
                        ref={reg(`pos:${letter}:${rank}`)}
                        className={`flex items-center gap-1.5 px-2 py-1 text-xs ${qualifies ? "" : "opacity-40"}`}
                      >
                        <span
                          className={`w-3.5 text-[10px] tabular-nums ${
                            rank <= 2 ? "text-win" : rank === 3 && qualifies ? "text-de-gold" : "text-muted"
                          }`}
                        >
                          {rank}
                        </span>
                        <Flag code={t.code} name={t.name} size={15} />
                        <span className="truncate flex-1">{t.name}</span>
                        {rank === 3 && (
                          <span className={`text-[8px] uppercase ${qualifies ? "text-de-gold" : "text-muted/70"}`}>
                            {qualifies ? "▸R32" : "out"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* extra room so the group → R32 flow lines are readable */}
          <div className="w-24 shrink-0" aria-hidden />

          {/* Knockout columns (with the 3rd-place game tucked between the two semis) */}
          {treeRounds.flatMap((r) => {
            const col = (
              <div key={r.round} className="relative z-10 flex flex-col">
                <div className="text-xs uppercase tracking-wider text-blue-bright font-semibold mb-2">
                  {r.round}
                  <span className="text-muted font-normal"> · {r.matches.length}</span>
                </div>
                <div className="flex flex-col justify-around flex-1 gap-3">
                  {r.matches.map((m) => (
                    <MatchCard
                      key={m.num}
                      m={m}
                      round={r.round}
                      reg={reg}
                      litSlots={litSlots}
                      lit={litMatches.has(m.num)}
                      onSelect={() => selectMatch(m.num)}
                    />
                  ))}
                </div>
              </div>
            );
            if (r.round === "Semi-final" && thirdPlace) {
              return [
                col,
                <div key="third" className="relative z-10 flex flex-col">
                  <div className="text-xs uppercase tracking-wider text-de-gold font-semibold mb-2">
                    3rd place
                  </div>
                  <div className="flex flex-col justify-center flex-1">
                    {thirdPlace.matches.map((m) => (
                      <MatchCard
                        key={m.num}
                        m={m}
                        round={m.round}
                        reg={reg}
                        litSlots={litSlots}
                        lit={litMatches.has(m.num)}
                        onSelect={() => selectMatch(m.num)}
                      />
                    ))}
                  </div>
                </div>,
              ];
            }
            return [col];
          })}
        </div>
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  side,
  num,
  winner,
  showOrigin,
  reg,
  litSlots,
  goals,
}: {
  slot: BracketSlot;
  side: "home" | "away";
  num: number;
  winner: boolean;
  showOrigin: boolean;
  reg: (k: string) => (el: HTMLElement | null) => void;
  litSlots?: Set<string>;
  goals: number | null;
}) {
  const t = slot.team;
  const origin = showOrigin ? originBadge(slot.label) : null;
  const lit = litSlots?.has(`slot:${num}:${side}`);
  return (
    <div
      ref={reg(`slot:${num}:${side}`)}
      className={`flex items-center gap-2 px-2 py-1.5 ${winner ? "bg-win/[0.09]" : ""} ${
        lit ? "bg-blue/15 ring-1 ring-blue-bright/60" : ""
      }`}
    >
      {t ? (
        <>
          <Flag code={t.code} name={t.name} size={18} />
          <span className={`text-sm truncate ${winner ? "font-semibold text-foreground" : "text-muted"}`}>
            {t.name}
          </span>
          {origin && (
            <span className="text-[9px] uppercase tracking-wide rounded bg-surface-2 border border-border px-1 py-px text-muted/70">
              {origin}
            </span>
          )}
          {goals != null ? (
            <span className={`ml-auto pl-1 tabular-nums font-bold ${winner ? "text-foreground" : "text-muted"}`}>
              {goals}
            </span>
          ) : (
            <span className="ml-auto pl-1 text-[10px] text-muted tabular-nums">#{t.overallRank}</span>
          )}
        </>
      ) : (
        <span className="text-sm text-muted/60 italic">{slot.label}</span>
      )}
    </div>
  );
}

function MatchCard({
  m,
  round,
  reg,
  litSlots,
  lit,
  onSelect,
}: {
  m: BracketMatch;
  round: BracketRound;
  reg: (k: string) => (el: HTMLElement | null) => void;
  litSlots?: Set<string>;
  lit?: boolean;
  onSelect?: () => void;
}) {
  const homeWins = !!(m.winner?.team && m.winner.team === m.home.team);
  const awayWins = !!(m.winner?.team && m.winner.team === m.away.team);
  const showOrigin = round === "Round of 32";
  return (
    <div
      ref={reg(`match:${m.num}`)}
      onClick={onSelect}
      className={`rounded-lg bg-surface border overflow-hidden w-[210px] divide-y divide-border/60 shrink-0 cursor-pointer transition ${
        lit ? "border-blue-bright glow-edge" : "border-border hover:border-blue/40"
      }`}
    >
      <SlotRow slot={m.home} side="home" num={m.num} winner={homeWins} showOrigin={showOrigin} reg={reg} litSlots={litSlots} goals={m.score ? m.score[0] : null} />
      <SlotRow slot={m.away} side="away" num={m.num} winner={awayWins} showOrigin={showOrigin} reg={reg} litSlots={litSlots} goals={m.score ? m.score[1] : null} />
      <div className="px-2 py-1 text-[10px] text-muted/70 flex items-center justify-between">
        <span>{formatET(m.date, m.time)}</span>
        <span className={m.decided ? "text-win" : ""}>{m.decided ? "final" : "projected"}</span>
      </div>
    </div>
  );
}
