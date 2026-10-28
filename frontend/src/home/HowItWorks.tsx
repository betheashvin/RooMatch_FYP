interface Step {
  n: string;
  title: string;
  body: string;
  badge: string;
  glyph: "measure" | "sofa" | "check";
  img: string;

}

const STEPS: Step[] = [
{
     n: "01",
    title: "Tell us about your room",
    body: "Type in your measurements and mark the doors, windows, and fixed features.",
    badge: "Measurements · 16'0 × 12'0",
    glyph: "measure",
    img: "/how/step-01.jfif",
},
{
    n: "02",
    title: "Explore furniture that fits",
    body: "Browse real, dimension-checked pieces and drag them into your space.",
    badge: "Dragging items",
    glyph: "sofa",
    img: "/how/step-02.jfif",
},
{
    n: "03",
    title: "Build & validate your space",
    body: "We check clearances, doorways, and your budget — and flag anything that won't work.",
    badge: "Clearing obstacles",
    glyph: "check",
    img: "/how/step-03.jfif",
}
];

export function HowItWorks() {
    return(
        <section id = "how-it-works" 
        className = "bg-forest-800 py-20 sm:py-24">
            <div className = "mx-auto max-w-6xl px-6">
                <p className = "text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">process</p>
                <h2 className = "mt-3 font-serif text-4xl font-semibold tracking-tight text-cream sm:text-5xl">
                    How RooMatch works
                </h2>
                <p className = "mt-3 max-w-2xl text-sage">
                    From an empty room to a fully coordinated space - in three steps.
                </p>
                <div className = "mt-12 grid gap-8 md:grid-cols-3">
                    {
                        STEPS.map((s) => (
                            <div key ={s.n}>
                                <div className= "flex items-basline gap-3">
                                    <span className = "font-serf text-lg font-semibold text-terracotta">{s.n}</span>
                                    <h3 className = "text-lg font-semibold text-cream">{s.title}</h3>
                                    </div>
                                    <p className= "mt-2 text-sm leading-relaxed text-sage">{s.body}</p>

                                    <div className = "relative mt-4 h-56 overflow-hidden rounded-2xl ring-1 ring-white/10">
                                    <div className = "absolute insert-0 flex items-center justify-center bg-linear-to-br from-cream-100 to-send">
                                        <StepGlyph kind = {s.glyph}/>
                                    </div>
                                    <img
                                    src = {s.img}
                                    alt ={s.title}
                                    className= "relative h-full w-full object-cover"
                                    onError ={(e) =>
                                    {
                                        e.currentTarget.style.visibility = "hidden";
                                    }
                                    }
                                    />
                                    <span className = "absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-forest-950/85 px-3 py-1 text-xs font-medium text-cream">
                                    <span className ="h-1.5 w-1.5 rounded-full bg-terracotta"/>{s.badge}
                                    </span>
                                </div>
                            </div>   
                        ))
                    }
                </div>
            </div>
        </section>
    );
}

function StepGlyph({ kind }: {kind: Step["glyph"]}) {
    if (kind === "measure") {
        return (
        <svg width="128" height="96" viewBox="0 0 128 96" fill= "none" aria-hidden="true" >
            <rect x="22" y="22" width="84" height="50" rx="6" fill="#2b3724" stroke="#4a5a40" strokeWidth="2" />
            <path d="M34 38h40M34 48h28" stroke="#a9b398" strokeWidth="3" strokeLinecap="round" />
            <rect x="34" y="57" width="22" height="7" rx="3.5" fill="#c15f3c" />
      </svg>
    );
  }
  if (kind === "sofa") {
    return (
      <svg width="140" height="88" viewBox="0 0 140 88" fill="none" aria-hidden="true">
        <rect x="24" y="30" width="92" height="34" rx="10" fill="#9c6b4a" />
        <rect x="24" y="30" width="92" height="12" rx="6" fill="#875a3d" />
        <rect x="20" y="56" width="12" height="18" rx="3" fill="#7d5a3f" />
        <rect x="108" y="56" width="12" height="18" rx="3" fill="#7d5a3f" />
      </svg>
    );
  }
  return (
    <svg width="104" height="96" viewBox="0 0 104 96" fill="none" aria-hidden="true">
      <circle cx="52" cy="48" r="30" fill="#2b3724" stroke="#4a5a40" strokeWidth="2" />
      <path d="M39 49l9 9 17-19" stroke="#c15f3c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
