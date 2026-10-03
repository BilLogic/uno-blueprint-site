# uno-blueprint-site

The Uno Blueprint website: what it is, how it works, and how to start.

Next.js (App Router) rendered to a fully static export, TypeScript in strict mode, Tailwind CSS v4. The approved design is `reference/prototype.html`; where the site and the prototype disagree on look or behaviour, the prototype wins.

## Run it

Node 22 (`.nvmrc`) and npm.

Browser floor: Safari 17.5+, Chrome and Edge 123+, Firefox 120+. Every colour token is a CSS `light-dark()` pair, which older browsers do not support.

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # static export into out/, plus out/_headers
npm run serve      # serves out/ on http://localhost:4173 with those headers
```

## Where things live

| Path | What |
| --- | --- |
| `app/` | The page, its metadata, icons and preview image |
| `components/` | One folder per part of the page; components only render and animate |
| `content/` | Every word and link the page shows, apart from the components |
| `content/links.ts` | All links. One not ready yet carries `notReady: true` and renders inert in production builds (no `href`, `aria-disabled`); it stays clickable under `npm run dev`. List them with `grep -rn "notReady: true" content` |
| `styles/tokens.css` | Design tokens, declared once, exposed to Tailwind (see the mapping at its top) |
| `hooks/`, `lib/` | Small typed hooks, and the pure logic they use |
| `e2e/` | End-to-end, accessibility and visual tests against the built site |
| `reference/` | The prototype; never served |

## Test it

Every pull request runs all of these in CI (`.github/workflows/ci.yml`).

```bash
npm run typecheck
npm run lint
npm test           # unit tests (Vitest), pure logic only
npm run build      # the end-to-end tests and Lighthouse run against out/
npm run e2e        # Playwright: behaviour, axe in both themes, visual snapshots
npm run lhci       # Lighthouse, phone profile: 95 or more in all four categories
```

Lighthouse needs Chrome. Without a local Chrome, point it at Playwright's:
`CHROME_PATH="$(node -e "import('playwright-core').then(m=>console.log(m.chromium.executablePath()))")" npm run lhci`.

## Visual snapshots

Baselines live in `e2e/__snapshots__/` and are Linux renders, because font rasterisation differs between Linux and macOS. On macOS `npm run e2e` skips the visual tests (set `VISUAL=1` to run them against local renders); everything else runs.

A changed snapshot is reviewed in the pull request like code, never updated just to turn a build green. To regenerate them, either:

- **Locally, in the Playwright image** (needs Docker). Build first, then:

  ```bash
  docker run --rm --ipc=host -v "$PWD":/work -v /work/node_modules -w /work \
    mcr.microsoft.com/playwright:v1.63.0-noble \
    bash -c "npm ci && npx playwright test e2e/visual.spec.ts --update-snapshots"
  ```

  The second `-v` keeps the container's `node_modules` apart from yours. Keep the image tag equal to the `@playwright/test` version.

- **From CI.** Delete the snapshots that should change and push. Where a baseline is missing, the visual tests write the fresh render and fail (there are no retries, so a run never passes against a baseline it wrote itself); download the `snapshots` artifact from that run (`gh run download <run-id> -n snapshots -D e2e/__snapshots__`), look at the images, and commit them.

## Deploy

`netlify.toml` holds the build command, the publish folder (`out`), Node 22, the security headers and a year-long immutable cache for the hashed files under `/_next/static/`. The content security policy lists a hash for every inline script Next.js writes, so `npm run build` generates it into `out/_headers` (`scripts/write-csp.mjs`) instead of keeping it in `netlify.toml`; the build fails if it finds no inline scripts or misses the theme boot script. The end-to-end server (`scripts/serve.mjs`) applies the same `_headers`, so the tests run under the production policy. `npx netlify-cli build --offline` runs the same build locally.

## Upgrading

Two versions are written in three places each; change them together.

- **Node:** `.nvmrc`, `engines` in `package.json`, `NODE_VERSION` in `netlify.toml`.
- **Playwright:** `@playwright/test` in `package.json`, the container image in `.github/workflows/ci.yml`, and the `docker run` command above. A new Playwright usually renders differently, so regenerate the snapshots in the same pull request.
