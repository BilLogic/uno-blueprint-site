"use client";

import { useInPageGlide } from "@/hooks/use-in-page-glide";

/** Makes links within the page glide to their section. Renders nothing. */
export function InPageGlide() {
  useInPageGlide();
  return null;
}
