# uno-blueprint-site

The website for [Uno Blueprint](https://github.com/BilLogic/uno-blueprint), an open-source toolkit for context engineering: a canvas for your team, a harness for your agents. Live at https://uno-blueprint.netlify.app.

The site says what Uno Blueprint is, shows how it works, and gets a team started. The same page is served as markdown for agents (`public/uno-blueprint.md`), with an index at `public/llms.txt`.

Next.js (App Router) rendered to a fully static export, TypeScript in strict mode, Tailwind CSS v4. The approved design is `reference/prototype.html`; where the site and the prototype disagree on look or behaviour, the prototype wins.

## Run it

Node 22 (`.nvmrc`) and npm.

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # static export into out/, plus out/_headers
npm run serve      # serves out/ on http://localhost:4173 with those headers
```

Browser floor: Safari 17.5+, Chrome and Edge 123+, Firefox 120+. Every colour token is a CSS `light-dark()` pair, which older browsers lack.

## Where copy lives

Every word and link the page shows lives in `content/`, one file per section. Change copy there; components only render and animate.

| Path | What |
| --- | --- |
| `content/` | The page's copy, one file per section. `site.ts` holds the name, URL and description the metadata uses |
| `content/links.ts` | Every link. One not ready yet carries `notReady: true` and renders disabled in every build (no `href`, `aria-disabled`); a button or nav item also says "Coming soon". List them with `grep -rn "notReady: true" content` |
| `public/uno-blueprint.md` | The agent guide: the page as markdown, also shown in the page's agent view |
| `public/llms.txt` | The index agents read first |
| `app/` | The page, its metadata, icons and preview image |
| `components/` | One folder per part of the page |
| `styles/tokens.css` | Design tokens, declared once, exposed to Tailwind (see the mapping at its top) |
| `hooks/`, `lib/` | Small typed hooks, and the pure logic they use |
| `e2e/` | End-to-end, accessibility and visual tests against the built site |
| `reference/` | The prototype; never served |

## Test it

CI (`.github/workflows/ci.yml`) runs all of these on every pull request:

```bash
npm run typecheck
npm run lint
npm test           # unit tests (Vitest), pure logic only
npm run build      # the end-to-end tests and Lighthouse run against out/
npm run e2e        # Playwright: behaviour, axe in both themes, visual snapshots
npm run lhci       # Lighthouse, phone profile: 95 or more in all four categories
```

On a pull request, CI also checks that `/demo/` forwards to the demo site on the deploy preview (`scripts/check-demo-forward.mjs`).

Lighthouse needs Chrome. Without a local Chrome, point it at Playwright's:
`CHROME_PATH="$(node -e "import('playwright-core').then(m=>console.log(m.chromium.executablePath()))")" npm run lhci`.

### Visual snapshots

Baselines live in `e2e/__snapshots__/` and are Linux renders, because font rasterisation differs between Linux and macOS. On macOS `npm run e2e` skips the visual tests (set `VISUAL=1` to run them against local renders); everything else runs.

A changed snapshot is reviewed in the pull request like code. To regenerate them, either:

- **Locally, in the Playwright image** (needs Docker). Build first, then:

  ```bash
  docker run --rm --ipc=host -v "$PWD":/work -v /work/node_modules -w /work \
    mcr.microsoft.com/playwright:v1.63.0-noble \
    bash -c "npm ci && npx playwright test e2e/visual.spec.ts --update-snapshots"
  ```

  The second `-v` keeps the container's `node_modules` apart from yours. Keep the image tag equal to the `@playwright/test` version.

- **From CI.** Delete the snapshots that should change and push. Where a baseline is missing, the visual tests write the fresh render and fail, so a run never passes against a baseline it wrote itself. Download the `snapshots` artifact from that run (`gh run download <run-id> -n snapshots -D e2e/__snapshots__`), look at the images, and commit them.

## Deploy

Netlify builds the site from this repository. A merge to `main` deploys production; every pull request gets its own deploy preview.

`netlify.toml` holds the build command, the publish folder (`out`), Node 22, the security headers, a year-long immutable cache for the hashed files under `/_next/static/`, and the rewrite that serves `/demo/` from the demo site. The content security policy lists a hash for every inline script Next.js writes, so `npm run build` generates it into `out/_headers` (`scripts/write-csp.mjs`); the build fails if it finds no inline scripts or misses the theme boot script. `scripts/serve.mjs` applies the same `_headers`, so the end-to-end tests run under the production policy. `npx netlify-cli build --offline` runs the same build locally.

## Upgrading

Two versions are written in three places each; change them together.

- **Node:** `.nvmrc`, `engines` in `package.json`, `NODE_VERSION` in `netlify.toml`.
- **Playwright:** `@playwright/test` in `package.json`, the container image in `.github/workflows/ci.yml`, and the `docker run` command above. A new Playwright usually renders differently, so regenerate the snapshots in the same pull request.

## Credits

Built by Bill Guo and Meryem Marasli. MIT license: see [LICENSE](./LICENSE).
