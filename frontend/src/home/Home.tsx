import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Studio } from "./Studio";
import { HowItWorks } from "./HowItWorks";
import { FurnitureCatalog } from "./FurnitureCatalog";
import { WhyRooMatch } from "./WhyRooMatch";
import { CTA } from "./CTA";
import { Footer } from "./Footer";

export function Home() {
  return (
    <div className="min-h-screen bg-forest-800">
      <Navbar />
      <Hero />

      <Studio />

      <HowItWorks />

      <FurnitureCatalog />

      <WhyRooMatch />

      <CTA />
      <Footer />
    </div>
  );
}
