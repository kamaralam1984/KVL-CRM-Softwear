"use client";
import { useEffect, useState } from "react";
import { resetPassword } from "@/lib/auth/client";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The emailed link is /reset-password?token=… — read it on the client after mount.
    const t = setTimeout(() => { setToken(new URLSearchParams(window.location.search).get("token")); setChecked(true); }, 0);
    return () => clearTimeout(t);
  }, []);
  const expired = checked && !token;
  const ready = Boolean(token);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    if (pw.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    if (pw !== pw2) { setMsg("Passwords do not match."); return; }
    setBusy(true);
    const r = await resetPassword(token!, pw);
    setBusy(false);
    if (r.error) { setMsg(r.error); return; }
    setDone(true);
  };

  const box: React.CSSProperties = { maxWidth: 400, margin: "12vh auto", padding: 28, borderRadius: 16, background: "#fff", boxShadow: "0 8px 30px rgba(0,0,0,.1)", fontFamily: "system-ui, sans-serif" };
  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", margin: "6px 0 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 15, boxSizing: "border-box" };
  const btn: React.CSSProperties = { width: "100%", padding: 12, borderRadius: 8, border: 0, background: "#D4AF37", color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer" };

  return (
    <main style={{ minHeight: "100vh", background: "#faf8f0" }}>
      <div style={box}>
        <h1 style={{ fontSize: 22, margin: "0 0 16px" }}>Set a new password</h1>
        {done ? (
          <>
            <p>Password updated. You can now sign in with your new password.</p>
            <a href="/"><button style={btn}>Go to Sign In</button></a>
          </>
        ) : expired ? (
          <>
            <p>This reset link is invalid or has expired. Please request a new one from the Sign In page.</p>
            <a href="/"><button style={btn}>Back to Sign In</button></a>
          </>
        ) : !ready ? (
          <p>Checking your reset link…</p>
        ) : (
          <form onSubmit={submit}>
            <label>New password<input style={input} type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" /></label>
            <label>Confirm password<input style={input} type="password" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" /></label>
            {msg && <p style={{ color: "#b45309", fontSize: 14 }}>{msg}</p>}
            <button style={btn} disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
