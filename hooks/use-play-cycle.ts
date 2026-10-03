"use client";

import { useEffect, useState } from "react";

/**
 * Plays for `playMs`, rests for `restMs`, and plays again, for as long as
 * `active` holds; stops at once when it no longer does.
 */
export function usePlayCycle(active: boolean, playMs: number, restMs: number): boolean {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!active) return;
    let timer = 0;
    const play = () => {
      setPlaying(true);
      timer = window.setTimeout(() => {
        setPlaying(false);
        timer = window.setTimeout(play, restMs);
      }, playMs);
    };
    const frame = requestAnimationFrame(play);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [active, playMs, restMs]);

  return active && playing;
}
