# Litigation Monitor — v3

> Litigation Weekly Monitoring System  
> A browser-based, zero-install tool that uses `Litigation_Weekly_Monitor.xlsx` as a live database and `Law_Step.xlsx` as a delta-update feed.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [File Structure](#3-file-structure)
4. [Data Sources](#4-data-sources)
5. [Business Rules Engine — Gate Logic](#5-business-rules-engine--gate-logic)
6. [Module Reference](#6-module-reference)
7. [Getting Started](#7-getting-started)
8. [Workflow Guide](#8-workflow-guide)
9. [LawStep Import Pipeline](#9-lawstep-import-pipeline)
10. [Auto-Calculation Summary](#10-auto-calculation-summary)
11. [Keyboard Shortcuts](#11-keyboard-shortcuts)
12. [Deployment](#12-deployment)
13. [Known Limitations](#13-known-limitations)
14. [Changelog](#14-changelog)

---

## 1. Overview

Litigation Monitor is a **single-page web application** that turns `Litigation_Weekly_Monitor.xlsx` into an interactive case management database. It supports:

- **Read + Write** to the case workbook (all 4 active sheets)
- **Delta-import** from `Law_Step.xlsx` to sync case status updates without re-keying data
- **Automated Gate evaluation** (Gate 1–4) derived from the Reference sheet rules
- **Zero install** — runs entirely in-browser, no server, no database

| Capability | Detail |
|---|---|
| Primary Database | `Litigation_Weekly_Monitor.xlsx` |
| Update Feed | `Law_Step.xlsx` (LAWSTEP ALL sheet) |
| Sheets managed | Case Register · SLA Tracker · Prescription Watch · Reimbursement |
| Auto-calculated fields | Tier, Urgency, Gate 1–4, SLA Status, Assignment, Days to Expiry |
| Pagination | 50 rows/page, client-side |
| Search | Full-text across all fields, per-sheet |
| Filters | Dropdown per key field (Legal Status, Tier, Urgency, Pay Status, etc.) |
| Deploy target | Single `.html` file via `deploy.py` |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (no server)                          │
│                                                                  │
│  Litigation_Weekly_Monitor.xlsx ──► loadCases()               │
│                                             │                    │
│  Law_Step.xlsx ─────────────────────► loadLawStep()             │
│                                             │                    │
│                               ┌─────────────▼──────────────┐    │
│                               │      engine.js              │    │
│                               │  ┌─────────────────────┐   │    │
│                               │  │  Gate Logic Engine  │   │    │
│                               │  │  gate1() gate2()    │   │    │
│                               │  │  gate3() gate4()    │   │    │
│                               │  │  evaluateAllGates() │   │    │
│                               │  └─────────────────────┘   │    │
│                               │  ┌─────────────────────┐   │    │
│                               │  │  LawStep Mapper     │   │    │
│                               │  │  lawstepRowToCase()  │   │    │
│                               │  │  processLawstep()   │   │    │
│                               │  └─────────────────────┘   │    │
│                               └─────────────┬──────────────┘    │
│                                             │                    │
│                               ┌─────────────▼──────────────┐    │
│                               │       APP (state)           │    │
│                               │  caseData[]  slaData[]      │    │
│                               │  prescriptData[]            │    │
│                               │  reimburseData[]            │    │
│                               └─────────────┬──────────────┘    │
│                                             │                    │
│                    main.js ◄────────────────┤                    │
│                    renderCaseTable()        │                    │
│                    renderSlaTable()         │                    │
│                    renderPrescriptTable()   │                    │
│                    renderReimburseTable()   │                    │
│                                             │                    │
│                    exportExcel() ───────────┼──► .xlsx download  │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow (Waterfall):**

```
1. LOAD    Litigation.xlsx ──────► parse 4 sheets ──► APP.caseData / slaData / prescriptData / reimburseData
2. ENRICH  gate1Urgency() re-calculates urgency from today on every load
3. IMPORT  Law_Step.xlsx ─► processLawstepImport() ─► merge into APP.caseData
4. DISPLAY render*Table() ─► virtual pagination + search + filter
5. EDIT    CRUD forms ─────► update APP.* arrays in memory
6. SAVE    exportExcel() ──► write all arrays back to Litigation.xlsx ─► download
```

---

## 3. File Structure

```
litigation_monitor_v3/
│
├── index.html            Main UI (HTML shell + form definitions)
│
├── js/
│   ├── utils.js          State, helpers, search/pagination, keyboard, confirm modal
│   ├── engine.js         Business rules (Gate 1–4), LawStep mapper, SLA milestones
│   ├── main.js           Load/Save case workbook, CRUD for all 4 sheets, render functions
│   ├── kpi.js            Dashboard SVG charts (5 chart types)
│   └── forecast.js       Forecast helpers (placeholder — extend here)
│
├── css/
│   └── style.css         Dark theme, responsive grid, search bar, pagination, modals
│
├── dist/
│   └── app.html          ← Single-file build output (run deploy.py to regenerate)
│
└── deploy.py             Bundles all JS+CSS into dist/app.html
```

**Script load order** (enforced in index.html):
```
utils.js  →  engine.js  →  main.js  →  kpi.js  →  forecast.js
```
`engine.js` must load before `main.js` because `main.js` calls `gate1Urgency()`, `evaluateAllGates()`, and `osbToTier()` during workbook load.

---

## 4. Data Sources

### 4.1 Litigation_Weekly_Monitor.xlsx

| Sheet | Role | Header row | Data starts |
|---|---|---|---|
| `📁 Case Register` | Primary case database | Row 2 (index 1) | Row 3 (index 2) |
| `⏰ SLA Tracker` | SLA milestones per case | Row 2 | Row 3 |
| `🚨 Prescription Watch` | Expiry tracking | Row 2 | Row 3 |
| `💰 Reimbursement` | Expense tracking | Row 2 | Row 3 |
| `📖 Reference` | Gate logic rules (read-only) | — | — |
| `📊 Weekly Dashboard` | KPI summary (not edited) | — | — |
| `📈 Monthly Summary` | Trend data (not edited) | — | — |

**Case Register column mapping** (0-indexed from col A):

| Index | Field | Auto-calculated? |
|---|---|---|
| 0 | Case Ref No. | — |
| 1 | Debtor Name | — |
| 2 | Portfolio Code | — |
| 3 | OSB (THB) | — |
| 4 | Tier | ✅ from OSB |
| 5 | Debtor Class | Suggested from Tier |
| 6 | Legal Status | ✅ from LawStep |
| 7 | Assigned To | ✅ from Urgency + OSB |
| 8 | Assignment Date | — |
| 9 | Internal Lawyer / OA Name | — |
| 10 | Prescription Type | — |
| 11 | Filing Prescription Expiry | — |
| 12 | Enforcement Prescription Expiry | — |
| 13 | Filing Urgency | ✅ from col 11 vs today |
| 14 | Enforcement Urgency | ✅ from col 12 vs today |
| 15 | Gate 1 Pass | ✅ from Urgency |
| 16 | Gate 2 Class | ✅ from Debtor Class |
| 17 | Gate 3 Tier | ✅ from Tier |
| 18 | Gate 4 ROI | Manual input |
| 19 | Gate 4 Decision | ✅ from ROI |
| 20–33 | Dates, actions, remarks | Mixed |

### 4.2 Law_Step.xlsx

Single sheet: `LAWSTEP ALL`

- **Row 0**: Thai display headers
- **Row 1**: English field names (`lawstep_*`)
- **Row 2+**: Data

**Key fields used by the import engine:**

| LawStep field | Maps to case field |
|---|---|
| `lawstep_newcontractnumber` | `caseRef` (join key) |
| `lawstep_name` | `debtorName` |
| `lawstep_existedstatus` | `legalStatus` (via `LAWSTEP_STATUS_MAP`) |
| `lawstep_oa_id` | `assignedTo` |
| `lawstep_sueapprovaldate` | `approvalDate`, `assignDate` |
| `lawstep_filingdate` | `filingDate` |
| `lawstep_judgementdate` | `judgmentDate` |
| `lawstep_enforcereqdate` | `enforcDate` |
| `lawstep_appdate01` | `nextActionDate` |
| `col[6]` (PORT, unnamed) | `portfolio` |

---

## 5. Business Rules Engine — Gate Logic

All rules are sourced from the `📖 Reference` sheet of the case workbook.

### Gate 1 — Prescription Control

```
Input:  Filing Expiry Date or Enforcement Expiry Date
Output: Urgency label + pass/fail

Days to expiry < 0     →  EXPIRED        →  DO NOT FILE          (pass=false)
Days to expiry < 180   →  FAST TRACK     →  Escalate same day    (pass=true)
Days to expiry < 365   →  6-12 Months    →  Prioritize in queue  (pass=true)
Days to expiry ≥ 365   →  Normal         →  Normal evaluation    (pass=true)
```

### Gate 2 — Asset & Workplace

```
Input:  Debtor Class (A / B / C / D)
Output: Strategy + proceed flag

A  →  Confirmed asset + workplace  →  Immediate filing         (proceed=true)
B  →  Workplace only               →  Wage garnishment case    (proceed=true)
C  →  Suspected asset              →  Asset investigation      (proceed=true)
D  →  None                         →  HOLD — do not file       (proceed=false)
```

### Gate 3 — Financial Viability

```
Input:  Tier (derived from OSB)
Output: Rule + proceed flag

Tier 1 (OSB < 50,000)         →  Offer targeted discount — do NOT litigate  (proceed=false)
Tier 2 (50,000 – 300,000)     →  Conditional — asset or workplace required   (proceed=null)
Tier 3 (300,000 – 1,000,000)  →  Default litigate                            (proceed=true)
Tier 4 (OSB ≥ 1,000,000)      →  Default litigate                            (proceed=true)
```

### Gate 4 — Cost-Benefit (ROI)

```
Input:  ROI = OSB ÷ (Filing Fee + Lawyer Cost + Process Cost)
Output: Decision + approver

ROI < 1.2x    →  Reject
ROI 1.2–1.5x  →  Exception Approval Required  (DCEO / CEO)
ROI 1.5–2.0x  →  Default Approve              (DCEO / CEO)
ROI ≥ 2.0x    →  Priority Filing              (DCEO / CEO)
```

### Combined Recommendation Logic

```
if Gate1.pass === false        →  "DO NOT FILE"        (stops here)
else if Gate2.proceed === false →  "HOLD"               (stops here)
else if Gate3.proceed === false →  "DO NOT LITIGATE"    (stops here)
else if Gate4 === "Reject"     →  "REJECT"
else                           →  "PROCEED"
```

### OSB → Tier Mapping

```
OSB < 50,000           →  Tier 1
50,000 ≤ OSB < 300,000 →  Tier 2
300,000 ≤ OSB < 1,000,000 → Tier 3
OSB ≥ 1,000,000        →  Tier 4
```

### Assignment Rule

```
FAST TRACK urgency OR OSB > 1,000,000  →  Internal (IH)
All other cases                         →  OA
```

---

## 6. Module Reference

### `utils.js`

| Function | Purpose |
|---|---|
| `v(id)` | Get trimmed string value from input element |
| `nv(id)` | Get numeric value from input element |
| `setField(id, val)` | Set value of any form element |
| `fmtDate(val)` | Normalize any date value to `YYYY-MM-DD` string |
| `daysFromNow(dateStr)` | Integer days from today (negative = past) |
| `fmtThb(n)` | Format number as Thai locale currency string |
| `toast(msg, type, dur)` | Show a dismissible toast notification |
| `showConfirm(msg)` | Promise-based confirm modal (replaces `window.confirm`) |
| `switchPage(name)` | Navigate between sidebar pages |
| `updateCounts()` | Refresh sidebar badge counts + autocomplete datalists |
| `applySearchFilter(dataset, pageKey)` | Full-text search + dropdown filter |
| `paginate(dataset, page, size)` | Slice dataset for current page |
| `renderPagination(...)` | Render page number buttons |
| `buildSearchBar(pageKey, ...)` | Build search + filter bar HTML |
| `skeletonTable(cols, rows)` | Shimmer loading placeholder table |

### `engine.js`

| Function | Purpose |
|---|---|
| `gate1(expiryDateStr)` | Gate 1 evaluation → `{pass, label, color, days}` |
| `gate1Urgency(expiryDateStr)` | Returns urgency string: EXPIRED / FAST TRACK / 6-12 Months / Normal |
| `gate2(debtorClass)` | Gate 2 evaluation → `{strategy, proceed}` |
| `gate3(tier)` | Gate 3 evaluation → `{rule, proceed}` |
| `calcROI(osb, ...)` | Calculate ROI ratio |
| `gate4(roi)` | Gate 4 evaluation → `{decision, approver, color}` |
| `evaluateAllGates(row)` | Combined gate result + overall recommendation |
| `osbToTier(osb)` | OSB number → Tier string |
| `tierToDefaultClass(tier)` | Tier → suggested Debtor Class |
| `calcAssignment(row)` | Suggest Internal (IH) or OA based on urgency + OSB |
| `calcSlaStatus(deadline)` | Deadline string → On Track / At Risk / Breached |
| `addDays(dateStr, days)` | Add N calendar days to a date string |
| `getCaseByRef(caseRef)` | Lookup case object from `APP.caseData` |
| `nextReqNo()` | Auto-generate next REQ number |
| `LAWSTEP_STATUS_MAP` | Lookup table: LawStep status → Legal Status |
| `lawstepRowToCase(law, existingCase)` | Map one LawStep row to case object |
| `processLawstepImport(lawWs)` | Process full LawStep sheet, returns `{updated, added, skipped}` |

### `main.js`

| Function | Purpose |
|---|---|
| `loadCases(e)` | Read case workbook, parse all 4 sheets into APP arrays |
| `loadLawStep(e)` | Read Law_Step.xlsx, call `processLawstepImport` |
| `exportExcel()` | Write all APP arrays back to case workbook + download |
| `clearSheetRows(ws, fromRow)` | Clear data rows in a worksheet before rewrite |
| `recalcCaseForm()` | Live recalculate all Gate fields while user types |
| `updateGateSummary()` | Render Gate summary chips in the case form |
| `saveCase()` | Validate + save case to `APP.caseData`, auto-seed SLA + Prescription |
| `autoSeedLinkedSheets(row)` | Create SLA #1 and Prescription Watch entries for new case |
| `renderCaseTable()` | Render paginated, searchable case table with live Gate badges |
| `saveSla()` | Save SLA entry (status auto-calculated from deadline) |
| `renderSlaTable()` | Render SLA table with live Days Left column |
| `savePresc()` | Save Prescription entry (urgency + Gate 1 auto-calculated) |
| `renderPrescriptTable()` | Render Prescription table with live urgency |
| `saveReimb()` | Save reimbursement entry |
| `renderReimburseTable()` | Render reimbursement table with running total |

---

## 7. Getting Started

### Option A — Single File (recommended)

1. Download `app.html` from `dist/app.html`
2. Open it in **Chrome**, **Edge**, or **Firefox** (any modern browser)
3. No installation, no server required

### Option B — Development Mode

```bash
# Clone or unzip litigation_monitor_v3/
cd litigation_monitor_v3

# Open index.html directly in browser
# (Note: some browsers block local file:// script loading)
# Use a simple static server:
python3 -m http.server 8080
# then open http://localhost:8080
```

### Option C — Rebuild Single File

```bash
cd litigation_monitor_v3
python3 deploy.py
# Output: dist/app.html (~130 KB)
```

### First Use

1. Open the app
2. Click **📂 โหลดไฟล์** → select `Litigation_Weekly_Monitor.xlsx`
3. All 4 sheets load automatically. Gate fields recalculate immediately.
4. Optionally click **🔄 Import LawStep** → select `Law_Step.xlsx`
5. Make edits or additions
6. Click **⬇️ บันทึก / Export** (or `Ctrl+S`) → downloads `Litigation_Updated.xlsx`
7. Rename and replace your working copy of the case workbook

---

## 8. Workflow Guide

### Adding a New Case

1. Navigate to **📁 Case Register** → click **＋ เพิ่มคดีใหม่**
2. Enter `Case Ref No.` and `Debtor Name` (required)
3. Enter `OSB (THB)` → **Tier auto-fills**
4. Select `Debtor Class` → **Gate 2 auto-fills**
5. Select `Prescription Type` → conditional expiry fields appear
6. Enter expiry date → **Urgency + Gate 1 auto-fill**
7. (Optional) Enter `Gate 4 ROI` → **Gate 4 Decision auto-fills**
8. Watch the **Gate Summary bar** (top of form) update live
9. Click **✓ บันทึกคดี** → system automatically creates:
   - SLA entry #1 (based on Legal Status)
   - Prescription Watch entry (if expiry dates provided)

### Updating from LawStep

1. Receive new `Law_Step.xlsx` from legal team
2. In the app (with the case workbook already loaded): click **🔄 Import LawStep**
3. System matches on `lawstep_newcontractnumber` = `Case Ref No.`
4. Result toast shows: `เพิ่ม X | อัปเดต Y | ข้าม Z รายการ`
5. Review changes in Case Register table
6. Export to save

### Weekly Monday Workflow

```
1. Open app.html
2. Load Litigation_Weekly_Monitor.xlsx
3. Import latest Law_Step.xlsx (from legal ops team)
4. Review Prescription Watch → action on FAST TRACK / EXPIRED
5. Review SLA Tracker → address Breached / At Risk items
6. Review Reimbursement → process Overdue payments
7. Ctrl+S → download updated file
8. Replace working copy
```

---

## 9. LawStep Import Pipeline

```
Law_Step.xlsx
    │
    ▼ XLSX.read()
    │
    ▼ rows[1] = header row (lawstep_* field names)
    │
    ▼ for each data row (rows[2+]):
    │
    ├─ Extract: lawstep_newcontractnumber → contractNo (join key)
    │
    ├─ Lookup: APP.caseData.find(c => c.caseRef === contractNo)
    │         → existingCase (null if new case)
    │
    ├─ lawstepRowToCase(law, existingCase):
    │   ├─ Map existedstatus → legalStatus via LAWSTEP_STATUS_MAP
    │   ├─ Map oa_id → assignedTo (Legal/Internal → IH, else OA)
    │   ├─ Map status (ฟ้อง/สวมสิทธิ) → prescriptionType
    │   ├─ Map dates: filingdate, judgementdate, enforcereqdate
    │   ├─ Generate lastAction / nextAction from legalStatus
    │   └─ PRESERVE workbook-only fields: osb, tier, debtorClass, expiry dates, gates
    │
    ├─ evaluateAllGates(caseRow) → fill gate1/2/3/dec if empty
    │
    └─ if existingIdx >= 0 → UPDATE else → ADD
         updated++               added++
```

**LAWSTEP_STATUS_MAP** (complete mapping):

| LawStep status | Legal Status |
|---|---|
| Closed | Closed |
| JM | Judgment |
| Execution | Enforcement |
| Pre-Execution | Judgment |
| CM | Filed & Hearing |
| Pre-Subrogation | Approved to Sue |
| Subrogation | Approved to Sue |
| NPL | Non-legal |
| Early Sue | Approved to Sue |
| Loss-JM | Closed |
| Loss on sale / Loss on Sale | Closed |
| Loss no litigation | Closed |
| Bankruptcy | Closed |

---

## 10. Auto-Calculation Summary

| Field | Trigger | Logic |
|---|---|---|
| Tier | OSB changed | `osbToTier(osb)`: <50K=T1, <300K=T2, <1M=T3, ≥1M=T4 |
| Debtor Class | Tier changed | Suggested: T1→D, T2→C, T3→B, T4→A (user can override) |
| Filing Urgency | Filing Expiry changed | `gate1Urgency(filingExpiry)` vs today |
| Enforcement Urgency | Enforcement Expiry changed | `gate1Urgency(enforcExpiry)` vs today |
| Gate 1 | Any Expiry changed | `gate1(expiry).label` |
| Gate 2 | Debtor Class changed | `gate2(debtorClass).strategy` |
| Gate 3 | Tier changed | `gate3(tier).rule` |
| Gate 4 Decision | ROI changed | `gate4(roi).decision` |
| Assigned To | Urgency or OSB changed | FAST TRACK or >1M → IH, else OA |
| SLA Status | SLA Deadline changed | Breached (<0d) / At Risk (≤7d) / On Track |
| Prescription Urgency | Expiry Date changed (form) | `gate1Urgency(expiryDate)` |
| Prescription Gate 1 | Expiry Date changed (form) | `gate1(expiryDate).label` |
| Action Deadline | Urgency becomes FAST TRACK | Today + 3 days |
| Days Left | Any table render | `daysFromNow(expiryDate)` — live on every render |
| Gate Recommendation | Any gate changes | `evaluateAllGates(row).recommend` |
| All Gates on Load | case workbook loaded | All urgency/gate fields recalculated from today |
| All Gates on Export | Export triggered | Recalculated one final time before writing |

---

## 11. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` / `Cmd+S` | Export / Save case workbook |
| `Ctrl+F` / `Cmd+F` | Focus search input on current page |
| `Esc` | Close any open form / modal |

---

## 12. Deployment

### Build single file

```bash
cd litigation_monitor_v3
python3 deploy.py
# → dist/app.html  (~130 KB, fully self-contained)
```

The deploy script:
1. Reads `index.html`
2. Inlines `css/style.css` into a `<style>` block
3. Removes all `<script src="...">` tags
4. Concatenates all JS files in order: `utils → engine → main → kpi → forecast`
5. Injects the bundle before `</body>`

### Browser compatibility

| Browser | Status |
|---|---|
| Chrome 90+ | ✅ Fully supported |
| Edge 90+ | ✅ Fully supported |
| Firefox 88+ | ✅ Fully supported |
| Safari 15+ | ✅ Supported |
| IE 11 | ❌ Not supported |

### File size budget

| Asset | Size |
|---|---|
| `app.html` (bundled) | ~132 KB |
| xlsx.js (CDN) | ~1.2 MB |
| Google Fonts | ~20 KB (cached) |

---

## 13. Known Limitations

| # | Limitation | Workaround |
|---|---|---|
| 1 | No server — all data in browser memory | Export frequently; data lost on page refresh |
| 2 | OSB field not in LawStep — comes from the case workbook only | Ensure case workbook has OSB before importing LawStep |
| 3 | SLA Milestone customizations reset on page reload | Edit `APP.slaMilestones` in `engine.js` for permanent changes |
| 4 | `file://` protocol may block scripts in some browsers | Use `python3 -m http.server` or `dist/app.html` |
| 5 | Excel formulas in the case workbook are replaced with values on export | Use case workbook's formula sheet for reporting; this tool manages data rows only |
| 6 | Large files (>5000 cases) may feel slow on first render | Pagination at 50 rows mitigates this |
| 7 | Gate 4 ROI requires manual input | Calculate ROI externally (OSB ÷ estimated legal costs) and paste |

---

## 14. Changelog

### v3.0.0 — 2026-03-24
- **NEW**: `engine.js` — dedicated Gate Logic Engine with full Gate 1–4 auto-calculation
- **NEW**: LawStep import pipeline (`processLawstepImport`, `lawstepRowToCase`, `LAWSTEP_STATUS_MAP`)
- **NEW**: case workbook used as primary read/write database
- **NEW**: Gate Summary live preview panel inside case form
- **NEW**: Auto-seed SLA #1 and Prescription Watch on new case save
- **NEW**: `deploy.py` single-file bundler
- **IMPROVED**: All urgency/gate fields recalculate on every load and export
- **IMPROVED**: Assignment (IH vs OA) auto-suggested from urgency + OSB
- **IMPROVED**: Search + filter + pagination on all 4 tables
- **IMPROVED**: Async confirm modal replaces `window.confirm()`
- **IMPROVED**: Skeleton loader during file parse
- **IMPROVED**: `Ctrl+S` export, `Ctrl+F` search focus, `Esc` close form

### v2.0.0
- Added search, filter, pagination
- Auto OSB→Tier, expiry→urgency
- Confirm modal

### v1.0.0
- Initial release: basic CRUD, Excel read/write
