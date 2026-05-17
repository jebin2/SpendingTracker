"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = typeof window !== "undefined"
  ? `${window.location.origin}/api/shortcut`
  : "/api/shortcut";

export default function ShortcutSettingsPage() {
  const router = useRouter();
  const [token,     setToken]     = useState("");
  const [copied,    setCopied]    = useState<"token" | "url" | null>(null);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    fetch("/api/user/token").then((r) => r.json()).then((d) => setToken(d.token));
  }, []);

  async function rotateToken() {
    const res  = await fetch("/api/user/token", { method: "POST" });
    const data = await res.json();
    setToken(data.token);
  }

  function copy(value: string, key: "token" | "url") {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const masked = token ? `${token.slice(0, 8)}••••••••••••${token.slice(-4)}` : "Loading…";
  const apiUrl = typeof window !== "undefined" ? `${window.location.origin}/api/shortcut` : API_URL;

  const steps = [
    {
      n: 1,
      title: "Copy your token",
      body: "Tap the copy button below and keep it on your clipboard.",
      action: (
        <button onClick={() => copy(token, "token")} disabled={!token}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm"
          style={{ background: copied === "token" ? "#e8f5e9" : "var(--color-primary-fixed)", color: copied === "token" ? "#2e7d32" : "var(--color-primary)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied === "token" ? "check" : "content_copy"}</span>
          {copied === "token" ? "Copied!" : "Copy Token"}
        </button>
      ),
    },
    {
      n: 2,
      title: "Open the Shortcuts app",
      body: "Tap below to open Shortcuts, then tap + to create a new shortcut.",
      action: (
        <button onClick={() => { window.location.href = "shortcuts://"; }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm"
          style={{ background: "var(--color-primary-fixed)", color: "var(--color-primary)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
          Open Shortcuts App
        </button>
      ),
    },
    {
      n: 3,
      title: 'Add a "Get Contents of URL" action',
      body: 'Search for "Get Contents of URL" in the action library and add it.',
    },
    {
      n: 4,
      title: "Configure the action",
      body: 'Set Method to POST. Add a header: Authorization = Bearer <your token>. Set body to JSON with one field: text = Shortcut Input.',
    },
    {
      n: 5,
      title: "Set the URL",
      body: "Paste this URL into the action:",
      action: (
        <div className="flex items-center gap-2 mt-1">
          <code className="flex-1 text-xs px-3 py-2 rounded-xl overflow-hidden"
            style={{ background: "#1b1b22", color: "#c3c0ff", fontFamily: "monospace", wordBreak: "break-all" }}>
            {apiUrl}
          </code>
          <button onClick={() => copy(apiUrl, "url")}
            className="flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium"
            style={{ background: copied === "url" ? "#e8f5e9" : "var(--color-primary-fixed)", color: copied === "url" ? "#2e7d32" : "var(--color-primary)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied === "url" ? "check" : "content_copy"}</span>
          </button>
        </div>
      ),
    },
    {
      n: 6,
      title: 'Name it and add to Share Sheet',
      body: 'Rename the shortcut "Log to FundsFlee". Tap ••• (top right) → Add to Share Sheet → Done.',
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
        <h1 className="font-semibold" style={{ fontSize: 20 }}>iPhone Shortcut</h1>
      </div>

      <div className="flex flex-col gap-5 pt-4">

        {/* How it works */}
        <div className="rounded-2xl p-4" style={{ background: "var(--color-primary-fixed)" }}>
          <p style={{ fontSize: 13, color: "var(--color-primary)", fontWeight: 600 }} className="mb-3">How it works</p>
          <div className="flex items-center gap-2">
            {[
              { emoji: "📱", label: "Get an SMS" },
              { emoji: "📤", label: "Tap Share" },
              { emoji: "✨", label: "Auto-logged" },
            ].map(({ emoji, label }, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-1"
                    style={{ background: "rgba(255,255,255,0.6)" }}>{emoji}</div>
                  <p style={{ fontSize: 11, color: "var(--color-primary)", fontWeight: 500, textAlign: "center" }}>{label}</p>
                </div>
                {i < 2 && <span className="material-symbols-outlined"
                  style={{ color: "var(--color-primary)", opacity: 0.5, fontSize: 18 }}>arrow_forward</span>}
              </div>
            ))}
          </div>
        </div>

        {/* iOS notice */}
        <div className="rounded-2xl p-4 flex gap-3" style={{ background: "#fff8e1", border: "1px solid #ffe082" }}>
          <span className="material-symbols-outlined flex-shrink-0" style={{ color: "#f9a825", fontSize: 20, marginTop: 1 }}>info</span>
          <p style={{ fontSize: 13, color: "#6d4c00" }}>
            iOS 15+ blocks importing shortcut files from external sources. You need to create the shortcut manually — it takes about 2 minutes and only needs to be done once.
          </p>
        </div>

        {/* Setup steps */}
        <div>
          <p style={{ fontSize: 12, color: "var(--color-outline)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}
            className="mb-3 px-1">Setup guide</p>
          <div className="flex flex-col gap-3">
            {steps.map(({ n, title, body, action }) => (
              <div key={n} className="rounded-2xl p-4 border flex flex-col gap-2"
                style={{ background: "var(--color-surface-container-lowest)", borderColor: "var(--color-outline-variant)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 700 }}>{n}</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-on-surface)" }}>{title}</p>
                </div>
                <p style={{ fontSize: 13, color: "var(--color-on-surface-variant)", paddingLeft: 40 }}>{body}</p>
                {action && <div style={{ paddingLeft: 40 }}>{action}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Token card */}
        <div>
          <p style={{ fontSize: 12, color: "var(--color-outline)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}
            className="mb-2 px-1">Your personal token</p>
          <div className="rounded-2xl p-4" style={{ background: "#1b1b22" }}>
            <p style={{ fontFamily: "monospace", color: "#c3c0ff", fontSize: 13, letterSpacing: "0.05em", wordBreak: "break-all" }} className="mb-3">
              {showToken ? token : masked}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowToken(!showToken)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, border: "1px solid rgba(255,255,255,0.2)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showToken ? "visibility_off" : "visibility"}</span>
                {showToken ? "Hide" : "Show"}
              </button>
              <button onClick={() => copy(token, "token")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
                style={{
                  background: copied === "token" ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.1)",
                  color: copied === "token" ? "#a5d6a7" : "#fff",
                  fontSize: 13,
                  border: `1px solid ${copied === "token" ? "rgba(76,175,80,0.3)" : "rgba(255,255,255,0.2)"}`,
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied === "token" ? "check" : "content_copy"}</span>
                {copied === "token" ? "Copied!" : "Copy"}
              </button>
            </div>
            <button onClick={rotateToken} className="mt-3 text-sm font-medium w-full text-center"
              style={{ color: "#ef9a9a" }}>
              Regenerate token (old one stops working)
            </button>
          </div>
        </div>

        <div className="rounded-2xl p-3 flex items-center gap-3 border" style={{ background: "#e8f5e9", borderColor: "#a5d6a7" }}>
          <span className="material-symbols-outlined" style={{ color: "#2e7d32", fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <p style={{ fontSize: 13, color: "#2e7d32", fontWeight: 500 }}>Your API endpoint is live and ready to receive entries</p>
        </div>

      </div>
    </div>
  );
}
