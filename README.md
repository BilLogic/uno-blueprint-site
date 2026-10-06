# uno-blueprint-site

The website for [Uno Blueprint](https://github.com/BilLogic/uno-blueprint), an open-source toolkit for context engineering: a canvas for your team, a harness for your agents. Live at https://uno-blueprint.netlify.app.

Next.js (App Router) rendered to a fully static export, TypeScript in strict mode, Tailwind CSS v4. The approved design is `reference/prototype.html`; where the site and the prototype disagree on look or behaviour, the prototype wins.

## Run it

Node 22 (`.nvmrc`) and npm. Browser floor: Safari 17.5+, Chrome and Edge 123+, Firefox 120+, because every colour token is a CSS `light-dark()` pair.

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # static export into out/, plus out/_headers
npm run serve      # serves out/ on http://localhost:4173 with those headers
npm run og-image   # after a build: renders app/opengraph-image.png from the hero picture, via out/ on port 4177
```

## Where copy lives

Every word and link the page shows lives in `content/`, one file per section; components only render and animate.

| Path | What |
| --- | --- |
| `content/links.ts` | Every link. One not ready yet carries `notReady: true` and renders disabled in every build, `npm run dev` included (no `href`, `aria-disabled`); a button with a `soonLabel` says so in its own label ("Case study coming soon"), a nav item takes focus and shows "Coming soon" as a tooltip on hover or focus, and any other link is simply disabled. List them with `grep -rn "notReady: true" content` |
| `public/uno-blueprint.md`, `public/llms.txt` | The page as markdown for agents, and the index they read first |
| `app/` | The page, its metadata, icons and preview image |
| `components/`, `hooks/`, `lib/` | One folder per part of the page; small typed hooks and the pure logic they use |
| `styles/tokens.css` | Design tokens, declared once, exposed to Tailwind |
| `e2e/` | End-to-end, accessibility and visual tests against the built site |

## Test it

CI (`.github/workflows/ci.yml`) runs all of these on every pull request; a push to `main` runs only the build, as the rest ran on its pull request. A pull request that changes `netlify.toml` or `scripts/check-demo-forward.mjs` also checks the demo through its deploy preview (`.github/workflows/demo-forward.yml`):

```bash
npm run typecheck
npm run lint
npm test           # unit tests (Vitest)
npm run build      # the end-to-end tests and Lighthouse run against out/
npm run e2e        # Playwright: behaviour, axe in both themes, visual snapshots
npm run lhci       # Lighthouse, phone profile: 95 or more in all four categories
```

Lighthouse needs Chrome. Without one, use Playwright's:
`CHROME_PATH="$(node -e "import('playwright-core').then(m=>console.log(m.chromium.executablePath()))")" npm run lhci`.

Visual baselines in `e2e/__snapshots__/` are Linux renders. On macOS `npm run e2e` skips them (`VISUAL=1` runs them against local renders). A changed snapshot is reviewed in the pull request like code, never updated just to turn a build green. To regenerate, either:

- **Locally** (Docker), after a build. Keep the image tag equal to the `@playwright/test` version:

  ```bash
  docker run --rm --ipc=host -v "$PWD":/work -v /work/node_modules -w /work \
    mcr.microsoft.com/playwright:v1.63.0-noble \
    bash -c "npm ci && npx playwright test e2e/visual --update-snapshots"
  ```

- **From CI.** Delete the snapshots that should change and push. A missing baseline is written from the run's render and the test fails, so a run never passes against a baseline it wrote. Download the `snapshots` artifact (`gh run download <run-id> -n snapshots -D e2e/__snapshots__`), look at the images, and commit them.

## Deploy

Netlify builds the site from this repository: a merge to `main` deploys production, and every pull request gets a deploy preview. `netlify.toml` holds the build, Node 22, the security headers, the immutable cache for `/_next/static/`, and the rewrite that serves `/demo/` from the demo site. `npm run build` writes the content security policy into `out/_headers` (`scripts/write-csp.mjs`), and `scripts/serve.mjs` applies it, so the end-to-end tests run under the production policy.

## Upgrading

Change each version in all three places at once.

- **Node:** `.nvmrc`, `engines` in `package.json`, `NODE_VERSION` in `netlify.toml`.
- **Playwright:** `@playwright/test` in `package.json`, the container image in `.github/workflows/ci.yml`, and the `docker run` command above. Regenerate the snapshots in the same pull request.

## Credits

Built by Bill Guo and Meryem Marasli. MIT license: see [LICENSE](./LICENSE).
