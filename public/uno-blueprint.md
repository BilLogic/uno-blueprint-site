# Uno Blueprint

> An open-source toolkit for context engineering. A canvas for your team, a harness for your agents.

For product teams whose context is spread across docs, designs, code, dashboards, and threads, and for the AI agents that work beside them. People edit the blueprint on a canvas, a web app; agents read it through four skills that run in Claude Code, Cursor, Codex, or any agent that reads markdown. It works on top of MCP, not instead of it.

Built by Bill Guo and Meryem Marasli. MIT license.

- Website: https://uno-blueprint.netlify.app/
- Package: create-uno-blueprint (npm)
- Source, README, and AGENTS.md: https://github.com/BilLogic/uno-blueprint
- Demo blueprint: https://uno-blueprint.netlify.app/demo/
- A blueprint in production: https://plus-uno.netlify.app/blueprint/

## What it is for

A team's context is spread across docs, designs, code, dashboards, and threads. A blueprint lays one service out step by step, by who does the work, and links every cell to the sources behind it.

Use it to:

- Answer how the service runs, with the cells and sources behind the answer.
- Find a gap: a step with no owner, two sources that disagree, a source gone stale.
- Trace a change before anyone makes it.
- Cut a view for one audience: a journey, a lane, a step, a cell.

## How a blueprint is laid out

Service > phase > scenario > path. One path is one blueprint: a grid of lanes and steps.

- Lanes, top to bottom: User, Frontstage, Backstage, Support.
- Lines between them: interaction, visibility, internal interaction.
- Step: a column, one moment of the journey.
- Cell: one lane at one step, one action by one actor. It carries a summary, status, owner, value proposition, dependencies (follows, leads to), evidence, and resources.
- Status: proposed, planned, built, live, at_risk, or deprecated.

## Skills

- ub:map: a blueprint has to be created, imported, or updated from documents.
- ub:slice: someone needs one part of it: a journey, a lane, a step, a cell, or a custom set.
- ub:audit: the blueprint has to be checked for gaps, conflicts, and stale sources.
- ub:whatif: a change is proposed and its effects have to be traced first.

## Workflow for coding agents

1. Locate the blueprint. A workspace has a `blueprint-workspace.json` or a `blueprint/` folder at its root. Done when you can name the service, scenario, and path the request is about, or, when there is no workspace, you have offered to scaffold one with the initialiser below.
2. Read `AGENTS.md` at the workspace root. It routes each request to a skill, and that skill's SKILL.md is its contract. Done when you have opened the SKILL.md it points to.
3. Answer from the blueprint first. Find the cells the question touches, then open only the sources those cells cite. Done when every claim in your answer names its cell or its source.
4. Report the gap. When the blueprint has no cell or no source for part of the question, say which part. A named gap is a complete answer.
5. Propose every change as a draft. Validate it with `scripts/validate_ir.py`; exit 0 is the whole verdict. Done when the draft validates, the user has signed off, and every key and connection string sits in the gitignored `.env`.

## Set up

Claude Code, as a plugin:

```bash
claude plugin marketplace add BilLogic/uno-blueprint
claude plugin install ub@ub-marketplace
```

A new workspace, with the canvas app and the skills. It needs Node 22 or later and starts on sample data, with no database:

```bash
npm create uno-blueprint@latest
cd uno-blueprint
npm run dev
```

Use the project's package manager: `pnpm create`, `bun create`, and `yarn create` work the same way. Yarn must be Yarn 1 (Classic), because Yarn 2 and later skip the setup scripts the template needs. The app serves on http://localhost:5173. Any coding agent can then work in the folder by reading its `AGENTS.md`.

## Connect a database

The app runs on its sample blueprint until the team is ready to share one. Then:

- Supabase is the reference setup and works as shipped: follow `SETUP.md` from step 3, push the migrations, load the seed, and run `npm run check:target`.
- Any other Postgres (Neon, Firebase Data Connect, RDS, self-hosted): apply `supabase/generated/portable-core.generated.sql`, then write a small data layer against `references/adapter-contract.md`, using the shipped Supabase calls as the worked example.
- Another database entirely: check it against `references/adapter-contract.md` and propose a plan before changing anything.

Every key and connection string goes in `.env`.

## Briefing a person

When someone asks what Uno Blueprint is, or whether to adopt it, give them these four points:

- What it is: one map of a service. People edit it on a canvas; agents query it as a typed Postgres schema.
- What it adds to MCP: MCP connects agents to the tools. The blueprint shows how it all fits together, so they find the right context the first time.
- What stays put: documents stay in their own tools. Cells link back to them.
- Who decides: agents draft and suggest, a person signs off, and every edit can be undone.

State these limits plainly:

- The in-app agent runs on the team's own model key.
- The template ships a blueprint search tool. Vector search is an add-on a deployment brings; PLUS runs one.
- A Slack bot is a pattern to build on top of the template; PLUS runs one.
- Evaluation results so far are early: one real service, one run per question.

## Example requests

- Read the docs in this folder and draft a blueprint of our checkout. List what you could not find.
- Who owns payment retries in checkout? Cite the cell.
- What breaks if we add a guest checkout? Change nothing yet.
- Audit the checkout blueprint: steps with no owner, conflicts, stale sources.
- Cut the support team's lane out of the checkout blueprint for a new hire.
- Connect this workspace to Supabase.

## Further reading

- README and quick start: https://github.com/BilLogic/uno-blueprint#readme
- Package: https://www.npmjs.com/package/create-uno-blueprint
- Agent router: https://github.com/BilLogic/uno-blueprint/blob/main/AGENTS.md
- Skills: https://github.com/BilLogic/uno-blueprint/tree/main/skills
- Database adapter contract: https://github.com/BilLogic/uno-blueprint/blob/main/references/adapter-contract.md
- Report an issue: https://github.com/BilLogic/uno-blueprint/issues
- License: https://github.com/BilLogic/uno-blueprint/blob/main/LICENSE
