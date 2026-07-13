# HxGN EAM Mobile — Session Handoff
## Completed: Issue Parts (Step 3) → Next: Book Labor (Step 4)
**Date:** May 2026

---

## Files to upload for next session

| File | Purpose |
|------|---------|
| `HxGN-EAM-Mobile-Design-Decisions-v2.docx` | Full design reference — upload as project file |
| `eam-issue-parts-prototype.html` | Issue Parts prototype — upload for visual reference |
| `Transit_Book_Labor_View_Existing.png` | Reference screenshot for Book Labor |
| `Transit_Book_Labor_Insert.png` | Reference screenshot for Book Labor insert form |
| `Transit_Book_Labor_Correction.png` | Reference screenshot for labor correction flow |

---

## What was built this session

**Issue Parts screen** — fully prototyped in `eam-issue-parts-prototype.html`.

### Screen anatomy (top to bottom)
1. Nav bar (dark) — back, logo, WO title, sync icon, theme toggle
2. WO identity block (collapsible) — WO number, description, type/priority/dept chips
3. Step rail — "3 of 5 · Issue Parts" collapsed; expands to full step map
4. Screen header — "Issue Parts" title + storeroom selector pill (IND-MAIN, tappable)
5. Parts summary bar — Planned / Issued / Remaining stats (updates live)
6. Section label — "Planned Parts"
7. Parts list — 4 planned part cards
8. Add Parts button (outlined)
9. Quick Issue All Planned Parts button (contained/black)
10. Bottom bar — auto-ready, "Next: Book Labor"

### Interactions prototyped
- **Quick Issue/Return per card** → opens issue sheet pre-filled with part data
- **Quick Issue All** → confirmation sheet with per-part qty steppers → executes on "Issue All"
- **Add Parts** → opens ad hoc sheet with part search block
- **Issue sheet segment toggle** → switches between Issue and Return modes
- **Card state transitions** → gray → green on issue, button swaps to "Issued · Return?"
- **Summary counter** → updates live as parts are issued
- **Step rail expand/collapse**
- **Dark/light theme toggle**

---

## Locked design decisions (Issue Parts specific)

| Decision | Detail |
|----------|--------|
| Activity not shown | Inherited through workflow. Removed from all form surfaces. |
| Issue/Return not shown as field | Driven by segment toggle. Redundant as field row. |
| Dept / Cost Code / Material List | Hidden. Inherited from WO context. |
| Store as screen-level selector | Pill in screen header, defaults from WO. Also appears as first editable LOV row inside sheets. |
| Part as header block | Purple header (num + desc) is the only part surface. No Part LOV row below it. |
| Ad hoc part: search block | Large centred search/scan block replaces header until part is selected. |
| Available Qty position | Protected row directly under Store. Tech sees stock immediately after store is confirmed. |
| Bin stock list | Top 3 bins, qty desc, below Available Qty. Same API call. Shown when SHOWLOT=YES adds lot tags. |
| SHOWLOT flag | Lot row and bin lot column hidden entirely when SHOWLOT=NO. No empty/dash state. |
| Asset ID | Protected row (lock icon, dimmed). Not editable. Inherited from WO. |
| Quick Issue All confirmation | Sheet with orange warning + per-part qty steppers (min 1, max available). Flash purple on adjust. |
| Save button | White contained (Octave spec). NOT teal — teal is off-palette. Aqua hover. |
| Add Parts vs Quick Issue All | Add Parts = outlined (secondary). Quick Issue All = black contained (primary). |
| Bottom bar: auto-ready | Issue Parts step has no gate. Issuing is optional. |

---

## Prototype data (WO 19257)

```
Parts:
  1. 400-VP6-14  — O Ring EPDM          — 8 EA  — Bin A1-001 — Lot *      — 82 avail
  2. 200-AB8-001 — Casing (AB-8 Pump)   — 2 FA  — Bin C3-014 — Lot LOT-22 —  6 avail
  3. 400-VP6-16  — Flat Washer Steel     — 4 EA  — Bin A1-009 — Lot *      — 144 avail
  4. 200-AB8-006 — Ball Bearing, 2" Bore — 2 EA  — Bin B2-033 — Lot LOT-08 — 11 avail

WO: 19257 · Pump Cavitating; lost head · Corrective Maintenance · P4-HIGH · WATER
Activity: 10 · TECH · Store: IND-MAIN
```

---

## What to build next: Book Labor (Step 4)

### Reference screenshots (in project files)
- `Transit_Book_Labor_View_Existing.png` — existing labor records list with Book Labor / Book Labor by Crew buttons
- `Transit_Book_Labor_Insert.png` — insert form: Type of Hours, Employee, Crew, Dept, Trade, Start Date, Start/End Time, Hours
- `Transit_Book_Labor_Correction.png` — correction flow: same form with Hours showing as negative (-01:00)

### Known scope from reference screenshots
- **Labor list view** — existing booked labor rows (date, employee, hours, type), Create Correction button per row
- **Add Book Labor** — standard insert form
- **Add Book Labor by Crew** — crew-based booking (multiple employees)
- **Labor correction** — opens a correction form pre-filled, hours entered as negative to reverse

### Questions to resolve before building
1. What fields are required vs optional in the labor form? (Type of Hours, Employee, Dept, Trade appear required from screenshots)
2. Is Start Time / End Time the primary entry mode, or just Hours directly? Or both options?
3. Does crew booking work the same way as single booking, just with multiple employee rows?
4. What is the bottom bar gating rule for Book Labor? (Current doc says auto-ready — confirm)
5. Is there a timer integration from the Activity screen that pre-fills time worked?

### Design system notes for Book Labor
- Same shell: nav, WO block, step rail ("4 of 5 · Book Labor"), bottom bar
- Insert forms follow the same LOV row pattern established in Issue Parts
- Activity is still inherited — do not show it as a field
- Protected fields: same lock icon + dimmed treatment

---

## System prompt context for next session

Load the following into the new session:
1. Upload `HxGN-EAM-Mobile-Design-Decisions-v2.docx` as a project file
2. Upload `eam-issue-parts-prototype.html` for visual reference
3. Upload the three Book Labor reference screenshots
4. Tell Claude: *"We are building the HxGN EAM Mobile app. Issue Parts is complete. We are now designing Book Labor (Step 4 of 5 in the WO execution workflow). The design decisions doc and Issue Parts prototype are uploaded. Follow the locked design system throughout."*
