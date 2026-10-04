"use client";

import { useCallback, useId, type ReactNode } from "react";
import { useInView } from "@/hooks/use-in-view";
import { useNoHover, useReducedMotion } from "@/hooks/use-media-query";
import { usePlayCycle } from "@/hooks/use-play-cycle";
import { usePointerLight } from "@/hooks/use-pointer-light";
import { useArrived } from "./BentoGrid";
import styles from "./bento.module.css";

/** On a touch screen a picture plays this long, rests, and plays again. */
const PLAY_MS = 4400;
const REST_MS = 1200;

type BentoPanelProps = {
  /** The panel's place in the grid, which sets its turn to arrive. */
  index: number;
  size?: "wide" | "narrow";
  icon: ReactNode;
  title: string;
  body: string;
  /** The picture: grey at rest, playing while the panel is hovered, focused or in the middle of a touch screen. */
  children: ReactNode;
  /**
   * The picture carries words of its own worth reading, labelled where they
   * are drawn, and hides its decoration itself. Otherwise the whole picture
   * is hidden from assistive technology.
   */
  labelled?: boolean;
};

export function BentoPanel({ index, size, icon, title, body, children, labelled = false }: BentoPanelProps) {
  const titleId = useId();
  const arrived = useArrived(index);
  const noHover = useNoHover();
  // No pointer to hover with: the picture plays while its panel is in the middle of the screen.
  const [middleRef, inMiddle] = useInView<HTMLDivElement>({ rootMargin: "-22% 0px -22% 0px" });
  const reducedMotion = useReducedMotion();
  const centred = noHover && inMiddle;
  const cycling = usePlayCycle(centred && !reducedMotion, PLAY_MS, REST_MS);
  // With reduced motion it holds the played picture instead of replaying it.
  const playing = centred && (reducedMotion || cycling);
  const lightRef = usePointerLight<HTMLDivElement>();
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      middleRef(node);
      lightRef(node);
    },
    [middleRef, lightRef],
  );

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={titleId}
      // A panel reached with the keyboard plays as it does under the pointer.
      tabIndex={0}
      className={`${styles.panel} ${size ? styles[size] : ""}`}
      data-arrived={arrived || undefined}
      data-hot={playing || undefined}
    >
      <div className={styles.inner}>
        <h3 id={titleId} className={styles.title}>
          {icon}
          {title}
        </h3>
        <p className={styles.body}>{body}</p>
        <div className={styles.picture} aria-hidden={!labelled || undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
