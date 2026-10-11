interface StudioProps {
  onPlanRoom: () => void;
}

const SELLER_LINES = [
  "M92 70 C300 70 300 174 483 174",
  "M92 165 C300 165 300 174 483 174",
  "M92 260 C300 260 300 174 483 174",
];
const SKILL_LINES = [
  "M965 70 C800 70 800 174 643 174",
  "M965 165 C800 165 800 174 643 174",
  "M965 260 C800 260 800 174 643 174",
];

const SELLERS = [
  { src: "/sellers/stock_1.png", cy: 70 },
  { src: "/sellers/stock_2.png", cy: 165 },
  { src: "/sellers/stock_3.png", cy: 260 },
];

const DESIGN = [
  { icon: "spark", label: "Creativity", cy: 70 },
  { icon: "heart", label: "Your taste", cy: 165 },
  { icon: "pen", label: "Design sense", cy: 260 },
];

const SELLER_X = 92;
const DESIGN_X = 965;

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

        <div className="mx-auto mt-1 max-w-7xl">
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
        viewBox="0 0 1120 345"
        className="h-auto w-full"
        role="img"
        aria-label="RooMatch Studio hub: local seller logos on the left and design-creativity cues on the right, both funneling by animated lines into a laptop whose screen shows the RooMatch logo building itself"
      >
        <defs>
          <filter id="rm-feather" x="-6%" y="-6%" width="112%" height="112%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <mask id="rm-photo-mask">
            <rect
              x="349"
              y="54"
              width="422"
              height="223"
              rx="22"
              fill="#ffffff"
              filter="url(#rm-feather)"
            />
          </mask>
          {SELLERS.map((_, i) => (
            <clipPath key={i} id={`rm-seller-${i}`}>
              <circle cx={SELLER_X} cy={SELLERS[i].cy} r="30" />
            </clipPath>
          ))}
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
          x="335"
          y="40"
          width="450"
          height="251"
          preserveAspectRatio="xMidYMid slice"
          mask="url(#rm-photo-mask)"
        />

        {/* Left Seller Logos */}
        {SELLERS.map((s, i) => (
          <g key={s.src}>
            <circle cx={SELLER_X} cy={s.cy} r="30" fill="#ffffff" />
            <image
              href={s.src}
              x={SELLER_X - 30}
              y={s.cy - 30}
              width="60"
              height="60"
              preserveAspectRatio="xMidYMid meet"
              clipPath={`url(#rm-seller-${i})`}
            />
            <circle
              cx={SELLER_X}
              cy={s.cy}
              r="30"
              fill="none"
              stroke="#e2d9c8"
              strokeWidth="2"
            />
          </g>
        ))}
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
        {DESIGN.map((d) => (
          <g key={d.label}>
            <circle
              cx={DESIGN_X}
              cy={d.cy}
              r="30"
              fill="#2b3724"
              stroke="#4a5a40"
              strokeWidth="1.5"
            />
            <g
              transform={`translate(${DESIGN_X} ${d.cy}) scale(1.5) translate(-18 -16)`}
            >
              <SkillIcon kind={d.icon} />
            </g>
            <text
              x={DESIGN_X + 42}
              y={d.cy + 5}
              fontSize="13"
              fontFamily="Inter, sans-serif"
              fill="#2a2620"
            >
              {d.label}
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
          left: "50.3%",
          top: "50.4%",
          width: "10%",
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
