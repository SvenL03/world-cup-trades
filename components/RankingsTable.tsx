"use client";

import { useMemo, useState } from "react";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Flag } from "./Flag";
import type { TeamRow } from "@/lib/types";

function FormDots({ form }: { form: ("W" | "D" | "L")[] }) {
  return (
    <div className="flex gap-1">
      {form.length === 0 && <span className="text-muted text-xs">—</span>}
      {form.map((r, i) => (
        <span
          key={i}
          title={r}
          className={`inline-flex h-4 w-4 items-center justify-center rounded-[4px] text-[9px] font-bold ${
            r === "W"
              ? "bg-win/20 text-win"
              : r === "L"
                ? "bg-loss/20 text-loss"
                : "bg-de-gold/20 text-de-gold"
          }`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

const num = "tabular-nums text-right";

const columns: ColumnDef<TeamRow>[] = [
  {
    id: "team",
    header: "Team",
    accessorKey: "name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Flag code={row.original.code} name={row.original.name} size={22} />
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
    enableSorting: true,
  },
  { accessorKey: "group", header: "Grp", filterFn: "equalsString" },
  { accessorKey: "played", header: "P", meta: { num: true } },
  { accessorKey: "won", header: "W", meta: { num: true } },
  { accessorKey: "drawn", header: "D", meta: { num: true } },
  { accessorKey: "lost", header: "L", meta: { num: true } },
  { accessorKey: "goalsFor", header: "GF", meta: { num: true } },
  { accessorKey: "goalsAgainst", header: "GA", meta: { num: true } },
  {
    accessorKey: "goalDiff",
    header: "GD",
    meta: { num: true },
    cell: ({ getValue }) => {
      const v = getValue<number>();
      return (
        <span className={v > 0 ? "text-win" : v < 0 ? "text-loss" : ""}>
          {v > 0 ? `+${v}` : v}
        </span>
      );
    },
  },
  {
    accessorKey: "points",
    header: "Pts",
    meta: { num: true },
    cell: ({ getValue }) => (
      <span className="font-bold text-blue-bright">{getValue<number>()}</span>
    ),
  },
  { accessorKey: "winPct", header: "Win%", meta: { num: true }, cell: ({ getValue }) => `${getValue<number>()}%` },
  { accessorKey: "goalsPerGame", header: "G/Gm", meta: { num: true } },
  { accessorKey: "cleanSheets", header: "CS", meta: { num: true } },
  {
    accessorKey: "form",
    header: "Form",
    enableSorting: false,
    cell: ({ getValue }) => <FormDots form={getValue<("W" | "D" | "L")[]>()} />,
  },
];

export function RankingsTable({ data }: { data: TeamRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "points", desc: true },
  ]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [group, setGroup] = useState<string>("ALL");

  const groupOptions = useMemo(
    () => ["ALL", ...[...new Set(data.map((d) => d.group))].sort()],
    [data],
  );

  const filtered = useMemo(
    () => (group === "ALL" ? data : data.filter((d) => d.group === group)),
    [data, group],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search team…"
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:glow-edge"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {groupOptions.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                group === g
                  ? "bg-surface-2 text-foreground glow-edge-soft"
                  : "text-muted hover:text-foreground hover:bg-surface"
              }`}
            >
              {g === "ALL" ? "All groups" : g.replace("Group ", "")}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted">
          {table.getRowModel().rows.length} teams
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl glow-edge-soft bg-surface">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((h) => {
                  const meta = h.column.columnDef.meta as
                    | { num?: boolean }
                    | undefined;
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className={`px-3 py-2.5 text-[11px] uppercase tracking-wider text-muted font-semibold select-none ${
                        h.column.getCanSort() ? "cursor-pointer hover:text-foreground" : ""
                      } ${meta?.num ? "text-right" : "text-left"}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sorted === "asc" ? "▲" : sorted === "desc" ? "▼" : ""}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className={`border-b border-border/50 hover:bg-surface-2/60 transition-colors ${
                  i < 2 ? "bg-blue/[0.04]" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as
                    | { num?: boolean }
                    | undefined;
                  return (
                    <td
                      key={cell.id}
                      className={`px-3 py-2 ${meta?.num ? num : ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        Top two of each group (highlighted) advance. Click any column to sort.
      </p>
    </div>
  );
}
