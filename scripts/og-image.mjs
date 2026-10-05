// Renders app/opengraph-image.png, the picture a shared link shows, from the built site.
//
// It serves out/, opens the page with reduced motion so the hero picture holds
// its finished frame (tools, the node, the board with its walkers, the panel
// open on one cell), and photographs that picture without its background. It
// then lays the picture on the stage's dotted background beside the mark and
// the headline, in a page of its own on the same origin so the site's fonts
// load, and photographs that at 1200 by 630.
//
// Run `npm run build` first, then `npm run og-image`. PORT picks the port (4177).
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { chromium } from "@playwright/test";

const port = Number(process.env.PORT ?? 4177);
const origin = `http://localhost:${port}`;
const output = "app/opengraph-image.png";
const size = { width: 1200, height: 630 };
const headline = "Get your human and AI teammates on the same page.";
const name = "Uno Blueprint";

async function serve() {
  const server = spawn(process.execPath, ["scripts/serve.mjs", "out"], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${origin}/`)).ok) return server;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  server.kill();
  throw new Error(`og-image: nothing answered on ${origin}; is the port taken, and has the site been built?`);
}

/** The hero picture's finished frame, on a transparent background, and the colours and font around it. */
async function photographHero(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1400 }, deviceScaleFactor: 2, colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(`${origin}/`);
  await page.evaluate(() => document.fonts.ready);
  // Settled once the beams are drawn and the projection into the panel has its corners.
  await page.waitForFunction(() => document.querySelector("[role=img] polygon")?.getAttribute("points")?.match(/\d/));
  await page.waitForTimeout(500);
  const look = await page.evaluate(() => {
    const frame = document.querySelector("[data-testid=hero-frame]");
    const stage = document.querySelector("[data-testid=hero-stage]");
    const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    // A colour token resolved for the light theme, as rgb() a plain page can use.
    const resolve = (value) => {
      const probe = document.createElement("i");
      probe.style.color = value;
      document.body.append(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      return rgb;
    };
    const look = {
      card: getComputedStyle(frame).backgroundColor,
      dot: resolve(css("--color-line-2")),
      ink: resolve(css("--color-ink")),
      font: getComputedStyle(document.body).fontFamily,
      stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.href),
    };
    // Only the picture: the rim, the frame's fill, the dots and the page behind go, so the composition's own dots show through.
    for (const element of [document.documentElement, document.body, frame.parentElement, frame]) element.style.background = "transparent";
    stage.querySelector(".hero-dots")?.remove();
    // The stage's padding goes too: the photograph is cropped to the tools, the node, the board, the panel and
    // the walkers, with room for the panel's shadow.
    const parts = [...stage.children].filter((child) => getComputedStyle(child).position !== "absolute");
    const boxes = [...parts, ...stage.querySelectorAll("[data-placed]")].map((element) => element.getBoundingClientRect());
    const margin = 32;
    const left = Math.min(...boxes.map((b) => b.left)) - margin;
    const top = Math.min(...boxes.map((b) => b.top)) - margin;
    const right = Math.max(...boxes.map((b) => b.right)) + margin;
    const bottom = Math.max(...boxes.map((b) => b.bottom)) + margin;
    look.clip = { x: left + scrollX, y: top + scrollY, width: right - left, height: bottom - top };
    return look;
  });
  const picture = await page.screenshot({ clip: look.clip, omitBackground: true, animations: "disabled" });
  await page.close();
  return { picture, look };
}

function composition({ picture, look }) {
  const links = look.stylesheets.map((href) => `<link rel="stylesheet" href="${href}">`).join("");
  return `<!doctype html><html><head><meta charset="utf-8">${links}<style>
    html, body { margin: 0; background: ${look.card}; }
    .card { position: relative; width: ${size.width}px; height: ${size.height}px; overflow: hidden; background: ${look.card}; font-family: ${look.font}; color: ${look.ink}; }
    .dots { position: absolute; inset: 0; background-image: radial-gradient(${look.dot} 1px, transparent 1px); background-size: 20px 20px; background-position: 10px 10px; }
    .words { position: absolute; top: 40px; left: 56px; display: grid; gap: 12px; }
    .name { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 500; letter-spacing: -0.01em; }
    .name img { width: 30px; height: 30px; border-radius: 7px; }
    .headline { margin: 0; font-size: 34px; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em; }
    .picture { position: absolute; left: 50%; bottom: 4px; max-width: 1130px; max-height: 496px; transform: translateX(-50%); }
  </style></head><body><div class="card">
    <div class="dots"></div>
    <div class="words">
      <div class="name"><img src="/images/uno-mark-light.png" alt="">${name}</div>
      <p class="headline">${headline}</p>
    </div>
    <img class="picture" src="data:image/png;base64,${picture.toString("base64")}" alt="">
  </div></body></html>`;
}

const server = await serve();
const browser = await chromium.launch();
try {
  const hero = await photographHero(browser);
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
  // A page of its own, served from the site's origin so its stylesheets and fonts load.
  await page.route(`${origin}/__og-image`, (route) => route.fulfill({ contentType: "text/html", body: composition(hero) }));
  await page.goto(`${origin}/__og-image`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  await page.locator(".card").screenshot({ path: output });
  console.log(`Wrote ${output} (${Math.round(statSync(output).size / 1024)} KB)`);
} finally {
  await browser.close();
  server.kill();
}
