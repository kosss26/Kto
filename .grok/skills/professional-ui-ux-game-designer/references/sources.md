# Sources and limits

Read this before claiming a catalog match. If a file is listed as not read,
say so and use the rules in the other references instead of inventing a row.

Studied 2026-11-17 from public pages.

## Read and distilled

**nextlevelbuilder/ui-ux-pro-max-skill** (public, `main`)

- Repo tree via the GitHub API (858 paths). Skill entry `.claude/skills/ui-ux-pro-max/SKILL.md` in full.
- `references/pro-rules.md` in full (icons, touch, contrast, safe area, pre-delivery checklist; scoped there to native/mobile).
- `references/quick-reference.md` headings only — body is the same 10-priority rule set as the CSV.
- `data/ux-guidelines.csv` — all 120 rows (category, issue, platform, do/don't, severity).
- `data/motion.csv` — all 17 GSAP presets (tiers and intent, not the snippets as a dependency).
- `data/styles.csv` — columns plus each active style's name, best-for, avoid, accessibility risk, preferred mode. Not the CSS keyword or implementation-checklist cells.
- `data/ui-reasoning.csv` — schema (192 categories). Rows actually read: SaaS (General), E-commerce, Financial Dashboard, Healthcare App, Educational App, Portfolio/Personal, Gaming, Fintech/Crypto, Social Media App, Productivity Tool, Casual Puzzle Game, Trivia & Quiz Game, Card & Board Game, Idle & Clicker Game, Word & Crossword Game, Arcade & Retro Game.
- `data/landing.csv` — column schema and all 34 pattern names. Not every pattern's section order.
- `data/products.csv`, `colors.csv`, `typography.csv`, `app-interface.csv` — column schemas and counts only, plus a short product-name sample. Hex palettes and font pairings were **not** copied.
- Design-system sub-skill: `SKILL.md`, `references/token-architecture.md`, `references/states-and-variants.md` in full. `semantic-tokens.md` and `component-specs.md` only through the primary color roles and the button spec. `primitive-tokens.md`, `component-tokens.md`, `tailwind-integration.md` not read.
- `ui-styling/SKILL.md` intro (through the shadcn quick start). Its references (shadcn a11y, Tailwind utilities, canvas fonts) were not read.

**anthropics/skills** `skills/frontend-design/SKILL.md` — full file.

**vercel-labs/web-interface-guidelines** — `AGENTS.md` in full. `README.md` and `command.md` were downloaded and not used; the rules live in `AGENTS.md`. Repo also contains `LICENSE` and `install.sh` (not read).

**Unity** — https://unity.com/blog/video-game-ui-ux-basics (Unity Team, 2026-10-23). Full article: UI vs UX, building blocks, four placements, 7-step process, principles, accessibility summary, good/bad pairs, checklist, closing.

**Game Accessibility Guidelines**

- https://gameaccessibilityguidelines.com/ — level definitions
- `/basic/`, `/intermediate/`, `/advanced/` — every title in every category
- Guideline detail pages and `/full-list/` were not opened

## Seen in the tree, not read

Do not quote these:

- `google-fonts.csv`, `google-font-licenses.json`, `phosphor-icons-upstream.json`, `icons.csv`, `charts.csv`, `react-performance.csv`
- All `data/stacks/*.csv` (react, shadcn, html-tailwind, threejs, swiftui, flutter, and the rest)
- Brand, banner, logo, slides, and CIP sub-skills
- `src/ui-ux-pro-max/templates/**`, CLI, gallery, preview, scripts, journals
- Premium product features (the README describes a paid tier; it was not available)

## How to apply

The skill is judgment plus the rules in the sibling files. It does not ship
the upstream search script. Never present a palette, font pairing, or stack
snippet as if that script returned it.
