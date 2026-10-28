import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Studio } from "./Studio";
import { HowItWorks } from "./HowItWorks";
import { WhyRooMatch } from "./WhyRooMatch";
import { CTA } from "./CTA";
import { Footer } from "./Footer"
import { FurnitureCatalog } from "./FurnitureCatalog";

interface HomeProps {
    onPlanRoom: () => void;
}

export function Home({ onPlanRoom }: HomeProps) {
    return(
        <div className="min-h-screen bg-forest-800">
            <Navbar onPlanRoom={onPlanRoom}/>
            <Hero onPlanRoom={onPlanRoom}/>
            <Studio onPlanRoom={onPlanRoom}/>
            <HowItWorks/>
            <FurnitureCatalog onPlanRoom={onPlanRoom} />
            <WhyRooMatch />
            < CTA onPlanRoom={onPlanRoom} />
            <Footer />
        </div>
    )
}