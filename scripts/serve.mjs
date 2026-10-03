// Serves the static export the way the host does: directory URLs resolve to
// index.html, unknown paths get 404.html, and the generated _headers apply, so
// end-to-end tests see the content security policy that production sends.
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const port = Number(process.env.PORT ?? 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

/** Parses Netlify's _headers format: a path line, then indented `Name: value` lines. */
function readHeaderRules() {
  const file = join(root, "_headers");
  if (!existsSync(file)) return [];
  const rules = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: {} });
      continue;
    }
    const at = line.indexOf(":");
    const rule = rules.at(-1);
    if (rule && at > 0) rule.headers[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return rules;
}

const rules = readHeaderRules();

function matches(pattern, path) {
  const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
  return re.test(path);
}

function locate(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, "");
  const candidate = join(root, safe);
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  const index = join(candidate, "index.html");
  if (existsSync(index)) return index;
  if (existsSync(`${candidate}.html`)) return `${candidate}.html`;
  return null;
}

createServer((req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  const file = locate(path);
  const status = file ? 200 : 404;
  const body = file ?? join(root, "404.html");
  for (const rule of rules) {
    if (!matches(rule.pattern, path)) continue;
    for (const [name, value] of Object.entries(rule.headers)) res.setHeader(name, value);
  }
  res.writeHead(status, { "Content-Type": types[extname(body)] ?? "application/octet-stream" });
  if (existsSync(body)) createReadStream(body).pipe(res);
  else res.end("Not found");
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
