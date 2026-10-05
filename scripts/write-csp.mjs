// Writes out/_headers with a content security policy for the static export's pages.
//
// Next.js inlines its page data as <script> tags, and the theme script in
// <head> is inline too. Rather than allow every inline script, the policy lists
// the hash of each one, so it has to be computed from the build output. The
// other security headers do not change between builds and live in netlify.toml.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { themeBootScript } from "../lib/theme-boot.mjs";
import { buildPolicy, hashProblem, inlineScriptHashes } from "./csp.mjs";

const out = "out";

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

const hashes = new Set(
  htmlFiles(out).flatMap((file) => [...inlineScriptHashes(readFileSync(file, "utf8"))]),
);

const problem = hashProblem(hashes, themeBootScript);
if (problem) {
  console.error(problem);
  process.exit(1);
}

// The policy goes on this site's own pages, path by path, never on `/*`: a `/*`
// rule would also stamp it on the demo that netlify.toml forwards at /demo/,
// whose scripts and connections it does not list.
const routes = new Set(htmlFiles(out).flatMap((file) => {
  const path = `/${file.slice(out.length + 1)}`;
  if (path === "/index.html") return ["/", path];
  if (path.endsWith("/index.html")) {
    const dir = path.slice(0, -"index.html".length);
    return [dir, dir.slice(0, -1), path];
  }
  return [path, path.slice(0, -".html".length)];
}));

const policy = `  Content-Security-Policy: ${buildPolicy(hashes)}\n`;
writeFileSync(join(out, "_headers"), [...routes].map((route) => `${route}\n${policy}`).join(""));
console.log(`Wrote ${out}/_headers with ${hashes.size} inline script hashes for ${routes.size} routes`);
