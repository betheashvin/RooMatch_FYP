import { Link } from "react-router-dom";

// Nodes on both sides funnel to a single entry point on the laptop screen, then
// run behind the photo and dissolve into it.
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

export function Studio() {
  return (
    <section className="border-t border-ink/10 bg-cream py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
            Design Studio
          </p>
          <h2 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Grab a chai and design.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-ink/65 sm:text-base sm:leading-7">
            Discover furniture from local sellers and bring your own taste and
            creativity together in one place.
          </p>
        </div>

        <div className="mx-auto mt-1 max-w-7xl">
          <HubScene />
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/studio"
            className="inline-flex items-center gap-2 rounded-lg bg-terracotta px-7 py-3.5 font-medium text-cream shadow-sm transition-colors hover:bg-terracotta-600"
          >
            Start designing
            <span aria-hidden="true">→</span>
          </Link>
           <p className="text-xs text-ink/50">
           Your space. Your style. Your choices.
           </p>
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

        {/* animated connectors — run behind the photo */}
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

        {/* laptop-tea photo — edges feathered so it blends into the section */}
        <image
          href="/laptop_tea_phone.jpg"
          x="335"
          y="40"
          width="450"
          height="251"
          preserveAspectRatio="xMidYMid slice"
          mask="url(#rm-photo-mask)"
        />

        {/* left: real seller logos in consistent circles */}
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
        {/* 100+ aggregate */}
        <circle cx="176" cy="165" r="24" fill="#c15f3c" />
        <text
          x="176"
          y="171"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          fill="#f4efe6"
        >
          100+
        </text>
        <text
          x="120"
          y="322"
          textAnchor="middle"
          fontSize="13"
          fontFamily="Inter, sans-serif"
          fill="#2a2620"
          fillOpacity="0.55"
        >
          Local sellers
        </text>

        {/* right: design / creativity cues (mirror the sellers) */}
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
          x="965"
          y="322"
          textAnchor="middle"
          fontSize="13"
          fontFamily="Inter, sans-serif"
          fill="#2a2620"
          fillOpacity="0.55"
        >
          Your creativity
        </text>
      </svg>

      {/* self-animating logo overlaid on the laptop screen */}
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
