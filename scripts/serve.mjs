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
  ".xml": "application/xml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
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
  let path;
  let file;
  try {
    path = new URL(req.url ?? "/", "http://localhost").pathname;
    file = locate(path);
  } catch {
    // A malformed URL (a stray % escape, say) is the client's mistake, not a crash.
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Bad request");
    return;
  }
  const status = file ? 200 : 404;
  const body = file ?? join(root, "404.html");
  for (const rule of rules) {
    if (!matches(rule.pattern, path)) continue;
    for (const [name, value] of Object.entries(rule.headers)) res.setHeader(name, value);
  }
  const type = types[extname(body)] ?? "application/octet-stream";
  // Safari plays video only from a server that answers byte ranges, so a single range gets a 206.
  const range = file && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
  if (range && (range[1] || range[2])) {
    const size = statSync(file).size;
    const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
      return;
    }
    res.writeHead(206, { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(status, { "Content-Type": type, ...(file && { "Accept-Ranges": "bytes" }) });
  if (existsSync(body)) createReadStream(body).pipe(res);
  else res.end("Not found");
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
