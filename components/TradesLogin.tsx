"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TradesLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh(); // re-render the now-authed server page
    } else {
      setErr("Wrong password.");
      setPassword("");
    }
  }

  return (
    <div className="flex justify-center pt-20">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl bg-surface glow-edge p-6 space-y-4"
      >
        <div className="flex items-center gap-2.5">
          <span className="german-rail h-7 w-1.5 rounded-full" />
          <div>
            <h1 className="text-lg font-semibold glow-text">Trades · locked</h1>
            <p className="text-xs text-muted">Enter the password to view your positions.</p>
          </div>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue/60"
        />
        {err && <p className="text-loss text-sm">{err}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="w-full rounded-lg bg-blue-dim/30 glow-edge py-2 text-sm font-medium hover:bg-blue-dim/50 disabled:opacity-50"
        >
          {busy ? "Unlocking…" : "Unlock"}
        </button>
        <p className="text-[11px] text-muted text-center">
          Asked once per browser session.
        </p>
      </form>
    </div>
  );
}
