import type { ReactNode } from "react";

interface HeroProps {
  onPlanRoom: () => void;
}

const VIDEO_SPEED = 1.5;

const STATS = [
  {
    label: "Space",
    value: "Fits your room",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 15V4h11M4 15l5 5M4 15h16v-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Budget",
    value: "Under your budget",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="3"
          y="6"
          width="18"
          height="13"
          rx="3"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M3 10h18M16 15h2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Local",
    value: "Karachi furniture",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  },
];

export function Hero({ onPlanRoom }: HeroProps) {
  return (
    <section id="top" className="bg-forest-800">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-28 lg:pt-10">
        {/* Left section */}
        <div>
          <h1 className="font-serif text-5xl font-semibold leading-[1.04] tracking-tight text-cream sm:text-6xl">
            Step into a room
            <br />
            that fits your space.
            <br />
            And your budget.
          </h1>

          <button
            type="button"
            onClick={onPlanRoom}
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-terracotta px-6 py-3 font-medium text-cream shadow-sm transition-colors hover:bg-terracotta-600"
          >
            Start Planning
            <span aria-hidden="true">→</span>
          </button>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STATS.map((s, i) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                icon={s.icon}
                delay={`${0.15 + i * 0.15}s`}
              />
            ))}
          </div>
        </div>

        {/* Right Hero Section */}

        <div>
          <video
            src="/hero.mp4"
            autoPlay
            muted
            playsInline
            onLoadedMetadata={(e) => {
              e.currentTarget.playbackRate = VIDEO_SPEED;
            }}
            onMouseEnter={(e) => {
              const video = e.currentTarget;
              video.currentTime = 0;
              video.playbackRate =VIDEO_SPEED;
              void video.play();
            }}
            className="block w-full rounded-3xl bg-forest-700 shadow-2xl ring-1 ring-black/5"
          />
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
  delay,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  delay: string;
}) {
  return (
    <div
      className="rm-rise flex items-start gap-2.5 rounded-xl bg-forest-700 px-3.5 py-3 ring-1 ring-white/5"
      style={{ animationDelay: delay }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-terracotta/15 text-terracotta">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">
          {label}
        </p>
        <p className="text-sm font-semibold text-cream">{value}</p>
      </div>
    </div>
  );
}
