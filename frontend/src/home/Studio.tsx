interface StudioProps {
  onPlanRoom: () => void;
}

const SELLER_LINES = [
  "M110 150 C264 150 264 257 418 257",
  "M110 255 C264 255 264 257 418 257",
  "M110 360 C264 360 264 257 418 257",
  "M215 255 C316 255 316 257 418 257",
];
const SKILL_LINES = [
  "M715 150 C631 150 631 257 547 257",
  "M715 255 C631 255 631 257 547 257",
  "M715 360 C631 360 631 257 547 257",
];

const SKILLS = [
  { y: 132, label: "Creativity", icon: "spark" },
  { y: 237, label: "Your taste", icon: "heart" },
  { y: 342, label: "Design sense", icon: "pen" },
];

export function Studio({ onPlanRoom }: StudioProps) {
  return (
    <section className="border-t border-ink/10 bg-cream py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center ">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
            Design Studio
          </p>
          <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Grab a chai and design.
          </h2>
          <p className="mt-3 text-ink/60">
            Hundreds of local sellers' furniture on one side, your own taste and
            creativity on the other — the Studio is where they meet.
          </p>
        </div>

        <div className="mx-auto mt-3 max-w-6xl">
          <HubScene />
        </div>
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onPlanRoom}
            className="inline-flex items-center gap-2 rounded-lg bg-terracotta px-7 py-3.5 font-medium text-cream shadow-sm transition-colors hover:bg-terracotta-600"
          >
            Start Designing
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function HubScene() {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 960 520"
        className="h-auto w-full"
        role="img"
        aria-label="RooMatch Studio hub: local seller logos on the left and design-creativity cues on the right, connected by animated lines to a laptop whose screen shows the RooMatch logo building itself"
      >
        <defs>
          <filter id="rm-feather" x="-6%" y="-6%" width="112%" height="112%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <mask id="rm-photo-mask">
            <rect
              x="314"
              y="164"
              width="332"
              height="173"
              rx="20"
              fill="#ffffff"
              filter="url(#rm-feather)"
            />
          </mask>
        </defs>

        {/* Animated Line Connectors */}
        {SELLER_LINES.map((d, i) => (
          <path
            key={d}
            d={d}
            className="rm-line"
            fill="none"
            stroke="#c15f3c"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
        {SKILL_LINES.map((d, i) => (
          <path
            key={d}
            d={d}
            className="rm-line"
            fill="none"
            stroke="#4a5a40"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ animationDelay: `${i * 0.2 + 0.1}s` }}
          />
        ))}

        {/* Laptop picture */}
        <image
          href="/laptop_tea_phone.jpeg"
          x="300"
          y="150"
          width="360"
          height="201"
          preserveAspectRatio="xMidYMid slice"
          mask="url(#rm-photo-mask)"
        />

        {/* Left Seller Logos */}
        {/* 100+ label  */}
        <text
          x="215"
          y="261"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          fill="#f4efe6"
        >
          100+
        </text>

        <text
          x="150"
          y="406"
          textAnchor="middle"
          fontSize="12"
          fontFamily="Inter, sans-serif"
          fill="#2a2620"
          fillOpacity="0.55"
        >
          Sellers
        </text>

        {/* Right Section */}
        {SKILLS.map((s) => (
          <g key={s.label} transform={`translate(715 ${s.y})`}>
            <rect
              width="150"
              height="36"
              rx="18"
              fill="#2b3724"
              stroke="#4a5a40"
              strokeWidth="1"
            />
            <SkillIcon kind={s.icon} />
            <text
              x="42"
              y="23"
              fontSize="13"
              fontFamily="Inter, sans-serif"
              fill="#f4efe6"
            >
              {s.label}
            </text>
          </g>
        ))}
        <text
          x="790"
          y="406"
          textAnchor="middle"
          fontSize="12"
          fontFamily="Inter, sans-serif"
          fill="#2a2620"
          fillOpacity="0.55"
        >
          Your creativity
        </text>
      </svg>

      <img
        src="/logo.svg"
        alt="RooMatch logo"
        className="pointer-events-none absolute"
        style={{
          left: "50.2%",
          top: "50%",
          width: "9%",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}

function SkillIcon({ kind }: { kind: string }) {
  if (kind === "spark") {
    return (
      <path
        d="M18 9l1.6 4.8L24 15l-4.4 1.2L18 21l-1.6-4.8L12 15l4.4-1.2z"
        fill="#f4efe6"
      />
    );
  }
  if (kind === "heart") {
    return (
      <path
        d="M18 23s-5.4-3.6-5.4-7.3A2.9 2.9 0 0 1 18 14.1 2.9 2.9 0 0 1 23.4 15.7C23.4 19.4 18 23 18 23z"
        fill="#f4efe6"
      />
    );
  }
  return (
    <path
      d="M12 22l1.8-5.4 6.4-6.4 3.6 3.6-6.4 6.4L12 22z"
      fill="none"
      stroke="#f4efe6"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  );
}
