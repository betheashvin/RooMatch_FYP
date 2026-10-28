interface CTAProps {
  onPlanRoom: () => void;
}

export function CTA({ onPlanRoom }: CTAProps) {
  return (
    <section className="bg-forest-800 py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="font-serif text-4xl font-semibold tracking-tight text-cream sm:text-5xl">
          Ready to see it in your room?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sage">
          Start with your room measurements and explore local pieces that actually fit.
        </p>
        <button
          type="button"
          onClick={onPlanRoom}
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-terracotta px-7 py-3.5 font-medium text-cream shadow-sm transition-colors hover:bg-terracotta-600"
        >
          Plan My Living Room
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
