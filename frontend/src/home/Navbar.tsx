import { Link } from "react-router-dom";
import { AccountLinks } from "../auth/AccountLinks";

const LINKS = [
  { label: "Explore Furniture", to: "/catalog" },
  { label: "How It Works", to: "/#how-it-works" },
  { label: "Why RooMatch", to: "/#why-roomatch" },
];

export function Navbar({
  planTo = "/studio",
  planLabel = "Plan My Room",
}: {
  planTo?: string;
  planLabel?: string;
}) {
  return (
    <header className="relative z-10">
      <section id="top">
        <nav aria-label="Main navigation" className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-5 sm:flex sm:justify-between sm:px-6">
          <Link
            to="/"
            aria-label="RooMatch home"
            onClick={(event) => {
              if (window.location.pathname === "/" && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) {
                window.scrollTo({ top: 0, left: 0, behavior: "instant" });
              }
            }}
            className="flex shrink-0 items-center gap-2 sm:gap-2.5"
          >
            <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-cream p-1 sm:p-1.5">
              <img src="/logo.png" alt="RooMatch" className="h-6 w-auto sm:h-7" />
            </span>
            <span className="font-serif text-lg font-semibold text-cream sm:text-xl">
              RooMatch
            </span>
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-sage transition-colors hover:text-cream"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="contents sm:flex sm:items-center sm:gap-5">
            <div className="col-span-2 row-start-2 justify-self-end">
              <AccountLinks />
            </div>
            <Link
              to={planTo}
              className="col-start-2 row-start-1 whitespace-nowrap rounded-lg bg-terracotta px-3 py-2 text-xs font-medium text-cream shadow-sm transition-colors hover:bg-terracotta-600 sm:px-4 sm:text-sm"
            >
              {planLabel}
            </Link>
          </div>
        </nav>
      </section>
    </header>
  );
}
