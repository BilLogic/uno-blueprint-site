import type { ComponentPropsWithoutRef } from "react";

/** The page column: 1280 px at most, with the responsive side gutter. */
export function Container({ className = "", ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={`mx-auto max-w-page px-gutter ${className}`} {...props} />;
}
