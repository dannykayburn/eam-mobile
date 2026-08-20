# HxGN EAM Mobile — Design Prototype

A technician-first, offline-capable work order execution app for HxGN EAM
(iOS/Android), prototyped as connected HTML screens. **No backend, no build
step, no bundler** — every screen is a single HTML file loading two shared
files (`eam-shared.css` / `eam-shared.js`) plus CDN-hosted fonts.

This repo is the design source of truth for the mobile rebuild. It is a
*prototype*, not production code: it exists to settle design decisions and to
be put in front of technicians, and it is deliberately written so a designer
can read and change it.

---

## Open it

**Three ways, in order of least effort:**

1. **Public URL** — <https://dannykayburn.github.io/eam-mobile/>
   Nothing to install. Works on any phone or laptop browser. This is the one to
   send to user-testing participants.

2. **From a zip, offline** — unzip anywhere and double-click **`index.html`**.
   This genuinely works: nothing here uses `fetch()`, XHR or ES modules, so
   browsers' `file://` restrictions don't apply. Only the two web fonts need
   the network, and they fall back cleanly without it.

3. **Local server** (only if you want clean URLs):
   ```bash
   npx serve .
   ```
   Serve from the **repo root**, not `prototypes/` — the screens reach up into
   `data/` for their reference data.

### Where to land

| Open this | For |
| --- | --- |
| **`index.html`** | Redirects to Login, which is how the app is meant to be entered. Use for user testing. |
| **`screens.html`** | Direct index of every screen and mockup. Use for design review and walkthroughs, **not** for moderated testing — deep links skip the navigation you'd want to observe. |

Login is a **placeholder**: no credential check, no SSO, no biometrics. Tap
**Log In** with the fields blank and you're in. Tapping Log In is also what
performs the demo-state reset.

---

## Read these, in this order

| Doc | What it's for |
| --- | --- |
| [`docs/handoffs/EAM-HANDOFF-UX-User-Testing-Brief.md`](docs/handoffs/EAM-HANDOFF-UX-User-Testing-Brief.md) | **Start here for testing.** Demo data, the flows worth building tasks around, and — most importantly — which dead ends are known stubs rather than findings. |
| [`docs/component-library.md`](docs/component-library.md) | Name-first component reference: "what is the thing called X, and what are its rules." Browsable by plain-English name. |
| [`docs/design-decisions-v3-1.md`](docs/design-decisions-v3-1.md) | The authoritative locked spec (§1–§25). Long — grep for the section you need. Reversed decisions live in §21 with their revert recipe; genuinely open items in §20. |
| [`docs/figma-migration-game-plan.md`](docs/figma-migration-game-plan.md) | How to transcribe this system into Figma. Note the direction of travel is code → Figma, which is the reverse of most tutorials. |
| [`docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md`](docs/EAM-REBUILD-Strategy-and-Execution-Plan-v1.md) | Build sequence and current plan (§7–§8 are live). |
| [`CLAUDE.md`](CLAUDE.md) | Current-state snapshot of every screen and rule, written for whoever picks the work up next. Densest single description of what exists. |

---

## The demo data

There is no backend. Everything routes off **3 seeded Work Order identities**,
reached by tapping the matching card in WO List:

| WO # | Type | Demonstrates |
| --- | --- | --- |
| **19257** | Breakdown | The full 5-step guided workflow. Default choice for "close out a work order" tasks. |
| **19831** | PM | A guided workflow that **skips Issue Parts**. |
| **20450** | Routine | **No configured workflow** — flat, unordered, ungated step rail. |

Tapping any other WO routes to the closest match by Type rather than erroring.

**State persists** — created records, Route equipment, minted child WOs,
favourited dataspies, filters, sort, sync outbox. Every screen has a dev
toolbar *outside* the phone frame with a theme toggle, an
online/offline/synced cycle, and **Restart Demo**. Use Restart Demo between
participants or participant 2 inherits participant 1's session.

---

## Layout

```
index.html          → redirects to Login (the app's real entry)
screens.html        → reviewer index of every screen
CLAUDE.md           → current-state snapshot of the whole build
data/               → reference data as plain JS globals (no fetch, so file:// works)
docs/
  design-decisions-v3-1.md   locked spec
  component-library.md       named component catalogue
  handoffs/                  briefs written for handoff, incl. the UX testing brief
  Data_refs/                 real EAM exports (employees, parts, closing codes, …)
  reference_screenshots/     base-EAM screens, for visual grounding
prototypes/
  standalone/                one HTML file per screen  ← the app
    shared/eam-shared.{css,js}  the entire design system
    mockups/                 design options explored, including rejected ones
    old versions/            retired screens, history only — don't copy from these
    base screens/            desktop admin track (Screen Designer, Workflow Designer)
  reference-screenshots/     more base-EAM reference
.claude/skills/verify/       the verification suite (see below)
```

Two conventions worth knowing before editing anything:

- **New generic component → the shared files.** Screen-local only until there's
  a real second consumer. Hand-copying a component per screen is the mistake
  this architecture exists to prevent.
- **When a screen is rebuilt, the old one moves to `old versions/`.** There are
  never two live versions of the same screen.

---

## Verifying a change

Browser preview is unavailable in the environment this was built in, so
verification is static plus headless execution. It is not decoration — skipping
it once shipped an app where every search screen was dead on device.

```bash
node .claude/skills/verify/scripts/check-scope.js prototypes/standalone/eam-*.html && node .claude/skills/verify/scripts/check-keyboard.js && node .claude/skills/verify/scripts/run-load.js && for t in .claude/skills/verify/scripts/tests/test-*.js; do node "$t" || exit 1; done
```

What each part catches, and why it exists, is documented in
[`.claude/skills/verify/SKILL.md`](.claude/skills/verify/SKILL.md).

**What this cannot tell you: CSS.** Layout, colour, contrast in both themes,
tap-target size, anything transition-driven. Those need a real device — which
is why "it looks wrong" is a high-value finding on this build rather than a
nitpick.
