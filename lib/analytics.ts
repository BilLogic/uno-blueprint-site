import { site } from "@/content/site";
import { CLARITY_TAG_URL } from "./clarity-tag.mjs";

/**
 * The Clarity project to load, or null for none. Netlify sets CONTEXT on its
 * builds: "production" for the live site, "deploy-preview" or "branch-deploy"
 * otherwise. Local builds, `npm run dev` and CI leave it unset, so the
 * end-to-end tests and Lighthouse never load the tag. `netlify build` run
 * locally defaults to the production context, so its output carries the tag.
 */
export function clarityIdFor(context: string | undefined): string | null {
  return context === "production" ? site.clarityId : null;
}

/** How long after the load event the tag waits for, unless the visitor acts first. */
export const CLARITY_DELAY_MS = 3000;

/**
 * An inline loader for the Clarity tag. It queues calls until the tag arrives.
 * The tag's own script costs a few long tasks, so it waits for the load event,
 * then for the visitor's first scroll, tap or key or CLARITY_DELAY_MS, whichever
 * comes first, then for an idle moment: on a phone it stays clear of the page
 * becoming interactive. Inline, it gets a hash in the content security policy
 * like the theme boot script (scripts/write-csp.mjs).
 */
export function clarityLoader(id: string): string {
  const src = `${CLARITY_TAG_URL}${encodeURIComponent(id)}`;
  return `window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};addEventListener("load",function(){var d=0,e=["scroll","pointerdown","keydown"],g=function(){if(d)return;d=1;e.forEach(function(n){removeEventListener(n,g,true)});var a=function(){var s=document.createElement("script");s.async=true;s.src=${JSON.stringify(
    src,
  )};document.head.appendChild(s)};"requestIdleCallback" in window?requestIdleCallback(a,{timeout:2000}):a()};e.forEach(function(n){addEventListener(n,g,{capture:true,passive:true,once:true})});setTimeout(g,${CLARITY_DELAY_MS})})`;
}
