import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "./authState";

const FIELD = "w-full rounded-lg border border-sand bg-white px-3 py-3 text-ink focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20";
const BUTTON = "w-full rounded-lg bg-terracotta px-4 py-3 font-medium text-cream hover:bg-terracotta-600 disabled:opacity-50";

export function AuthPage({ mode }: { mode: "login" | "signup" | "verify" }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const candidate = params.get("next") || "/dashboard";
  const next = candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\") ? candidate : "/dashboard";
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(mode === "login" && params.get("reset") === "1" ? "Password updated. Sign in with your new password." : null);
  const [cooldown, setCooldown] = useState(mode === "verify" ? Math.min(60, Math.max(0, Number(params.get("retry") || (params.get("sent") === "1" ? 60 : 0)) || 0)) : 0);
  const linkTo = (path: string) => `${path}?next=${encodeURIComponent(next)}`;

  useEffect(() => {
    if (auth.user) navigate(next, { replace: true });
  }, [auth.user, next, navigate]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      if (mode === "signup") {
        await api.register(email, password);
        navigate(`${linkTo("/verify-email")}&email=${encodeURIComponent(email)}&sent=1`);
      } else if (mode === "verify") {
        await auth.verify(email, otp);
        navigate(next, { replace: true });
      } else {
        await auth.login(email, password);
        navigate(next, { replace: true });
      }
    } catch (e) {
      if (mode === "login" && e instanceof ApiError && e.code === "email_verification_required") {
        navigate(`${linkTo("/verify-email")}&email=${encodeURIComponent(email)}&retry=${e.retryAfter ?? 0}&sent=${e.otpSent ? 1 : 0}`);
      } else setError(e instanceof Error ? e.message : "Please try again.");
    } finally { setBusy(false); }
  }

  if (mode === "verify" && !email) return <Navigate to={linkTo("/signup")} replace />;

  async function resend() {
    if (!email.trim()) { setError("Enter your email address first."); return; }
    setBusy(true); setError(null);
    try { const result = await api.resendOtp(email); setNotice(result.detail); setCooldown(60); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to send code."); }
    finally { setBusy(false); }
  }

  return <main className="flex min-h-screen flex-col items-center justify-center bg-forest-800 px-6 py-12">
    <Link to="/" className="mb-8 flex items-center gap-3 font-serif text-2xl text-cream"><img src="/logo.png" alt="" className="h-10 rounded-lg bg-cream p-1" />RooMatch</Link>
    <section className="w-full max-w-md rounded-2xl bg-cream p-7 text-ink shadow-xl sm:p-9">
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-terracotta">Your room, your plans</p>
      <h1 className="font-serif text-3xl">{mode === "signup" ? "Create your account" : mode === "verify" ? "Verify your email" : "Welcome back"}</h1>
      <p className="mb-6 mt-3 text-sm text-ink/65">{mode === "verify" ? <>Enter the six-digit code sent to <strong className="break-all font-medium text-ink">{email}</strong>. It expires in 10 minutes.</> : "Save your room layouts and come back to them whenever you like."}</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {mode !== "verify" && <label className="flex flex-col gap-1.5 text-sm">Email address<input className={FIELD} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {mode === "verify" ? <label className="flex flex-col gap-1.5 text-sm">Verification code<input className={FIELD + " text-center text-2xl tracking-[0.4em]"} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required minLength={6} maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} /></label>
          : <label className="flex flex-col gap-1.5 text-sm">Password<input className={FIELD} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} />{mode === "signup" && <span className="text-xs text-ink/60">Use at least 8 characters.</span>}</label>}
        {mode === "login" && <Link to={`${linkTo("/forgot-password")}&email=${encodeURIComponent(email)}`} className="self-end text-sm text-terracotta underline">Forgot password?</Link>}
        {error && <p role="alert" className="rounded-lg bg-terracotta/10 p-3 text-sm text-terracotta-600">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-sage/20 p-3 text-sm">{notice}</p>}
        <button disabled={busy} className={BUTTON}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "verify" ? "Verify email" : "Sign in"}</button>
      </form>
      {mode === "verify" && <button type="button" onClick={() => void resend()} disabled={busy || cooldown > 0} className="mt-4 w-full text-sm text-terracotta disabled:text-ink/50">{cooldown ? `Resend code in ${cooldown}s` : "Resend verification code"}</button>}
      <p className="mt-6 text-center text-sm text-ink/65">{mode === "login" ? <>New to RooMatch? <Link className="text-terracotta underline" to={linkTo("/signup")}>Create an account</Link></> : <Link className="text-terracotta underline" to={`${linkTo("/login")}&email=${encodeURIComponent(email)}`}>{mode === "verify" ? "Back to sign in" : "Already have an account? Sign in"}</Link>}</p>
      {next === "/studio" && <Link to={next} className="mt-4 block text-center text-sm text-terracotta underline">Back to Studio</Link>}
    </section>
  </main>;
}
