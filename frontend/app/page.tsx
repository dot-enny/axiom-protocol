import { Frame } from "@/components/layout/frame";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { TickerStrip } from "@/components/landing/ticker-strip";
import { FeaturesSection } from "@/components/landing/features-section";

export default function Home() {
  return (
    <Frame>
      <Navbar />
      <main>
        <Hero />
        <TickerStrip />
        <FeaturesSection />
      </main>
      <Footer />
    </Frame>
  );
}
