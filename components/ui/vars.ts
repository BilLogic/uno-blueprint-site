import type { CSSProperties } from "react";

/**
 * A style prop with custom properties, which React's CSS types do not know by
 * name: `values` are the custom properties, `style` any ordinary ones beside them.
 */
export const vars = (values: Record<`--${string}`, string | number>, style: CSSProperties = {}) =>
  ({ ...style, ...values }) as CSSProperties;
