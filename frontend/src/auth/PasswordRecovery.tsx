import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

const FIELD = "w-full rounded-lg border border-sand bg-white px-3 py-3 text-ink focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20";
const BUTTON = "w-full rounded-lg bg-terracotta px-4 py-3 font-medium text-cream hover:bg-terracotta-600 disabled:opacity-50";

export function PasswordRecovery({ mode }: { mode: "request" | "reset" }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const candidate = params.get("next") || "/dashboard";
  const next = candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\") ? candidate : "/dashboard";
  const [email, setEmail] = useState(params.get("email") || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(mode === "reset" && params.get("sent") === "1" ? 60 : 0);
  const linkTo = (path: string) => `${path}?next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}`;

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null); setNotice(null);
    if (mode === "reset" && password !== confirmation) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      if (mode === "request") {
        await api.forgotPassword(email);
        navigate(`${linkTo("/reset-password")}&sent=1`);
      } else {
        await api.resetPassword(email, otp, password);
        navigate(`${linkTo("/login")}&reset=1`, { replace: true });
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setError(null); setNotice(null);
    try { const response = await api.forgotPassword(email); setNotice(response.detail); setCooldown(60); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to send code."); }
    finally { setBusy(false); }
  }

  if (mode === "reset" && !email) return <Navigate to={linkTo("/forgot-password")} replace />;

  return <main className="flex min-h-screen flex-col items-center justify-center bg-forest-800 px-6 py-12">
    <Link to="/" className="mb-8 flex items-center gap-3 font-serif text-2xl text-cream"><img src="/logo.png" alt="" className="h-10 rounded-lg bg-cream p-1" />RooMatch</Link>
    <section className="w-full max-w-md rounded-2xl bg-cream p-7 text-ink shadow-xl sm:p-9">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-terracotta">Account recovery</p>
      <h1 className="font-serif text-3xl">{mode === "request" ? "Forgot your password?" : "Set a new password"}</h1>
      <p className="mb-6 mt-3 text-sm text-ink/65">{mode === "request" ? "Enter your registered email address to receive a password reset code." : <>If <strong className="break-all font-medium text-ink">{email}</strong> has an account, a six-digit reset code has been emailed. Enter it below within 10 minutes.</>}</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode === "request" ? <label className="flex flex-col gap-1.5 text-sm">Email address<input className={FIELD} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label> : <>
          <label className="flex flex-col gap-1.5 text-sm">Reset code<input className={FIELD + " text-center text-2xl tracking-[0.4em]"} inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" minLength={6} maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} /></label>
          <label className="flex flex-col gap-1.5 text-sm">New password<input className={FIELD} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /><span className="text-xs text-ink/60">Use at least 8 characters.</span></label>
          <label className="flex flex-col gap-1.5 text-sm">Confirm new password<input className={FIELD} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
        </>}
        {error && <p role="alert" className="rounded-lg bg-terracotta/10 p-3 text-sm text-terracotta-600">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-sage/20 p-3 text-sm">{notice}</p>}
        <button disabled={busy} className={BUTTON}>{busy ? "Please wait…" : mode === "request" ? "Send reset code" : "Update password"}</button>
      </form>
      {mode === "reset" && <>
        <button type="button" disabled={busy || cooldown > 0} onClick={() => void resend()} className="mt-4 w-full text-sm text-terracotta disabled:text-ink/50">{cooldown ? `Resend code in ${cooldown}s` : "Resend reset code"}</button>
        <Link to={linkTo("/forgot-password")} className="mt-3 block text-center text-sm text-terracotta underline">Use a different email</Link>
      </>}
      <Link to={linkTo("/login")} className="mt-6 block text-center text-sm text-terracotta underline">Back to sign in</Link>
    </section>
  </main>;
}
