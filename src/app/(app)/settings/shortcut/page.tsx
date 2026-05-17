"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ShortcutSettingsPage() {
  const router   = useRouter();
  const [token,     setToken]     = useState("");
  const [copied,    setCopied]    = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    fetch("/api/user/token").then((r) => r.json()).then((d) => setToken(d.token));
  }, []);

  async function rotateToken() {
    const res  = await fetch("/api/user/token", { method: "POST" });
    const data = await res.json();
    setToken(data.token);
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function installShortcut() {
    if (!token || installing) return;
    setInstalling(true);
    try {
      const res = await fetch("/api/shortcut/prepare", { method: "POST" });
      if (!res.ok) throw new Error("Failed to prepare install");
      const { prepareId } = await res.json() as { prepareId: string };
      const fileUrl    = `${window.location.origin}/api/shortcut/file?id=${encodeURIComponent(prepareId)}`;
      const installUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent("Log to FundsFlee")}`;
      window.location.href = installUrl;
    } catch {
      alert("Could not prepare shortcut — please try again.");
    } finally {
      setInstalling(false);
    }
  }

  const masked = token ? `${token.slice(0, 8)}••••••••••••${token.slice(-4)}` : "Loading…";

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
          <p style={{ fontSize: 12, color: "var(--color-on-surface-variant)", textAlign: "center" }} className="mt-3">
            Share any SMS or email — parsed and saved automatically
          </p>
        </div>

        {/* Prerequisite */}
        <div className="rounded-2xl p-4 flex gap-3" style={{ background: "#fff8e1", border: "1px solid #ffe082" }}>
          <span className="material-symbols-outlined flex-shrink-0" style={{ color: "#f9a825", fontSize: 20, marginTop: 1 }}>warning</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#6d4c00" }}>One-time setup required</p>
            <p style={{ fontSize: 12, color: "#795500", marginTop: 2 }}>
              Go to <strong>Settings → Shortcuts → Allow Untrusted Shortcuts</strong> and turn it on. Without this, iOS blocks installing shortcuts from external sources.
            </p>
          </div>
        </div>

        {/* One-tap install */}
        <div className="flex flex-col gap-3">
          <button
            onClick={installShortcut}
            disabled={!token || installing}
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all"
            style={{
              background:  token ? "var(--color-primary)" : "var(--color-surface-container)",
              color:       token ? "#fff" : "var(--color-on-surface-variant)",
              fontSize:    16,
              opacity:     (token && !installing) ? 1 : 0.6,
            }}
          >
            {installing
              ? <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(255,255,255,0.4)", borderTopColor: "#fff" }} />
              : <span className="material-symbols-outlined" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>shortcut</span>
            }
            {!token ? "Loading…" : installing ? "Preparing…" : "Install Shortcut"}
          </button>
          <p style={{ fontSize: 12, color: "var(--color-on-surface-variant)", textAlign: "center" }}>
            Opens the Shortcuts app to install automatically. Your token is pre-configured — just tap <strong>Add Shortcut</strong>.
          </p>
        </div>

        {/* Token card (advanced / rotate) */}
        <div>
          <p style={{ fontSize: 12, color: "var(--color-outline)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}
            className="mb-2 px-1">Your personal token</p>
          <div className="rounded-2xl p-4" style={{ background: "#1b1b22" }}>
            <p style={{ fontFamily: "monospace", color: "#c3c0ff", fontSize: 13, letterSpacing: "0.05em" }} className="mb-3">
              {showToken ? token : masked}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowToken(!showToken)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff", fontSize: 13, border: "1px solid rgba(255,255,255,0.2)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showToken ? "visibility_off" : "visibility"}</span>
                {showToken ? "Hide" : "Show"}
              </button>
              <button onClick={copyToken}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl"
                style={{
                  background: copied ? "rgba(76,175,80,0.2)" : "rgba(255,255,255,0.1)",
                  color:      copied ? "#a5d6a7" : "#fff",
                  fontSize:   13,
                  border:     `1px solid ${copied ? "rgba(76,175,80,0.3)" : "rgba(255,255,255,0.2)"}`,
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? "check" : "content_copy"}</span>
                {copied ? "Copied!" : "Copy"}
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
