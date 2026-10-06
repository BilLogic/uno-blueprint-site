import { site } from "@/content/site";
import { CLARITY_OPT_OUT_KEY, CLARITY_TAG_URL } from "./clarity-tag.mjs";

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

/** What a visit asks of Clarity: the address's `?clarity=`, the stored mark, and whether a script drives the browser. */
export type ClarityVisit = { param: string | null; stored: string | null; webdriver: boolean };

/**
 * Whether Clarity loads for a visit, and what happens to the stored mark first.
 * `?clarity=off` marks the browser as the team's own and `?clarity=on` clears
 * the mark; either decides this visit too, so it holds even when storage
 * cannot be written. An automated browser never loads it. When storage cannot
 * be read, `stored` is null and the visit loads as anyone else's would.
 * The inline loader below runs the same rule; a test holds the two together.
 */
export function clarityChoice({ param, stored, webdriver }: ClarityVisit): {
  store: "off" | "clear" | "keep";
  load: boolean;
} {
  const store = param === "off" ? "off" : param === "on" ? "clear" : "keep";
  const ours = param === "off" || (param !== "on" && stored === "off");
  return { store, load: !ours && !webdriver };
}

/**
 * An inline loader for the Clarity tag. It runs in three parts.
 *
 * First the opt-out: it reads `?clarity=`, takes it out of the address so a
 * shared link never carries it, and sets or clears the stored mark
 * (clarityChoice). A browser marked as ours, or one a script drives, stops
 * there, before the queue or any listener exists. Every storage call sits in
 * a try, so private modes that refuse storage load as a normal visitor.
 *
 * Then it queues calls until the tag arrives. The tag's own script costs a few
 * long tasks, so it waits for the load event, then for the visitor's first
 * scroll, tap or key or CLARITY_DELAY_MS, whichever comes first, then for an
 * idle moment: on a phone it stays clear of the page becoming interactive.
 * Inline, it gets a hash in the content security policy like the theme boot
 * script (scripts/write-csp.mjs).
 */
export function clarityLoader(id: string): string {
  const src = `${CLARITY_TAG_URL}${encodeURIComponent(id)}`;
  const key = JSON.stringify(CLARITY_OPT_OUT_KEY);
  const optOut =
    `var p=null,s=null;` +
    `try{var u=new URL(location.href);p=u.searchParams.get("clarity");if(p!==null){u.searchParams.delete("clarity");history.replaceState(history.state,"",u.pathname+u.search+u.hash)}}catch(e){}` +
    `try{if(p==="off")localStorage.setItem(${key},"off");else if(p==="on")localStorage.removeItem(${key});s=localStorage.getItem(${key})}catch(e){}` +
    `if(p==="off"||p!=="on"&&s==="off"||navigator.webdriver)return;`;
  const queue = `window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};`;
  const load = `addEventListener("load",function(){var d=0,e=["scroll","pointerdown","keydown"],g=function(){if(d)return;d=1;e.forEach(function(n){removeEventListener(n,g,true)});var a=function(){var s=document.createElement("script");s.async=true;s.src=${JSON.stringify(
    src,
  )};document.head.appendChild(s)};"requestIdleCallback" in window?requestIdleCallback(a,{timeout:2000}):a()};e.forEach(function(n){addEventListener(n,g,{capture:true,passive:true,once:true})});setTimeout(g,${CLARITY_DELAY_MS})})`;
  return `(function(){${optOut}${queue}${load}})()`;
}
