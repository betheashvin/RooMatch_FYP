interface NavbarProps {
  onPlanRoom: () => void;
}

const LINKS = [
  { label: "Explore Furniture", href: "#furniture" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Why RooMatch", href: "#why-roomatch" },
];

export function Navbar({ onPlanRoom }: NavbarProps) {
  return (
    <header className="relative z-10">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="#top" className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center rounded-lg bg-cream p-1.5">
            <img src="/logo.png" alt="RooMatch" className="h-7 w-auto" />
          </span>
          <span className="font-serif text-xl font-semibold text-cream">
            RooMatch
          </span>
        </a>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <li
              key={link.href}
              className="text-sm text-sage transition-colors hover:text-cream"
            >
              {link.label}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onPlanRoom}
            className="rounded-lg bg-terracotta px-4 py-2 text-sm font-medium text-cream shadow-sm transition-colros hover:bg-terracotta-600"
          >
            Plan My Room
          </button>
        </div>
      </nav>
    </header>
  );
}
