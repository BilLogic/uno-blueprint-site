# Reference

`prototype.html` is the approved design (the v7.6 outline, artifact v69), vendored as one file with its images embedded.

- It is the source of truth for look, copy, motion and breakpoints. Where the site and the prototype differ, the prototype wins.
- It is never served: it sits outside `app/` and `public/`, so the build does not copy it.
- Do not edit it. A design change arrives as a new prototype and replaces this file.

Open it straight from disk to compare (`open reference/prototype.html`). Its CSS is layered: a later rule in its `<style>` block overrides an earlier one, so read final values from the browser's computed styles rather than the first rule you find. `styles/tokens.css` records the final values as tokens.

## What v7.6 changed from v7.5

- Copy: round 5 across the page, from the section sub-headlines to the walkthrough captions, bento cards and canvas tabs; the closing band drops its sub-headline.
- Walkthrough: a new first step, "Your context", whose six tool cards play into the stack on a scroll threshold and hand over to Services; the walkthrough moves one step at a time, with about half a screen of scroll per step on a desktop and a little more on a phone; it follows the scroll and never holds the page, while each step still shows in turn, so a fast scroll skips none; Cells and Inside a cell are one step, where the chosen cell lights on the flat board and opens a beat later; the stage clips only its sides and top, so the open cell's shadow runs past its foot, and the dotted field fades in and out with no hard edge; the flat board sits evenly between frame and caption.
- Hero: people and agents walk to tools and panel fields; each loop opens on the board alone, then the panel slides in; anyone on the panel walks back to a cell when it closes; the row keeps one gap and matching margins, and the board alone keeps even padding on every side; a phone never shows the panel.
- Get started: the agent prompt uses the initialiser, the yarn tab carries the Yarn 1 note, and a new Database step offers a prompt per host.
- Harness and bento motion: the map picture ends without a sign-off tag, what-if weighs its three options together, Planned turns to Live letter by letter, and the RAG question types itself out.
- Polish: question rules and the first question's alignment, a light/dark terminal colour for code blocks, in-page links that glide past the pinned walkthrough, corner markers on rounded corners, the PLUS screenshot filling its window.
- Agent view: rewritten for the initialiser and the database step.
