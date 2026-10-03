import { AgentView } from "@/components/agent/AgentView";
import { Bento } from "@/components/bento/Bento";
import { Footer } from "@/components/footer/Footer";
import { Hero } from "@/components/hero/Hero";
import { Nav } from "@/components/nav/Nav";
import { Container } from "@/components/ui/Container";
import { bento } from "@/content/bento";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
        {/*
          The bento follows the structure walkthrough inside StructureSection,
          under that section's heading; it moves there, without this stand-in
          heading, when that lands.
        */}
        <section className="py-section">
          <Container>
            <h2 className="sr-only">{bento.heading}</h2>
            <Bento />
          </Container>
        </section>
      </main>
      <AgentView />
      <Footer />
    </>
  );
}
