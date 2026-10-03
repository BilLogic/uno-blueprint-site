import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Walkthrough } from "./Walkthrough";

/**
 * How the work is structured. The scroll-driven walkthrough comes first; what
 * the structure gives you (`children`) follows it in the same section.
 */
export function StructureSection({ children }: { children?: ReactNode }) {
  return (
    <section className="py-section">
      <Container>
        <Walkthrough />
        {children}
      </Container>
    </section>
  );
}
