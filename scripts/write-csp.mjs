// Writes out/_headers with a content security policy for the static export.
//
// Next.js inlines its page data as <script> tags, and the theme script in
// <head> is inline too. Rather than allow every inline script, the policy lists
// the hash of each one, so it has to be computed from the build output. The
// other security headers do not change between builds and live in netlify.toml.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = "out";

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

const hashes = new Set();
for (const file of htmlFiles(out)) {
  const html = readFileSync(file, "utf8");
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(attrs) || body.length === 0) continue;
    hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
  }
}

const policy = [
  "default-src 'self'",
  `script-src 'self' ${[...hashes].sort().join(" ")}`,
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

writeFileSync(join(out, "_headers"), `/*\n  Content-Security-Policy: ${policy}\n`);
console.log(`Wrote ${out}/_headers with ${hashes.size} inline script hashes`);
