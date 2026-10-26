"use client";

import { useEffect, useState } from "react";

/**
 * Dashboard — live countdown to the Tatkal window (T-0), with server clock
 * skew correction. This is the heart of the UI: the user arms a journey and
 * watches the milliseconds burn down.
 */
export default function Dashboard() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(id);
  }, []);

  // TODO: replace with a real armed journey's targetOpenAt from the API,
  // corrected by server clock skew measured at arm time.
  const targetOpenAt = new Date();
  targetOpenAt.setHours(10, 0, 0, 0);
  if (targetOpenAt.getTime() < Date.now()) targetOpenAt.setDate(targetOpenAt.getDate() + 1);

  const remaining = targetOpenAt.getTime() - (now ?? Date.now());
  const seconds = Math.floor(Math.abs(remaining) / 1000);
  const ms = Math.abs(remaining) % 1000;
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-slate-100">
      <h1 className="text-2xl font-semibold tracking-tight">
        🚄 TatkalPro — <span className="text-emerald-400">window opens in</span>
      </h1>
      <div className="font-mono text-6xl font-bold tabular-nums text-emerald-400" data-testid="countdown">
        {hh}:{mm}:{ss}.{String(ms).padStart(3, "0")}
      </div>
      <p className="max-w-md text-center text-sm text-slate-400">
        Pre-save your journey. The system logs in early, pre-warms connections,
        pre-computes the payload, and fires at T-0 − skew − jitter.
      </p>
      <div className="text-xs text-slate-500">API: {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}</div>
    </main>
  );
}
