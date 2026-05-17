"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface CronStatus {
  registered: boolean;
  email: { lastRun: string | null; runningAt: string | null; txCount: number; enabled: boolean };
  dedup: { lastRun: string | null };
  schedule: string;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 2)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ScheduledSettingsPage() {
  const router = useRouter();
  const [status,  setStatus]  = useState<CronStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<"all" | "email" | "dedup" | null>(null);
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async (): Promise<CronStatus | null> => {
    try {
      const res = await fetch("/api/cron/status");
      if (!res.ok) return null;
      const data = await res.json() as CronStatus;
      setStatus(data);
      return data;
    } catch { return null; }
  }, []);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }

  function startPolling() {
    stopPolling();
    let ticks = 0;
    pollRef.current = setInterval(async () => {
      if (++ticks > 72) { stopPolling(); return; } // 6 min max
      const data = await fetchStatus();
      if (data && !data.email.runningAt) {
        stopPolling();
      }
    }, 5000);
  }

  useEffect(() => {
    fetchStatus().then((data) => {
      setLoading(false);
      // If email is already running when page opens, start polling
      if (data?.email.runningAt) {
        const ageMs = Date.now() - new Date(data.email.runningAt).getTime();
        if (ageMs < 5 * 60 * 1000) startPolling();
      }
    });
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function trigger(job: "all" | "email" | "dedup") {
    if (triggering || isAnyRunning) return;
    setTriggering(job);
    setLastMsg(null);
    try {
      const res = await fetch(`/api/cron/run?job=${job}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setLastMsg(
          job === "email" ? "Email import started — running in background." :
          job === "dedup" ? "Duplicate check complete." :
          "Jobs started — email import running in background."
        );
        await fetchStatus();
        // Start polling if email is now running
        const s = await fetchStatus();
        if (s?.email.runningAt) startPolling();
      } else {
        setLastMsg(data.error ?? "Failed.");
      }
    } catch {
      setLastMsg("Network error — please try again.");
    } finally {
      setTriggering(null);
    }
  }

  const emailServerRunning = Boolean(
    status?.email.runningAt &&
    Date.now() - new Date(status.email.runningAt).getTime() < 5 * 60 * 1000
  );
  const isAnyRunning = !!triggering || emailServerRunning;

  const jobs = [
    {
      key:     "email" as const,
      icon:    "mark_email_read",
      label:   "Email Import",
      sub:     status?.email.enabled
                 ? `${status.email.txCount} total imported`
                 : "Disabled — configure filters in Email Import settings",
      lastRun: status?.email.lastRun ?? null,
      serverRunning: emailServerRunning,
      enabled: status?.email.enabled ?? false,
      color:   "var(--color-primary)",
      bg:      "var(--color-primary-fixed)",
    },
    {
      key:     "dedup" as const,
      icon:    "content_copy",
      label:   "Duplicate Detection",
      sub:     "Scans all transactions and flags duplicates",
      lastRun: status?.dedup.lastRun ?? null,
      serverRunning: false,
      enabled: true,
      color:   "#0277bd",
      bg:      "#e1f5fe",
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-5 pb-10">
      <div className="md:hidden sticky top-0 z-30 flex items-center pt-10 pb-3 gap-3"
        style={{ background: "var(--color-background)" }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "var(--color-surface-container)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-on-surface-variant)" }}>arrow_back</span>
        </button>
        <h1 className="font-semibold" style={{ fontSize: 20 }}>Scheduled Tasks</h1>
      </div>

      <div className="flex flex-col gap-5 pt-4">

        {/* Schedule banner */}
        <div className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "var(--color-primary-fixed)", border: "1px solid var(--color-outline-variant)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: 28, fontVariationSettings: "'FILL' 1" }}>schedule</span>
          <div className="flex-1">
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--color-primary)" }}>Daily at 12:00 PM IST</p>
            <p style={{ fontSize: 12, color: "var(--color-on-surface-variant)", marginTop: 2 }}>
              Email import runs first, then duplicate check — one after the other.
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${loading ? "opacity-50 bg-gray-400" : status?.registered ? "bg-green-500" : "bg-orange-400"}`} />
            <p style={{ fontSize: 10, color: "var(--color-on-surface-variant)", textAlign: "center" }}>
              {loading ? "…" : status?.registered ? "Active" : "Not\nregistered"}
            </p>
          </div>
        </div>

        {/* Not registered warning */}
        {!loading && !status?.registered && (
          <div className="rounded-2xl p-3 flex gap-3" style={{ background: "#fff8e1", border: "1px solid #ffe082" }}>
            <span className="material-symbols-outlined flex-shrink-0" style={{ color: "#f9a825", fontSize: 18, marginTop: 1 }}>warning</span>
            <p style={{ fontSize: 13, color: "#6d4c00" }}>
              Open any page in the app to register credentials for the scheduler automatically.
            </p>
          </div>
        )}

        {/* Result message */}
        {lastMsg && (
          <div className="rounded-2xl p-3 flex gap-3" style={{ background: "#e8f5e9", border: "1px solid #a5d6a7" }}>
            <span className="material-symbols-outlined flex-shrink-0" style={{ color: "#2e7d32", fontSize: 18 }}>check_circle</span>
            <p style={{ fontSize: 13, color: "#2e7d32", fontWeight: 500 }}>{lastMsg}</p>
          </div>
        )}

        {/* Job rows */}
        <div className="rounded-3xl overflow-hidden border" style={{ borderColor: "var(--color-outline-variant)", background: "var(--color-surface-container-lowest)" }}>
          {jobs.map((job, i) => {
            const isRunning = job.serverRunning || triggering === job.key || (triggering === "all");
            const disabled  = isAnyRunning || !job.enabled;

            return (
              <div key={job.key} className="flex items-center gap-4 px-5 py-4"
                style={{ borderBottom: i < jobs.length - 1 ? "1px solid var(--color-surface-variant)" : "none" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: job.bg }}>
                  {isRunning
                    ? <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: `${job.color}40`, borderTopColor: job.color }} />
                    : <span className="material-symbols-outlined" style={{ color: job.color, fontSize: 20 }}>{job.icon}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p style={{ fontSize: 15, fontWeight: 500, color: "var(--color-on-surface)" }}>{job.label}</p>
                    {isRunning && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: job.bg, color: job.color }}>Running…</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--color-on-surface-variant)" }} className="truncate">{job.sub}</p>
                  <p style={{ fontSize: 11, color: "var(--color-outline)", marginTop: 1 }}>
                    Last run: {relativeTime(job.lastRun)}
                  </p>
                </div>
                <button
                  onClick={() => trigger(job.key)}
                  disabled={disabled}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm flex-shrink-0"
                  style={{
                    background:  job.enabled ? job.bg : "var(--color-surface-container)",
                    color:       job.enabled ? job.color : "var(--color-outline)",
                    opacity:     disabled ? 0.4 : 1,
                    cursor:      disabled ? "not-allowed" : "pointer",
                  }}>
                  {isRunning
                    ? <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: `${job.color}40`, borderTopColor: job.color }} />
                    : <span className="material-symbols-outlined" style={{ fontSize: 15 }}>play_arrow</span>
                  }
                  {isRunning ? "Running" : "Run"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Run all */}
        <button
          onClick={() => trigger("all")}
          disabled={isAnyRunning}
          className="w-full py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2"
          style={{
            background: "var(--color-primary)",
            color:      "#fff",
            fontSize:   15,
            opacity:    isAnyRunning ? 0.4 : 1,
            cursor:     isAnyRunning ? "not-allowed" : "pointer",
          }}>
          {triggering === "all"
            ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#fff" }} />
            : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_circle</span>
          }
          {triggering === "all" ? "Running…" : emailServerRunning ? "Email running…" : "Run All Jobs Now"}
        </button>

      </div>
    </div>
  );
}
