# Appendix — Screen Sizing Basis

Companion to `EAM-Dev-Leadership-Review-2026-08-25.md`. Backup material for the
estimating conversation; not main-deck content.

## What this is, and what it is not

**It is** a measured, repeatable ranking of *relative* complexity across the 15
prototyped mobile screens, derived from the prototype source rather than
judgement. Every number below is machine-counted and reproducible, so dev can
disagree with the *weights* without arguing about the *facts*.

**It is not an effort estimate.** The prototype has no data layer, no error
handling, no test suite, no accessibility pass and no localisation. Production
effort per screen is some multiple of what is measured here, and that multiple
is dev's to set — it is not knowable from this side. Use these numbers to
answer "which screens are the big ones, and by roughly how much," not "how many
weeks."

**One known distortion, stated up front:** screen-local code volume partly
measures *consolidation debt* rather than inherent complexity. A screen that
leans hard on the shared system looks small; a screen carrying hand-copied CSS
looks large. That is a feature for planning purposes — the debt is real work —
but it means the ranking is of *today's prototype*, not of the screen's
intrinsic difficulty. §4 and §5 below call out where this bites.

## 1. Measured signals

| Signal | What it counts | Why it proxies size |
| --- | --- | --- |
| **JS** | Lines inside the screen's own `<script>` blocks | Strongest single proxy for behaviour that must be reimplemented |
| **CSS** | Lines inside the screen's own `<style>` blocks | Presentation not yet in the shared system — build cost *and* debt |
| **Sheets** | Locally declared `.bottom-sheet` surfaces | Each is a real UI surface with its own validation and keyboard rules |
| **Handlers** | `onclick=` bindings | Breadth of interaction surface |
| **Shared APIs** | Distinct `eam-shared.js` functions consumed | **Reuse depth** — reported separately, not folded into size |
| **Render fns / config objects** | Local `render*()` functions; module-level `CONST` objects | View and configuration surface |

**Composite score** = `JS + CSS + (20 × Sheets) + (3 × Handlers)`. The weights
are deliberately crude and stated so they can be challenged: a sheet is treated
as ~20 lines of equivalent effort beyond its own code because of the
validation/keyboard/exclusivity rules each one carries, and a handler as ~3
because most are one-liners delegating into shared code.

## 2. Measurements

| Screen | JS | CSS | Sheets | Handlers | Render fns | Config objs | **Score** | **Size** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Activity Checklist (scroll — live) | 1364 | 422 | 4 | 48 | 8 | 19 | **2010** | XL |
| WO Record View | 1229 | 227 | 7 | 77 | 6 | 48 | **1827** | XL |
| WO List / Search | 792 | 364 | 7 | 64 | 4 | 24 | **1488** | XL |
| Book Labor | 787 | 161 | 9 | 52 | 1 | 17 | **1284** | L |
| Issue Parts | 803 | 226 | 4 | 54 | 7 | 9 | **1271** | L |
| Activity Checklist (paged — reference) | 778 | 273 | 4 | 45 | 5 | 16 | **1266** | L |
| Equipment Record View | 756 | 14 | 7 | 53 | 9 | 33 | **1069** | L |
| Equipment List | 484 | 51 | 6 | 54 | 1 | 18 | **817** | L |
| Home | 393 | 160 | 6 | 45 | 4 | 18 | **808** | L |
| WO Closing | 359 | 124 | 8 | 53 | 1 | 2 | **802** | L |
| WO › Equipment tab | 339 | 32 | 4 | 29 | 0 | 14 | **538** | M |
| WO › Comments & Documents tab | 118 | 8 | 3 | 20 | 2 | 12 | **246** | S |
| Notifications | 102 | 40 | 1 | 16 | 1 | 1 | **210** | S |
| Sync Status | 85 | 22 | 1 | 10 | 2 | 2 | **157** | S |
| Login (placeholder) | 29 | 50 | 0 | 2 | 0 | 0 | **85** | S |

Bands: **XL** ≥ 1400 · **L** 800–1399 · **M** 400–799 · **S** < 400.

**Reference files, for scale — not shipping screens:**
`screen-layout-field-behavior-prototype-v1.html` scores 330 (57 JS / 0 CSS / 6
sheets / 51 handlers) and `eam-card-standard-prototype-v1.html` scores 32.
Both are build contracts, so they cost review time rather than build time.

## 3. Reuse depth — the number that argues for porting

Distinct shared-system APIs each screen consumes. **High is good**: it means
the screen is mostly configuration over already-built components, which is the
whole argument for porting the component system rather than restarting.

| Screen | Shared APIs | Local CSS | Read |
| --- | --- | --- | --- |
| WO Record View | 15 | 227 | Deepest integration in the app |
| WO List / Search | 13 | **364** | Deep reuse *and* the most local CSS — see §4 |
| WO › Equipment tab | 13 | 32 | The child-tab template, doing it right |
| Equipment Record View | 11 | **14** | **The proof the model works** — see §4 |
| Activity Checklist (scroll) | 9 | 422 | Heavy local CSS is genuine: bespoke snap mechanics |
| Book Labor / Issue Parts / WO Closing / Equipment List | 9 | 51–226 | Solid reuse |
| WO › Comments & Documents tab | 9 | 8 | Almost pure configuration |
| Home | 8 | 160 | Local CSS is the palette exception, largely legitimate |
| Sync Status / Notifications | 3 | 22–40 | Small screens, shallow by nature |
| Login | 2 | 50 | Placeholder |

