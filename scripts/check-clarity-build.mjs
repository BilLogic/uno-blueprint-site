// Checks a production build (CONTEXT=production npm run build) in out/: the page
// requests this site's Clarity tag, its loader skips our own browsers and
// automated ones, and the generated policy allows Clarity and the loader's hash.
// CI runs it after the ordinary build, whose output the other jobs test, has been uploaded.
import { readFileSync } from "node:fs";
import { CLARITY_ID, CLARITY_OPT_OUT_KEY, CLARITY_TAG_URL } from "../lib/clarity-tag.mjs";
import { sha256 } from "./csp.mjs";

const tag = `${CLARITY_TAG_URL}${CLARITY_ID}`;
const html = readFileSync("out/index.html", "utf8");
const headers = readFileSync("out/_headers", "utf8");
const policy = headers.split("\n").find((line) => line.includes("Content-Security-Policy:")) ?? "";

// The inline script that requests the tag: the loader in lib/analytics.ts.
const loader = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(([, body]) => body)
  .find((body) => body.includes(tag));
const optOutFirst = loader?.indexOf(JSON.stringify(CLARITY_OPT_OUT_KEY)) ?? -1;

const problems = [
  !loader && `out/index.html has no inline script requesting ${tag}`,
  loader && optOutFirst === -1 && `the Clarity loader does not read the ${CLARITY_OPT_OUT_KEY} opt-out`,
  loader && !loader.includes("navigator.webdriver") && "the Clarity loader does not skip automated browsers",
  loader &&
    optOutFirst > loader.indexOf("window.clarity=") &&
    "the Clarity loader defines its queue before the opt-out check",
  loader && !policy.includes(sha256(loader)) && "script-src does not carry the Clarity loader's hash",
  !/script-src [^;]*https:\/\/www\.clarity\.ms https:\/\/scripts\.clarity\.ms/.test(policy) &&
    "script-src does not allow Clarity's tag and script hosts",
  !/connect-src [^;]*https:\/\/\*\.clarity\.ms/.test(policy) && "connect-src does not allow Clarity",
  !/img-src [^;]*https:\/\/\*\.clarity\.ms/.test(policy) && "img-src does not allow Clarity",
].filter(Boolean);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Production build requests ${tag} behind the opt-out, and its policy allows Clarity and the loader's hash`);
