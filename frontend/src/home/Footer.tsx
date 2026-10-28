
const FOOTER_LINKS = [
  { label: "Room Planner", href: "#planner" },
  { label: "Furniture Catalog", href: "#furniture" },
  { label: "How It Works", href: "#how-it-works" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-forest-900">
      <div className="mx-auto max-w-6xl px-6 py-6 sm:py-7">
        <div className="grid gap-5 sm:grid-cols-2 sm:items-center">
          <div>
            <a href="#top" className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-terracotta">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5"
                    stroke="var(--color-cream)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-serif text-lg font-semibold text-cream">
                RooMatch
              </span>
            </a>

            <h3 className="mt-2 font-serif text-xl text-cream">
              Make room for what matters.
            </h3>

            <p className="mt-1 max-w-sm text-sm leading-5 text-sage">
              Plan your living room around real dimensions, your budget, and
              furniture that fits your space.
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-sage transition-colors hover:text-cream"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-sage/80">
            © 2026 RooMatch · Karachi, Pakistan
          </p>
          <p className="font-serif text-sm italic text-cream/80">
            Designed around your space.
          </p>
        </div>
      </div>
    </footer>
  );
}

