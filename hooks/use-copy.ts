"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How long a copy button shows its tick before it reads "copy" again. */
const COPIED_FOR_MS = 1200;

/**
 * Puts text on the clipboard. `copied` is true for a moment after a copy
 * lands; a refused copy (no permission, an insecure page) leaves it false.
 */
export function useCopy(): [copied: boolean, copy: (text: string) => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => {
        clearTimeout(timer.current);
        setCopied(true);
        timer.current = setTimeout(() => setCopied(false), COPIED_FOR_MS);
      },
      () => setCopied(false),
    );
  }, []);

  return [copied, copy];
}
