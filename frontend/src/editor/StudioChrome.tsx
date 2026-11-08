// The Studio's top bar: the RooMatch wordmark on the left and the Manual /
// Recommendations mode toggle on the right. Session actions (Save / New layout / Help)
// live on the right rail, next to the inspector they act on — not up here.

import { Link } from "react-router-dom";
import { AccountLinks } from "../auth/AccountLinks";

export type StudioMode = "manual" | "recommend";

interface StudioChromeProps {
  mode: StudioMode;
  onMode: (mode: StudioMode) => void;
  onSignIn: () => void;
}

const MODES: { value: StudioMode; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "recommend", label: "Recommendations" },
];

export function StudioChrome({ mode, onMode, onSignIn }: StudioChromeProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/20 bg-forest-800 text-cream">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* Left: the same brand lockup as the homepage navbar */}
        <Link to="/" aria-label="RooMatch home" className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center rounded-lg bg-cream p-1.5">
            <img src="/logo.png" alt="RooMatch" className="h-7 w-auto" />
          </span>
          <span className="font-serif text-xl font-semibold text-cream">RooMatch</span>
          <span className="ml-1 rounded-md bg-terracotta px-2.5 py-1 text-xs font-semibold tracking-wide text-cream">
            Room Fit Studio
          </span>
        </Link>

        <AccountLinks onSignIn={onSignIn} />
        {/* Right: mode toggle */}
        <div className="inline-flex rounded-lg border border-white/15 bg-forest-900 p-0.5 text-sm">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => onMode(m.value)}
              className={
                "rounded-md px-3.5 py-1.5 font-medium transition-colors " +
                (mode === m.value
                  ? "bg-terracotta text-cream shadow-sm"
                  : "text-cream/70 hover:text-cream")
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
