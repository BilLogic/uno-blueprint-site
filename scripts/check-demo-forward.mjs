// Checks the /demo/ forward on a deployed copy of this site:
//   node scripts/check-demo-forward.mjs <base-url> <demo-site-url>
//
// The forward is a Netlify rewrite, which the local server cannot play, so this
// runs against a deploy preview. It waits for the preview to answer, then checks
// that the demo, a page under it and one of its scripts come through, and that
// each side keeps its own content security policy.
const [base, demoSite] = process.argv.slice(2).map((url) => url?.replace(/\/$/, ""));
if (!base || !demoSite) {
  console.error("usage: node scripts/check-demo-forward.mjs <base-url> <demo-site-url>");
  process.exit(2);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const csp = (response) => response.headers.get("content-security-policy") ?? "";

async function waitForPreview() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await fetch(`${base}/demo/`).catch(() => null);
    if (response?.ok) return response;
    await wait(10_000);
  }
  throw new Error(`${base}/demo/ did not answer 200 within ten minutes`);
}

const problems = [];
const expect = (ok, message) => ok || problems.push(message);

const demo = await waitForPreview();
const demoHtml = await demo.text();
const own = await fetch(`${demoSite}/demo/`);
expect(csp(demo) === csp(own), "/demo/ does not carry the demo site's own content security policy");

const deep = await fetch(`${base}/demo/blueprint/`);
expect(deep.ok, `/demo/blueprint/ answered ${deep.status}`);

const script = demoHtml.match(/\/demo\/assets\/[^"]+\.js/)?.[0];
expect(script, "/demo/ links no script under /demo/assets/");
if (script) {
  const asset = await fetch(`${base}${script}`);
  expect(asset.ok, `${script} answered ${asset.status}`);
  expect(/javascript/.test(asset.headers.get("content-type") ?? ""), `${script} is not served as JavaScript`);
}

const home = await fetch(`${base}/`);
expect(home.ok, `/ answered ${home.status}`);
expect(/script-src 'self' 'sha256-/.test(csp(home)), "/ does not carry this site's content security policy");

if (problems.length) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exit(1);
}
console.log(`✓ the demo comes through ${base}/demo/ with its own policy`);
