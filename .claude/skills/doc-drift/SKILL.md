---
name: doc-drift
description: Diff-scoped check that a merged PR or commit range left the design docs in sync. Use when asked to "check PR N for doc drift", "did the docs keep up", or after a collaborator merges prototype changes. Reads only the diff and the sections it cites, never the whole spec.
---

# Doc-drift check

Answers one question: **did these changes leave `docs/` and `CLAUDE.md` saying
something the prototypes no longer do?** The cost scales with the size of the
diff, not the size of the docs. That is the whole point — `CLAUDE.md` says not to
re-audit, and this is not a re-audit.

## Input

A PR number, a commit range (`<sha>..<sha>`), or nothing — in which case use the
most recent merge on `master`. Don't ask which; state what you picked.

## 1. Scope the diff

```bash
gh pr view <N> --json title,body,files --jq '{title,body,files:[.files[].path]}'
# or, for a range:
git diff --name-only <a>..<b>
```

Sort the changed paths into: **prototype** (`prototypes/standalone/*.html`),
**shared** (`prototypes/standalone/shared/*`), **data** (`data/*.js`),
**docs** (`docs/*`, `CLAUDE.md`).

**Stop early** if there is no prototype, shared or data change. Say "nothing to
check" and finish.

## 2. Filter the noise before reading anything

`bump-assets.js` rewrites the `?v=` stamp on every deployed screen, so a diff can
touch dozens of files with a one-line change each. **Skip any hunk whose only
change is a `?v=` stamp.** Don't read `data/*.js` bulk either; note which files
changed and whether a screen's behavior depends on the new shape.

## 3. Check the PR's own claims

Read the PR body's checklist and §-references. Compare each claim to the diff:

- Ticked "design decision recorded" but no `design-decisions-v3-1.md` change → flag.
- Cites a § that the diff doesn't plausibly relate to → flag.
- A locked rule appears to change and the body says "No" → flag, **and tell the
  user before suggesting any edit**. Never contradict a locked decision silently.
- Touched a stamped asset (`eam-shared.css/.js`, `eam-fonts.css`, `data/*.js`):
  run `.claude/skills/verify/scripts/bump-assets.js --check`. A failure is a flag.

## 4. Check the diff against the docs, narrowly

For each behavioral change, and only those:

- **Spec:** grep `docs/design-decisions-v3-1.md` for the cited § number or the
  function/class name, and read **that section only**. Does it still describe what
  the code now does?
- **Component names:** a new or renamed UI pattern → grep `docs/component-library.md`.
- **CLAUDE.md snapshot:** grep it for the changed screen's filename, function names,
  and any "trap" it records. Stale filename, a retired file still pointed at, a
  trap that no longer holds → flag.
- **Renames and deletions:** grep `docs/` and `CLAUDE.md` for the old filename.
  A pointer to a file that moved to `old versions/` or no longer exists is drift.
- **Requirements or sequence:** if the change adds or drops a capability, check the
  design doc's Timeline and Requirements for it.

Don't open a section you have no specific reason to open.

## 5. Report

One short report, most important first:

```
Scope: PR #N — <title> — <k> prototype/shared files, <m> docs files
Verdict: IN SYNC | DRIFT | NEEDS A DECISION

| Where | What is out of sync | Suggested fix |
| ----- | ------------------- | ------------- |
```

- **IN SYNC** — say what you checked, in one line. Don't pad it.
- **DRIFT** — each row names the doc and § (or `CLAUDE.md` section) and the exact
  edit. Don't make the edit unless asked.
- **NEEDS A DECISION** — a locked rule appears to change. Stop and put the question
  to the user instead of proposing wording.

State what you did **not** check (for example "did not read `data/*.js` contents").
A clean verdict that hides a skipped area is worse than a short, honest one.

## Rules

- **Diff-scoped.** Never read the spec end to end; grep for the §.
- **Don't re-open settled questions** listed under `CLAUDE.md`'s locked rules.
- **One fact, one home.** If the fix is a restated fact, point it at the single home
  (see `CLAUDE.md` → Source of truth) rather than copying it.
- **US English** in anything you write.
