# Figma Migration — Game Plan

Written for a brand-new, untrained Figma user. Goal: get this project's
component library (and, optionally later, full screens) represented in
Figma as real, reusable design assets — not just a picture of the app.

## The situation, stated plainly

This prototype was built the "wrong way round" for Figma's usual workflow.
Normally: design in Figma → hand off to engineers → they build it. Here,
the opposite already happened — the design system was built directly in
HTML/CSS/JS (`eam-shared.css`/`.js`) and documented after the fact
(`docs/component-library.md`, `docs/design-decisions-v3-1.md`). That's
actually a head start, not a disadvantage: the hard design decisions
(palette, spacing, component variants, field-type rules) are already made
and written down. This plan is about *transcribing* that system into
Figma's own component model, not inventing it from scratch.

Because of that direction, most Figma tutorials/plugins aimed at "hand off
your Figma file to a developer" won't apply here — you want the reverse
(code system → Figma system). Don't get pulled into Dev Mode / code-export
plugins; they solve the opposite problem.

## Don't start with "import the whole prototype"

Trying to pull all ~15 screens into Figma in one shot will produce a mess
you can't maintain — same lesson this project already learned in code
(don't hand-copy components per screen, build the shared system once).
The plan below builds the *component library* first, proves it on one or
two real screens, and only then (optionally) expands to the rest.

## Phase 1 — Foundations: Variables, not colors (do this first, it's the highest-leverage step)

Figma has a **Variables** feature (colors, numbers, strings) that plays
the same role `eam-shared.css`'s `:root` custom properties (`--octave-black`,
`--green`, `--red`, `--gray-3`, spacing values, etc.) already play in code:
one place every component reads from, so a palette change propagates
everywhere instead of needing a per-component fix.

- Create one Figma file: "EAM Mobile — Design System."
- Create a Variables collection mirroring the CSS tokens in
  `eam-shared.css`'s `:root` block (grep it for the exact list) — same
  names if possible, so anyone cross-referencing code and Figma can match
  them by name.
- Include **light and dark mode as two Variable "modes"** in the same
  collection — this app already supports both themes; Figma Variables
  are built exactly for this (one component, two mode values), don't
  build separate light/dark component sets.
- Add text styles for the two font families in use (`--font-sans` /
  Inter, `--font-mono` / JetBrains Mono) at the handful of sizes/weights
  actually used (check `component-library.md` / the CSS for the real
  list — don't invent a full type scale that doesn't exist in the app).

This phase is mechanical and a good place to actually learn Figma's UI
(Figma's own in-product interactive tutorials, launched from the Figma
home screen for new accounts, cover exactly this — Variables, Auto Layout,
Components — before you need any outside resource).

## Phase 2 — Primitive components (buttons, pills, badges, chips)

Build each *named, reusable* small component as a real Figma Component
with **Variants** matching the CSS class variants already defined —
don't build 5 separate static shapes for something that's one component
with states in code. Concretely, from `component-library.md`/the shared
CSS:

- Buttons: `.btn-contained` / `.btn-outlined`
- Status pills: `.pill-green` / `.pill-red` / `.pill-outline`
- Badges: `.attr-badge` / `.attr-badge-outline` / `.attr-badge-critical`
- Org pill: editable (filled) vs. `.protected` (outlined) states
- The sync control's 4 states (Synced/Offline/Syncing/Error)

Each of these becomes ONE Figma component with a variant property (e.g.
"State: Green / Red / Outline"), built with Auto Layout so it resizes the
way the real flex/grid layout does. This is where Figma's core skill
(Auto Layout + Components + Variants) actually gets learned by doing.

**Optional accelerant:** a plugin like `html.to.design` can scrape a live
webpage's DOM/CSS and drop layers into Figma automatically. Fidelity is
usually rough (messy, non-component layer trees, wrong font fallbacks) —
don't trust its output as a finished component. But it's a fast way to
get spacing/color roughly right as a *tracing reference* you then clean
up into a real component, rather than starting every shape from a blank
canvas. Worth trying once on a couple of buttons to see if it's a net
time-saver for you before relying on it further.

## Phase 3 — Composite components (cards, headers, field types)

Once primitives exist, build the larger named components from
`component-library.md`, each composed from Phase 2's primitives where
possible rather than redrawn from scratch:

- Standard Record View header pattern (§5.3)
- List Search Screen card anatomy (§8.3)
- The 14 field types from `screen-layout-field-behavior-prototype-v1.html`
  (Grid and List versions — this file is literally laid out as a
  side-by-side reference for exactly this transcription)
- Action Row (Part Card / Labor Row)
- Step rail / tab rail
- Sheets/modals (bottom sheet, confirm modal)

Use `prototypes/reference-screenshots/` and the live prototype files
side-by-side as visual reference while building — you don't need to read
CSS line-by-line if the screenshots are accurate enough for spacing/sizing
by eye; use the CSS only when a screenshot is ambiguous.

## Phase 4 — Prove it: assemble ONE real screen

Before investing further, assemble a real screen (recommend Home or WO
Record View — both are well-documented and stable) purely from Phase
2/3 components. This validates the library actually holds together as
a system before deciding whether to do the other ~13 screens.

## Phase 5 — Optional: the rest of the screens

Only after Phase 4 proves out. At that point it's mostly assembly work
(dragging existing components into new arrangements), not new component
design — the expensive part is already done.

## Realistic time expectation

For someone new to Figma, Phases 1–2 are genuinely a skill-building
exercise, not just data entry — budget more like several evenings than
an afternoon. Phases 3–4 go faster once the muscle memory from Phase 2 is
in place. If this library needs to be handed to a professional designer
at some point, Phases 1–2 (tokens + primitives) are the most valuable
partial deliverable — a designer can take a solid token/primitive
foundation and move much faster than starting from screenshots alone.

## What this plan deliberately does not cover

- Figma prototyping/interaction wiring (click-through flows) — out of
  scope unless you want it later; this plan is about the component
  library, not recreating the HTML prototype's navigation in Figma.
- Design tokens plugins that sync Figma Variables back to code (e.g.
  Tokens Studio) — worth knowing these exist once the Figma side is
  real, not needed to get started.
