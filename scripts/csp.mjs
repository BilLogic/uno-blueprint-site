import { createHash } from "node:crypto";

export const sha256 = (text) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

/**
 * A script element the browser runs: no type, a JavaScript type, or a module.
 * A data block such as application/ld+json is never run, so it needs no hash.
 */
const runs = (attrs) => {
  const type = /\btype=["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
  return type === undefined || type === "module" || /^(text|application)\/(x-)?(java|ecma)script$/.test(type);
};

/** Hashes of every inline (no src) script the browser runs in an HTML document. */
export function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs) || body.length === 0 || !runs(attrs)) continue;
    hashes.add(sha256(body));
  }
  return hashes;
}

/** Why the hashes cannot make a working policy, or null when they can. */
export function hashProblem(hashes, bootScript) {
  if (hashes.size === 0) return "CSP: no inline scripts found in out/; the build output is not what write-csp expects";
  if (!hashes.has(sha256(bootScript))) return "CSP: the theme boot script's hash is missing; it would be blocked in production";
  return null;
}

export function buildPolicy(hashes) {
  return [
    "default-src 'self'",
    `script-src 'self' ${[...hashes].sort().join(" ")}`,
    // Components pass custom properties (--row, --n) through React style props,
    // which the static HTML carries as style attributes. Attributes cannot be
    // hashed without 'unsafe-hashes', so styles allow inline; scripts never do.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** The policy as a meta tag can carry it: browsers ignore frame-ancestors there and warn about it. */
export const metaPolicy = (hashes) => buildPolicy(hashes).replace("; frame-ancestors 'none'", "");
