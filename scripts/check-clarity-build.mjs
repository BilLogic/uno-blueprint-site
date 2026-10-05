// Checks a production build (CONTEXT=production npm run build) in out/: the page
// requests this site's Clarity tag and the generated policy allows Clarity.
// CI runs it after the ordinary build, whose output the other jobs test, has been uploaded.
import { readFileSync } from "node:fs";
import { CLARITY_ID, CLARITY_TAG_URL } from "../lib/clarity-tag.mjs";

const tag = `${CLARITY_TAG_URL}${CLARITY_ID}`;
const html = readFileSync("out/index.html", "utf8");
const headers = readFileSync("out/_headers", "utf8");
const policy = headers.split("\n").find((line) => line.includes("Content-Security-Policy:")) ?? "";

const problems = [
  !html.includes(tag) && `out/index.html does not request ${tag}`,
  !/script-src [^;]*https:\/\/www\.clarity\.ms https:\/\/scripts\.clarity\.ms/.test(policy) &&
    "script-src does not allow Clarity's tag and script hosts",
  !/connect-src [^;]*https:\/\/\*\.clarity\.ms/.test(policy) && "connect-src does not allow Clarity",
  !/img-src [^;]*https:\/\/\*\.clarity\.ms/.test(policy) && "img-src does not allow Clarity",
].filter(Boolean);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`Production build requests ${tag} and its policy allows Clarity`);
