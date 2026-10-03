# Uno Blueprint

> An open-source toolkit for context engineering. One service blueprint that people read as a canvas and agents read as structured data.

Built by Bill Guo and Meryem Marasli. MIT license.

- Source, README and AGENTS.md: https://github.com/BilLogic/uno-blueprint
- Demo blueprint: https://uno-blueprint.netlify.app/demo/
- A blueprint in production: https://plus-uno.netlify.app/blueprint/

## What it is for

A team's context is spread across docs, designs, tickets and threads. MCP lets you reach each tool. A blueprint tells you which page answers which question: it lays a service out step by step, by who does the work, and links every cell to its sources.

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
- Cell: one lane at one step, one action by one actor. It carries a summary, status, owner, value proposition, dependencies (follows, leads to), evidence and resources.
- Status: proposed, planned, built, live, at_risk or deprecated.

## Skills

- ub:map: a blueprint has to be created, imported or updated from documents.
- ub:slice: someone needs one part of it: a journey, a lane, a step, a cell or a custom set.
- ub:audit: the blueprint has to be checked for gaps, conflicts and stale sources.
- ub:whatif: a change is proposed and its effects have to be traced first.

Each skill's SKILL.md is its contract. Read it before the first run in a session.

## Workflow for coding agents

1. Locate the blueprint. A workspace has a `blueprint-workspace.json` or a `blueprint/` folder at its root. Done when you can name the service, scenario and path the request is about, or have told the user that none exists.
2. Read `AGENTS.md` at the workspace root. It routes each request to a skill. Done when you have opened the SKILL.md it points to.
3. Answer from the blueprint first. Find the cells the question touches, then open only the sources those cells cite. Done when every claim in your answer names its cell or its source.
4. Report the gap. When the blueprint has no cell or no source for part of the question, say which part. A named gap is a complete answer.
5. Propose every change as a draft. Validate it with `scripts/validate_ir.py`; exit 0 is the whole verdict. Done when the draft validates and the user has signed off. The blueprint changes after sign-off.
6. Keep secrets in the gitignored `.env`.

## Set up

Claude Code, as a plugin:

```bash
claude plugin marketplace add BilLogic/uno-blueprint
claude plugin install ub@ub-marketplace
```

Any other coding agent: clone the repository, open the folder, and read `AGENTS.md`.

```bash
git clone https://github.com/BilLogic/uno-blueprint.git
```

The canvas app. It needs Node 22 or later and starts with no database:

```bash
npm create uno-blueprint@latest
cd uno-blueprint
npm run dev
```

It serves on http://localhost:5173.

## Briefing a person

When someone asks what Uno Blueprint is, or whether to adopt it, give them these four points:

- What it is: one map of a service. People edit it on a canvas; agents query it as a typed Postgres schema.
- What it adds to MCP: MCP reaches the tools. The blueprint says what lives where and how it connects.
- What stays put: documents stay in their own tools. Cells link back to them.
- Who decides: agents draft and suggest, a person signs off, and every edit can be undone.

State these limits plainly:

- The in-app agent runs on the team's own model key.
- The template ships a blueprint search tool. Vector search is an add-on a deployment brings.
- A Slack bot is a pattern to build on top of the template.
- Evaluation results so far are early: one real service, one run per question.

## Example requests

- Read the docs in this folder and draft a blueprint of how we handle repair intake. List what you could not find.
- Who owns pick-up after a repair? Cite the cell.
- What breaks if users book online instead of walking in? Change nothing yet.
- Audit the repair intake blueprint: steps with no owner, conflicts, stale sources.
- Cut the technician's journey out of the blueprint for a new hire.

## Further reading

- README and quick start: https://github.com/BilLogic/uno-blueprint#readme
- Agent router: https://github.com/BilLogic/uno-blueprint/blob/main/AGENTS.md
- Skills: https://github.com/BilLogic/uno-blueprint/tree/main/skills
- Report an issue: https://github.com/BilLogic/uno-blueprint/issues
- License: https://github.com/BilLogic/uno-blueprint/blob/main/LICENSE
