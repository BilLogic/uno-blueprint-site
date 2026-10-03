import { AgentView } from "@/components/agent/AgentView";
import { Footer } from "@/components/footer/Footer";
import { Hero } from "@/components/hero/Hero";
import { Nav } from "@/components/nav/Nav";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
      </main>
      <AgentView />
      <Footer />
    </>
  );
}
