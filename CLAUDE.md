# HxGN EAM Mobile — Project Memory

## What this is
A technician-first, offline-capable work order execution app (iOS/Android) for
HxGN EAM. We are prototyping a guided 5-step WO workflow: WO Record View,
Activity Checklist, Issue Parts, Book Labor, WO Closing.

## Source of truth
`docs/design-decisions-v3-1.md` is the authoritative design spec. Never
contradict a locked decision in that doc without explicitly flagging it to
the user first.

Also read `docs/project-kickoff-whitepaper-v3.md` for current project status,
architecture questions, and proposed sequence.

## Current state
- Five workflow steps exist as separate standalone HTML prototypes in
  `prototypes/standalone/`.
- `prototypes/wo-workflow/` is EMPTY — the unified compile (all 5 steps into
  one navigable file) has not happened yet. See `docs/handoffs/` for the
  assembly brief.
- `data/` is EMPTY — canonical WO data (WO 19257) is currently duplicated
  inside each standalone HTML file and needs to be extracted into
  `data/wo-19257.json` as a shared source.

## Locked design system rules (apply across ALL screens)
- LOV rows: description is primary text, code is small/muted above it.
- Save buttons: gray/disabled until required fields are filled, green/ready
  once satisfied.
- Labor records: correction-only after booking. No Edit action, ever.
- Detail grid values: "Description (CODE)" format.
- Section cards: consistent header (title + badge), consistent border/radius.
- Bottom bar gating: locked per-step rules documented in the design doc.
- Compiled prototype defaults to DARK mode. Standalones default light
  (for review purposes only).

## Prototype conventions
- Each prototype is a single self-contained HTML file: no build step, no
  external dependencies beyond CDN-hosted libraries if absolutely needed.
- Theme toggle lives in the header.
- Reference screenshots for visual matching are in
  `prototypes/reference-screenshots/`.

## Working style
- Flag any place where a request would conflict with a locked decision above.
- When a new design decision gets made during a session, add it to
  `docs/design-decisions-v3-1.md` in the same session — don't let the doc
  lag the prototypes.