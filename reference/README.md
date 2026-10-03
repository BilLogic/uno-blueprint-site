# Reference

`prototype.html` is the approved design (the v7.5 outline), vendored as one file with its images embedded.

- It is the source of truth for look, copy, motion and breakpoints. Where the site and the prototype differ, the prototype wins.
- It is never served: it sits outside `app/` and `public/`, so the build does not copy it.
- Do not edit it. A design change arrives as a new prototype and replaces this file.

Open it straight from disk to compare (`open reference/prototype.html`). Its CSS is layered: a later rule in its `<style>` block overrides an earlier one, so read final values from the browser's computed styles rather than the first rule you find. `styles/tokens.css` records the final values as tokens.
