## What changed

<!-- One or two sentences. Which screen or shared component, and what the user sees differently. -->

## Design references

<!-- List every spec § this PR touches, e.g. §14.10, §31.6. "None" is fine for a pure bug fix. -->

- §

**Does this change a locked rule?** (see `CLAUDE.md` → Locked rules)

- [ ] No
- [ ] Yes. The rule, its §, and why it is changing are described below, and it was flagged before the work landed.

<!-- If yes, describe the change and the new rule. -->

## Design decision recorded

- [ ] New or changed design rule is in `docs/design-decisions-v3-1.md` (same PR)
- [ ] New requirement or changed sequence is in `docs/EAM-Mobile-Design-Doc-v1.md`
- [ ] New or renamed UI pattern is in `docs/component-library.md`
- [ ] A screen's state or traps changed, and the `CLAUDE.md` "Current state" section is updated (snapshot only, no narrative)
- [ ] None of the above applies

## Checks

- [ ] `.claude/skills/verify/scripts/bump-assets.js` run, if any stamped asset changed (`eam-shared.css`/`.js`, `eam-fonts.css`, `data/*.js`)
- [ ] `bump-assets.js --check` passes
- [ ] `.claude/skills/verify/scripts/check-keyboard.js` run, if a bottom sheet with a text input changed
- [ ] Relevant `tests/test-*.js` run and passing
- [ ] Shared component changes live in `eam-shared.css`/`.js`, not copied into a screen
- [ ] Replaced screens moved to `old versions/`, not duplicated

## Device testing

- [ ] Not needed (docs or tests only)
- [ ] Checked on a phone: iOS / Android (note which, and whether installed or in a browser)
- [ ] Checked in dark mode, if styling changed
