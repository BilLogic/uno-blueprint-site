import { AgentView } from "@/components/agent/AgentView";
import { Footer } from "@/components/footer/Footer";
import { Harness } from "@/components/harness/Harness";
import { Hero } from "@/components/hero/Hero";
import { Nav } from "@/components/nav/Nav";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
        <Harness />
      </main>
      <AgentView />
      <Footer />
    </>
  );
}
