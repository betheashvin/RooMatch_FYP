const FEATURES = [
  {
    title: "Fit",
    body: "Validate furniture placement against room dimensions, clearances, and door access.",
  },
  {
     title: "Budget",
    body: "Find furniture combinations that match your budget and meet your room's fit requirements.",
  },
  {
      title: "Local",
    body: "Explore locally available furniture with product dimensions, prices, and seller details.",
  },
];

export function WhyRooMatch() {
  return (
    <section className="bg-terracotta py-5 sm:py-7">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="font-serif text-4xl font-semibold tracking-tight text-cream sm:text-5xl">
          Why RooMatch?
        </h2>
        <p className="mt-3 max-w-2xl text-cream/80">
          A practical approach to planning living rooms — around real space, budget, and local
          availability.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cream/15 ring-1 ring-cream/20">
                <FeatureIcon name={f.title} />
              </span>
              <h3 className="mt-3 text-lg font-semibold text-cream">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cream/80">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureIcon({ name }: { name: string }) {
  if (name === "Fit") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 15V4h11M4 15l5 5M4 15h16v-5"
          stroke="var(--color-cream)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "Budget") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="13" rx="3" stroke="var(--color-cream)" strokeWidth="2" />
        <path d="M3 10h18M16 15h2" stroke="var(--color-cream)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z"
        stroke="var(--color-cream)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="var(--color-cream)" strokeWidth="2" />
    </svg>
  );
}
