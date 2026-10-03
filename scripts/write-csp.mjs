// Writes out/_headers with a content security policy for the static export.
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

writeFileSync(join(out, "_headers"), `/*\n  Content-Security-Policy: ${buildPolicy(hashes)}\n`);
console.log(`Wrote ${out}/_headers with ${hashes.size} inline script hashes`);
