import { useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Editor } from "./editor/Editor";
import { Home } from "./home/Home";
import { AuthPage } from "./auth/AuthPage";
import { PasswordRecovery } from "./auth/PasswordRecovery";
import { RequireAuth } from "./auth/AuthContext";
import { Dashboard } from "./dashboard/Dashboard";

export default function App() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname, hash]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
      <Route path="/verify-email" element={<AuthPage key="verify" mode="verify" />} />
      <Route path="/forgot-password" element={<PasswordRecovery key="forgot" mode="request" />} />
      <Route path="/reset-password" element={<PasswordRecovery key="reset" mode="reset" />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/studio" element={<RequireAuth allowGuest><Editor /></RequireAuth>} />
      <Route path="/studio/:layoutId" element={<RequireAuth><Editor /></RequireAuth>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-forest-800 px-6 text-center text-cream">
      <h1 className="font-serif text-4xl font-semibold">Page not found</h1>
      <p className="text-sage">The page you're looking for isn't available.</p>
      <Link
        to="/"
        className="rounded-lg bg-terracotta px-5 py-3 font-medium text-cream hover:bg-terracotta-600"
      >
        Back to home
      </Link>
    </main>
  );
}
