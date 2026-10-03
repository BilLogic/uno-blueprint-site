"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useArrivalQueue } from "@/hooks/use-arrival-queue";

const Arrived = createContext<(index: number) => boolean>(() => true);

/** Whether the panel at `index` has arrived on screen yet. */
export const useArrived = (index: number) => useContext(Arrived)(index);

/**
 * The twelve-column grid the panels sit in. Panels arrive one by one, each
 * once its top edge is above the lower 30% of the screen, so the sequence
 * plays where it can be seen instead of at the bottom edge.
 */
export function BentoGrid({ children }: { children: ReactNode }) {
  const [ref, arrived] = useArrivalQueue<HTMLDivElement>({ rootMargin: "0px 0px -30% 0px" });
  return (
    <div ref={ref} className="mt-8 grid grid-cols-12 gap-gap">
      <Arrived value={arrived}>{children}</Arrived>
    </div>
  );
}
