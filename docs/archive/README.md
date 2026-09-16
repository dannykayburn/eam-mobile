# docs/archive — parked, not retired

Everything here was **deliberately moved out of the active doc set on
2026-09-11**, as a token-economy measure. These files are not superseded and not
wrong — they are just no longer *pointed at*, so a session doesn't open them by
following a link from `CLAUDE.md` or the design doc.

**Nothing outside this folder links here.** That is the point. If you need one of
these, come here and open it directly.

**Different from `docs/old versions/`**, which holds genuinely *retired*
artifacts — superseded content that would actively mislead. Nothing in `archive/`
is misleading; it is out of the way.

| File | What it holds | Where its live replacement is |
| --- | --- | --- |
| `EAM-Project-Requirements-v1.md` | The **R1–R6** requirements one-pager and the requirement-level rules behind them. | **Fully absorbed** into `docs/EAM-Mobile-Design-Doc-v1.md` → "Requirements". That doc is now their single home; this copy is history. |
| `EAM-REBUILD-Strategy-and-Execution-Plan-v1.md` | Build order, the shared-file architecture decisions, the conformance-audit session notes (§7–§8), and the compiled-shell reconciliation. | Sequence → the design doc's **Timeline** (M0–M9). The §7–§8 session detail has no replacement and is only here. |
| `EAM-Dev-Leadership-Review-2026-08-25.md` | Status, Voice of the Customer in full, the 8 design paradigms, the screen inventory built vs. outstanding, backend asks (§6), gap analysis, recommended sequence. | VoC + backend asks + sequence → the design doc. Built-vs-unbuilt → `CLAUDE.md`'s "Current state". §5.2's per-Equipment-tab detail is only here. |
| `EAM-Dev-Leadership-Sizing-Appendix-2026-08-25.md` | Measured **relative** per-screen complexity, and the method to re-derive it. Explicitly not an effort estimate. | None. Deck source only. |
| `EAM-Dev-Leadership-Deck-2026-08-25.pptx` | The meeting artifact generated from the review doc. **Untracked** — `.pptx` is gitignored repo-wide. | Regenerate from the review doc if it's needed again. |
| `EAM-DESIGN-Pinning-Enhancement-v1.md` | The base-EAM `R5PINS` enhancement spec — punch-list **Option B**. | Still the only spec for it. `design-decisions-v3-1.md` §2.6 cites it by name. |
| `figma-migration-game-plan.md` | How to transcribe the component system into Figma. Direction of travel is code → Figma, the reverse of most tutorials. | None. Dormant. |

## Two things to know before you act on anything in here

1. **The leadership review carried a "keep this current" instruction.** It is no
   longer maintained. Project status now lives in `CLAUDE.md`'s "Current state"
   (what exists) and the design doc (what's owed, and in what order). Do not
   resurrect this file as a second status doc — that failure mode already
   happened once, to its own predecessor.
2. **The requirements one-pager is the one file here that is genuinely
   duplicated.** Its content is live in the design doc. Edit the design doc, not
   this copy.
