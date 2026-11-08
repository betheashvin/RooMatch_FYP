import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./authState";

export function AccountLinks({ onSignIn }: { onSignIn?: () => void }) {
  const { user, logout, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    setBusy(true); setError(null);
    try { await logout(); }
    catch (e) { setError(e instanceof Error ? e.message : "Sign out failed."); }
    finally { setBusy(false); }
  }
  if (loading) return <span className="text-sm text-sage">Loading…</span>;
  return <div className="flex flex-wrap items-center gap-4 text-sm">
    {user ? <><Link to="/dashboard" className="text-sage hover:text-cream">My layouts</Link><button disabled={busy} onClick={() => void signOut()} className="text-sage hover:text-cream disabled:opacity-50">{busy ? "Signing out…" : "Sign out"}</button></>
      : onSignIn ? <button onClick={onSignIn} className="text-sage hover:text-cream">Sign in</button>
      : <Link to="/login" className="text-sage hover:text-cream">Sign in</Link>}
    {error && <span role="alert" className="max-w-xs text-cream">{error}</span>}
  </div>;
}