## 4. Three findings worth a slide of their own

**Equipment Record View is the strongest single evidence that the component
model works.** It is the canonical full-record-view reference carrying **11
tabs**, and it does that in 1,056 total lines with **14 lines of its own CSS**
and 11 shared APIs. Effectively all of its presentation is already shared code.
If production ports the component system, this is the cost profile the other
record views inherit.

**WO List is the measurable counter-example.** 13 shared APIs *and* 364 lines of
local CSS — the most in the app outside the checklist. A documented chunk of
that duplicates `.nav-avatar` / `.bottom-nav` / `.nav-title` rules that already
exist correctly in `eam-shared.css`, hand-copied because the file predates the
shared architecture. It is simultaneously the template every future list screen
copies from, which is why the consolidation pass belongs *before* screen
porting, not after: every list screen built from today's WO List inherits the
duplication.

**The measurement corrected three of my own judgement calls** in the main
review's §4 screen table, which is the argument for doing it at all:
- **Equipment Record View: XL → L.** It *looks* like the biggest screen (11
  tabs) and is one of the cheapest, precisely because of the reuse above.
- **Home: M → L** (808) and **Equipment List: M → L** (817). Both sit just over
  the band edge and both are more interaction-dense than they appear.
- **The Activity Checklist's A/B has a real cost difference**: the scroll copy
  scores 2010 against the pager's 1266 — roughly **1.6×**. That is not a reason
  to pick the pager (the scroll mode exists because a Route-fanned checklist
  reaches ~624 items), but it should be *on the table* as part of that decision
  rather than discovered afterwards.

## 5. Equipment Record View is one row here and eleven endeavours in the plan

**Read its 1069 with care.** That number measures *one file* — the record-view
shell plus the tab rail plus all 11 tabs' current content. The main review (§5.2)
treats each tab as a separate piece of work, and those pieces are **carved out of
this score, not added to it**. Do not sum the tabs and the screen.

Two consequences for estimating:

- **The 1069 understates the Equipment track and overstates the screen.** What
  is genuinely built and cheap is the *container*: the tab rail, the List/Detail
  shell, search and Plus affordances, all shared. What each tab still owes — its
  field set, data binding, row/detail layout and actions — is barely represented
  in today's file, because every tab currently renders the same demo record's
  content. So the tab work is real work that this measurement mostly cannot see.
- **The reuse-depth number is the honest signal here, not the size.** 11 shared
  APIs against **14 lines of local CSS** is what says a new tab is a
  configuration exercise. That is the number to quote when arguing per-tab cost,
  not the composite.

**Structure Details is the one tab off the List/Detail shell — but it is not
unmeasured.** It renders through the shared **Structure Tree** (the Equipment
LOV's Structure tab), which is ~26 CSS rules plus a recursive renderer, expand/
focus logic and ancestor auto-expand, all already in the shared files. So the
method *can* see it; the cost is just booked to the Equipment LOV rather than to
this screen. What Structure Details itself owes is parameterizing that tree out
of the picker (mount, data source, row action) plus an additive per-node status
dot — smaller than a typical field-set-and-binding tab, not larger.

*(An earlier draft called it a new component with nothing to measure. That was
wrong — the tree shipped with the Equipment LOV and had no name in
`component-library.md`, which is how it stayed invisible to the spec.)*

**Not a prerequisite, despite appearances:** all 11 tabs currently render the
same demo record's content whichever asset was opened (the identity overlay).
**Static prototype data is a deliberate non-concern here** — it is not design
work owed, and in production "bind the tab to real data" is simply what the
per-tab work *is*. Don't budget it as a separate line.

## 6. Rough shape for planning

- **3 XL screens** (Checklist, WO Record View, WO List) carry roughly **40%** of
  the measured mobile surface.
- **6 L screens** carry another **~45%**.
- **5 S/M screens** plus Login are the remaining **~15%** — genuinely small,
  and good candidates for the first port to validate the toolchain before
  committing to an XL.
- **Insert Mode** is not in the table because it lives entirely in
  `eam-shared.js` — it is shared-system work, not screen work, and it should be
  budgeted with the component library rather than with any screen.
- **Suggested first port: WO › Comments & Documents tab or Sync Status** (246 / 157). Both
  are almost pure configuration over shared components, so porting one proves
  the component-library approach end to end at minimum risk.

## 7. Reproducing these numbers

Metrics were counted directly from `prototypes/standalone/*.html`: `<style>`
and `<script>` block line counts (matched on the tag at line start, so `<style>`
mentioned inside a comment is not miscounted — that error inflated Equipment
List from 51 to 928 on the first pass), `class="…bottom-sheet"` occurrences,
`onclick=` occurrences, distinct matches against the `eam-shared.js` public
function list, `function render*` definitions, and module-level `CONST` object
declarations. Re-run before quoting these in any later meeting; the prototypes
are still moving.
