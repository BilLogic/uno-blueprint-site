"use client";

import { Bot, UserRound } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { bento } from "@/content/bento";
import { tokenTravel } from "@/lib/bento";
import { BOARD, SHARED_CELL } from "./geometry";
import styles from "./bento.module.css";

type Travel = Record<"person" | "agent", { x: number; y: number }>;

/** A box relative to the board, as it sits before any travel. */
function restingBox(element: HTMLElement, board: DOMRect) {
  const box = element.getBoundingClientRect();
  const { m41: dx, m42: dy } = new DOMMatrixReadOnly(getComputedStyle(element).transform);
  return {
    left: box.left - board.left - dx,
    top: box.top - board.top - dy,
    width: box.width,
    height: box.height,
  };
}

/**
 * Uno map, duo users: one cell on the canvas, which a person and an agent
 * both travel to, branching to its two readings: a page and its data.
 */
export function DuoPicture() {
  const boardRef = useRef<HTMLDivElement>(null);
  const cellRef = useRef<HTMLElement>(null);
  const personRef = useRef<HTMLSpanElement>(null);
  const agentRef = useRef<HTMLSpanElement>(null);
  const [travel, setTravel] = useState<Travel | null>(null);

  // Where each of the two has to travel to reach the cell they share, measured
  // again whenever the board changes size.
  useEffect(() => {
    const board = boardRef.current;
    const cell = cellRef.current;
    const person = personRef.current;
    const agent = agentRef.current;
    if (!board || !cell || !person || !agent) return;
    const aim = () => {
      const frame = board.getBoundingClientRect();
      const target = restingBox(cell, frame);
      setTravel({
        person: tokenTravel(target, restingBox(person, frame), "person"),
        agent: tokenTravel(target, restingBox(agent, frame), "agent"),
      });
    };
    const observer = new ResizeObserver(aim);
    observer.observe(board);
    void document.fonts.ready.then(aim);
    return () => observer.disconnect();
  }, []);

  const to = (side: keyof Travel) =>
    travel
      ? ({ "--tx": `${travel[side].x}px`, "--ty": `${travel[side].y}px` } as CSSProperties)
      : undefined;

  return (
    <div className={styles.duo}>
      <div ref={boardRef} className={styles.board}>
        <div className={styles.grid}>
          {BOARD.map((row, r) => (
            <div key={r}>
              <b />
              {row.map((filled, c) => {
                const shared = r === SHARED_CELL.row && c === SHARED_CELL.column;
                return (
                  <i
                    key={c}
                    ref={shared ? cellRef : undefined}
                    className={`${filled ? "" : styles.empty} ${shared ? styles.target : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <span ref={personRef} className={`${styles.token} ${styles.person}`} style={to("person")}>
          <UserRound strokeWidth={2.2} />
        </span>
        <span ref={agentRef} className={`${styles.token} ${styles.agent}`} style={to("agent")}>
          <Bot strokeWidth={2.2} />
        </span>
      </div>
      <div className={styles.branch}>
        <i />
      </div>
      <div className={styles.leaves}>
        <div className={styles.leaf}>
          <div className={styles.page}>
            <i className={styles.image} />
            <u />
            <u />
            <span className={styles.pill} />
          </div>
        </div>
        <div className={styles.leaf}>
          <pre className={styles.json}>
            {bento.duo.json.map(([indent, key, rest], n) => {
              const last = n === bento.duo.json.length - 1;
              return (
                <Fragment key={n}>
                  <span
                    className={last ? styles.last : undefined}
                    style={{ "--n": n } as CSSProperties}
                  >
                    {indent}
                    <i style={{ "--n": n } as CSSProperties}>{key}</i>
                    {rest}
                  </span>
                  {last ? null : "\n"}
                </Fragment>
              );
            })}
            <span
              className={styles.folded}
              style={{ "--n": bento.duo.json.length - 1 } as CSSProperties}
            >
              {bento.duo.folded}
            </span>
          </pre>
        </div>
      </div>
    </div>
  );
}
