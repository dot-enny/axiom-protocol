import { Frame } from "@/components/layout/frame";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/landing/hero";
import { TickerStrip } from "@/components/landing/ticker-strip";
import { FeaturesSection } from "@/components/landing/features-section";
import { NetworkMetrics } from "@/components/landing/network-metrics";
import { RwaUseCases } from "@/components/landing/rwa-use-cases";
import { TerminalCta } from "@/components/landing/terminal-cta";

export default function Home() {
  return (
    <Frame>
      <Navbar />
      <main>
        <Hero />
        <TickerStrip />
        <FeaturesSection />
        <NetworkMetrics />
        <RwaUseCases />
        <TerminalCta />
      </main>
      <Footer />
    </Frame>
  );
}
