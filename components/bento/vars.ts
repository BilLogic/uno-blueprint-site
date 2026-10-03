import type { CSSProperties } from "react";

/** Custom properties for a style prop, which React's CSS types do not know by name. */
export const vars = (values: Record<`--${string}`, string | number>) => values as CSSProperties;
