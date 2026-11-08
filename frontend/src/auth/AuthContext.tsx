import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { User } from "../types/api";
import { AuthContext, useAuth } from "./authState";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try { setUser(await api.me()); }
    catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setUser(null);
      else setError(e instanceof Error ? e.message : "Unable to connect. Please try again.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let cancelled = false;
    api.me().then(account => { if (!cancelled) setUser(account); })
      .catch(e => {
        if (!cancelled && !(e instanceof ApiError && (e.status === 401 || e.status === 403))) {
          setError(e instanceof Error ? e.message : "Unable to connect. Please try again.");
        }
      }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener("roomatch:session-expired", expired);
    return () => window.removeEventListener("roomatch:session-expired", expired);
  }, []);

  return <AuthContext.Provider value={{
    user, loading, error, refresh,
    login: async (email, password) => { setUser(await api.login(email, password)); setError(null); },
    verify: async (email, otp) => { setUser(await api.verifyEmail(email, otp)); setError(null); },
    logout: async () => { await api.logout(); setUser(null); },
  }}>{children}</AuthContext.Provider>;
}

export function RequireAuth({ children, allowGuest = false }: { children: ReactNode; allowGuest?: boolean }) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (allowGuest) return children;
  if (loading || error) return <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-6 text-center text-ink">
    <p role={error ? "alert" : "status"}>{error || "Loading your account…"}</p>
    {error && <button className="rounded-lg bg-terracotta px-5 py-2 text-cream" onClick={() => void refresh()}>Try again</button>}
  </main>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}
