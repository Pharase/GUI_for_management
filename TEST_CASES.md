# Asset Management Litigation Monitor — Test Cases

> **Author:** Senior Data Engineer + QA Engineer perspective  
> **Version under test:** v3.0.0  
> **Test framework:** Manual + Jest-compatible pseudocode  
> **Total test cases:** 87

---

## Test Case Index

| Suite | Area | Count |
|---|---|---|
| TC-GATE | Gate Logic Engine (unit) | 24 |
| TC-MAP | LawStep Field Mapping | 10 |
| TC-LOAD | Asset Management File Loading | 8 |
| TC-IMP | LawStep Import Pipeline | 10 |
| TC-CRUD | Case Register CRUD | 9 |
| TC-SLA | SLA Tracker | 6 |
| TC-PRESC | Prescription Watch | 5 |
| TC-REIMB | Reimbursement | 5 |
| TC-SEARCH | Search, Filter, Pagination | 6 |
| TC-EXP | Export / Round-trip | 4 |

---

## TC-GATE — Gate Logic Engine Unit Tests

These are pure logic tests — no DOM, no Excel required.

---

### TC-GATE-001: Gate 1 — Expired prescription
**Function:** `gate1(expiryDateStr)`  
**Input:** A date string 10 days in the past  
**Expected Output:**
```json
{ "pass": false, "label": "DO NOT FILE", "color": "badge-red", "days": -10 }
```
**Acceptance Criteria:** `pass` must be `false`; recommend from `evaluateAllGates` must be `"DO NOT FILE"`

---

### TC-GATE-002: Gate 1 — FAST TRACK (90 days remaining)
**Function:** `gate1(expiryDateStr)`  
**Input:** Date string 90 days from today  
**Expected Output:**
```json
{ "pass": true, "label": "FAST TRACK", "color": "badge-red", "days": 90 }
```

---

### TC-GATE-003: Gate 1 — 6-12 months range (270 days)
**Function:** `gate1Urgency(expiryDateStr)`  
**Input:** Date string 270 days from today  
**Expected:** `"6-12 Months"`

---

### TC-GATE-004: Gate 1 — Normal evaluation (400 days)
**Function:** `gate1Urgency(expiryDateStr)`  
**Input:** Date string 400 days from today  
**Expected:** `"Normal"`

---

### TC-GATE-005: Gate 1 — Boundary exactly 0 days (today)
**Function:** `gate1(expiryDateStr)`  
**Input:** Today's date string  
**Expected:** `pass: true`, label `"FAST TRACK"` (0 < 180 → FAST TRACK)  
**Note:** Boundary condition — day 0 is NOT expired

---

### TC-GATE-006: Gate 1 — Boundary exactly 179 days
**Function:** `gate1Urgency(expiryDateStr)`  
**Input:** Date 179 days from today  
**Expected:** `"FAST TRACK"` (179 < 180)

---

### TC-GATE-007: Gate 1 — Boundary exactly 180 days
**Function:** `gate1Urgency(expiryDateStr)`  
**Input:** Date 180 days from today  
**Expected:** `"6-12 Months"` (180 is NOT < 180, so moves to next band)

---

### TC-GATE-008: Gate 1 — Null / empty input
**Function:** `gate1('')`  
**Input:** Empty string  
**Expected:** `{ pass: null, label: "—", color: "badge-gray" }` — no crash

---

### TC-GATE-009: Gate 2 — Class A
**Function:** `gate2('A')`  
**Expected:**
```json
{ "strategy": "Immediate filing", "proceed": true }
```

---

### TC-GATE-010: Gate 2 — Class D (HOLD)
**Function:** `gate2('D')`  
**Expected:**
```json
{ "strategy": "HOLD — do not file", "proceed": false }
```
**Acceptance:** `evaluateAllGates` with Class D must return `recommend: "HOLD"`

---

### TC-GATE-011: Gate 2 — Invalid class
**Function:** `gate2('X')`  
**Expected:** `{ strategy: "—", proceed: null }` — graceful fallback

---

### TC-GATE-012: Gate 3 — Tier 1 (do NOT litigate)
**Function:** `gate3('Tier 1')`  
**Expected:**
```json
{ "rule": "Offer targeted discount — do NOT litigate", "proceed": false }
```
**Acceptance:** `evaluateAllGates` with Tier 1 (non-expired) must return `recommend: "DO NOT LITIGATE"`

---

### TC-GATE-013: Gate 3 — Tier 4 (default litigate)
**Function:** `gate3('Tier 4')`  
**Expected:** `proceed: true`

---

### TC-GATE-014: Gate 4 — ROI = 1.0 (Reject)
**Function:** `gate4(1.0)`  
**Expected:** `{ decision: "Reject", color: "badge-red" }`

---

### TC-GATE-015: Gate 4 — ROI = 1.2 (Exception boundary)
**Function:** `gate4(1.2)`  
**Expected:** `{ decision: "Exception Approval Required", color: "badge-gold" }`  
**Note:** Boundary — 1.2 is the minimum for Exception

---

### TC-GATE-016: Gate 4 — ROI = 1.499 (still Exception)
**Function:** `gate4(1.499)`  
**Expected:** `{ decision: "Exception Approval Required" }`

---

### TC-GATE-017: Gate 4 — ROI = 1.5 (Default Approve boundary)
**Function:** `gate4(1.5)`  
**Expected:** `{ decision: "Default Approve", color: "badge-green" }`

---

### TC-GATE-018: Gate 4 — ROI = 2.0 (Priority boundary)
**Function:** `gate4(2.0)`  
**Expected:** `{ decision: "Priority Filing", color: "badge-green" }`

---

### TC-GATE-019: Gate 4 — Null ROI
**Function:** `gate4(null)`  
**Expected:** `{ decision: "—" }` — no crash

---

### TC-GATE-020: OSB to Tier — boundary 49,999
**Function:** `osbToTier(49999)`  
**Expected:** `"Tier 1"`

---

### TC-GATE-021: OSB to Tier — boundary 50,000
**Function:** `osbToTier(50000)`  
**Expected:** `"Tier 2"` (50,000 is not < 50,000)

---

### TC-GATE-022: OSB to Tier — boundary 1,000,000
**Function:** `osbToTier(1000000)`  
**Expected:** `"Tier 4"`

---

### TC-GATE-023: Combined Gates — stop at Gate 1 (expired overrides all)
**Function:** `evaluateAllGates(row)`  
**Input:**
```json
{
  "filingExpiry": "<5 days ago>",
  "debtorClass": "A",
  "tier": "Tier 4",
  "gate4roi": 3.0
}
```
**Expected:** `{ recommend: "DO NOT FILE", stopReason: "Prescription expired" }`  
**Acceptance:** Even with Class A, Tier 4, ROI 3.0 — expired prescription stops all

---

### TC-GATE-024: Combined Gates — PROCEED (all gates pass)
**Function:** `evaluateAllGates(row)`  
**Input:**
```json
{
  "filingExpiry": "<400 days from now>",
  "debtorClass": "A",
  "tier": "Tier 3",
  "gate4roi": 2.5
}
```
**Expected:** `{ recommend: "PROCEED", stopReason: "" }`

---

## TC-MAP — LawStep Field Mapping Tests

---

### TC-MAP-001: Status mapping — JM → Judgment
**Function:** `LAWSTEP_STATUS_MAP['JM']`  
**Expected:** `"Judgment"`

---

### TC-MAP-002: Status mapping — Execution → Enforcement
**Function:** `LAWSTEP_STATUS_MAP['Execution']`  
**Expected:** `"Enforcement"`

---

### TC-MAP-003: Status mapping — CM → Filed & Hearing
**Function:** `LAWSTEP_STATUS_MAP['CM']`  
**Expected:** `"Filed & Hearing"`

---

### TC-MAP-004: Status mapping — Loss on sale → Closed
**Function:** `LAWSTEP_STATUS_MAP['Loss on sale']`  
**Expected:** `"Closed"`

---

### TC-MAP-005: Status mapping — unknown status (passthrough)
**Input:** `existedstatus = 'CustomStatus'`  
**Expected:** `legalStatus = 'CustomStatus'` (passes through unmapped)

---

### TC-MAP-006: OA ID mapping — "Legal" → Internal (IH)
**Input:** `lawstep_oa_id = 'Legal'`  
**Expected:** `assignedTo = 'Internal (IH)'`

---

### TC-MAP-007: OA ID mapping — office name → OA
**Input:** `lawstep_oa_id = 'Wongwit Law Office'`  
**Expected:** `assignedTo = 'OA'`

---

### TC-MAP-008: Prescription type from status — ฟ้อง → Filing
**Input:** `lawstep_status = 'ฟ้อง'`  
**Expected:** `prescriptionType = 'Filing'`

---

### TC-MAP-009: Prescription type — Execution status → Enforcement
**Input:** `lawstep_existedstatus = 'Execution'`  
**Expected:** `prescriptionType = 'Enforcement'`

---

### TC-MAP-010: Asset Management-only fields preserved during merge
**Scenario:** Case exists in Asset Management with `osb = 250000`, `debtorClass = 'B'`.  
LawStep row for same contract has status update (JM).  
**Function:** `lawstepRowToCase(law, existingCase)`  
**Expected:** Resulting row has `osb = 250000`, `debtorClass = 'B'` unchanged.  
**Acceptance:** LawStep import must NOT overwrite Asset Management financial data.

---

## TC-LOAD — Asset Management File Loading Tests

---

### TC-LOAD-001: Successful load with all 4 sheets
**Setup:** Load valid `Litigation_Weekly_Monitor.xlsx`  
**Expected:**
- `APP.caseData.length > 0`
- `APP.slaData` parsed (may be empty)
- `APP.prescriptData` parsed
- `APP.reimburseData` parsed
- File status dot turns green
- Export button enabled
- LawStep button enabled
- Toast shows success with total count

---

### TC-LOAD-002: Urgency recalculated on load
**Setup:** Asset Management file has case with `filingExpiry = '2020-01-01'` (past date, stored as "Normal" in file)  
**Expected:** After load, `caseData[n].filingUrgency === 'EXPIRED'`  
**Acceptance:** Stored urgency in file is overridden by live calculation

---

### TC-LOAD-003: Tier auto-assigned when missing
**Setup:** Asset Management row has `OSB = 75000` and blank Tier column  
**Expected:** `caseData[n].tier === 'Tier 2'`

---

### TC-LOAD-004: Rows with blank Case Ref skipped
**Setup:** Asset Management sheet has 3 data rows; 1 has blank Case Ref  
**Expected:** `APP.caseData.length === 2` (blank row skipped)

---

### TC-LOAD-005: Rows with "NaN" Case Ref skipped
**Setup:** Asset Management row where Case Ref parsed as NaN (empty numeric cell)  
**Expected:** Row excluded from `APP.caseData`

---

### TC-LOAD-006: Reimbursement TOTALS row skipped
**Setup:** Asset Management Reimbursement sheet has a row where col[0] = "TOTALS"  
**Expected:** That row NOT in `APP.reimburseData`

---

### TC-LOAD-007: Load wrong file type shows error toast
**Setup:** User selects a `.docx` or `.pdf` file via file input  
**Expected:** `toast()` called with type `'error'`; `APP.workbook` remains null

---

### TC-LOAD-008: Skeleton loader shown during parse
**Setup:** Begin loading a large Asset Management file  
**Expected:** `caseTable` innerHTML contains `skel` class elements before parse completes

---

## TC-IMP — LawStep Import Pipeline Tests

---

### TC-IMP-001: Import without Asset Management loaded shows error
**Setup:** `APP.workbook === null`; user triggers LawStep import  
**Expected:** `toast()` with type `'error'`; import aborts

---

### TC-IMP-002: Matching case gets updated
**Setup:** Asset Management has case `02200001`. LawStep has row with same contract number, status `JM`.  
**Expected:**
- `APP.caseData` entry for `02200001` has `legalStatus === 'Judgment'`
- Return value: `{ updated: 1, added: 0 }`

---

### TC-IMP-003: New case in LawStep gets added
**Setup:** Asset Management has 100 cases. LawStep has 1 new contract number not in Asset Management.  
**Expected:** `APP.caseData.length === 101`; return `added: 1`

---

### TC-IMP-004: Rows with empty contract number are skipped
**Setup:** LawStep sheet has 50 data rows, 5 have blank `lawstep_newcontractnumber`  
**Expected:** `skipped: 5`

---

### TC-IMP-005: OSB preserved from Asset Management during update
**Setup:** Asset Management case has `osb = 500000`. LawStep update for same case has no OSB field.  
**Expected:** After import, `osb === 500000` (unchanged)

---

### TC-IMP-006: Gates recalculated after import
**Setup:** Asset Management case has `filingExpiry = '2030-01-01'` (Normal). LawStep sets `legalStatus = 'Enforcement'`.  
**Expected:** After import, `filingUrgency === 'Normal'` (recalculated from expiry, not overwritten)

---

### TC-IMP-007: Toast shows correct counts
**Setup:** LawStep has 10 matching + 5 new + 2 blank rows  
**Expected:** Toast message contains `อัปเดต 10`, `เพิ่ม 5`, `ข้าม 2`

---

### TC-IMP-008: lastAction auto-generated for Judgment status
**Setup:** LawStep row has `existedstatus = 'JM'`, `judgementdate = '2025-06-15'`  
**Expected:** `lastAction === 'พิพากษา 2025-06-15'`; `nextAction === 'พิจารณาอุทธรณ์ / บังคับคดี'`

---

### TC-IMP-009: nextAction auto-generated for Filed & Hearing
**Setup:** LawStep row: `existedstatus = 'CM'`, `filingdate = '2025-01-01'`, `appdate01 = '2025-08-10'`  
**Expected:** `lastAction` contains `'ยื่นฟ้อง 2025-01-01'`; `nextAction === 'นัดสืบ 2025-08-10'`

---

### TC-IMP-010: Import sheet name mismatch shows error
**Setup:** LawStep file has sheet named `LAWSTEP_ALL` (underscore) instead of `LAWSTEP ALL`  
**Expected:** `toast()` error: `ไม่พบ sheet "LAWSTEP ALL"`; import aborts

---

## TC-CRUD — Case Register CRUD Tests

---

### TC-CRUD-001: Save new case with required fields only
**Setup:** Fill only `c_caseRef = 'TEST-001'` and `c_debtorName = 'Test Debtor'`  
**Action:** Click `saveCase()`  
**Expected:**
- `APP.caseData.length` increased by 1
- New entry has `caseRef === 'TEST-001'`
- Success toast shown

---

### TC-CRUD-002: Save fails without Case Ref
**Action:** `saveCase()` with empty `c_caseRef`  
**Expected:** `toast()` with type `'error'`; `APP.caseData.length` unchanged

---

### TC-CRUD-003: Duplicate Case Ref rejected
**Setup:** `APP.caseData` already contains `caseRef = 'TEST-001'`  
**Action:** Try to save new case with same ref  
**Expected:** `toast()` with type `'warn'` mentioning duplicate; not added

---

### TC-CRUD-004: Edit case updates in-place, not appended
**Setup:** Edit case at index 3  
**Action:** Change `debtorName`, call `saveCase()`  
**Expected:**
- `APP.caseData.length` unchanged
- `APP.caseData[3].debtorName` has new value
- `APP.editIdx.case === -1` (reset after save)

---

### TC-CRUD-005: Delete case removes from array
**Setup:** `APP.caseData.length === 5`; confirm dialog returns `true`  
**Action:** `deleteCase(2)`  
**Expected:** `APP.caseData.length === 4`; item at original index 2 gone

---

### TC-CRUD-006: Delete cancelled leaves array unchanged
**Setup:** Confirm modal returns `false`  
**Action:** `deleteCase(0)`  
**Expected:** `APP.caseData.length` unchanged

---

### TC-CRUD-007: Auto-seed SLA on new case save
**Setup:** Save new case with `legalStatus = 'Approved to Sue'`, `filingExpiry = future date`  
**Expected:**
- `APP.slaData` contains new entry with `caseRef === newCaseRef`, `slaNo === '1'`, `category === 'Sue'`
- `APP.prescriptData` contains entry for the same case

---

### TC-CRUD-008: Gate summary updates live during form input
**Setup:** Open case form, type `osb = 60000` (Tier 2)  
**Expected:**
- `c_tier.value === 'Tier 2'`
- `gateSummary` HTML contains `G3: Conditional`

---

### TC-CRUD-009: Prescription blocks show/hide correctly
**Action:** Set `c_prescriptionType = 'Filing'`  
**Expected:**
- `#prescriptionFilingBlock` is visible (`display !== 'none'`)
- `#prescriptionEnforcBlock` is hidden (`display === 'none'`)  
**Action:** Change to `'Enforcement'`  
**Expected:** Blocks swap

---

## TC-SLA — SLA Tracker Tests

---

### TC-SLA-001: SLA status auto-calculated from deadline (Breached)
**Setup:** SLA entry with `deadline = '2020-01-01'` (past)  
**Expected:** `calcSlaStatus('2020-01-01') === 'Breached'`

---

### TC-SLA-002: SLA status — At Risk (5 days remaining)
**Setup:** Deadline = today + 5 days  
**Expected:** `calcSlaStatus(deadline) === 'At Risk'`

---

### TC-SLA-003: SLA status — On Track (30 days remaining)
**Setup:** Deadline = today + 30 days  
**Expected:** `calcSlaStatus(deadline) === 'On Track'`

---

### TC-SLA-004: SLA deadline auto-calculated from trigger + days
**Setup:** Category = `Sue`, SLA No. = `4` (days = 30), Trigger Date = `2026-01-01`  
**Function:** `addDays('2026-01-01', 30)`  
**Expected:** `'2026-01-31'`  
**Acceptance:** `s_deadline.value === '2026-01-31'` after `onSlaNoChange()`

---

### TC-SLA-005: Case data auto-fills from caseRef Tab
**Setup:** `APP.caseData` has case `TEST-001` with `assignedTo = 'OA'`, `lawyer = 'John Doe'`  
**Action:** Set `s_caseRef = 'TEST-001'`, trigger `onSlaCaseRefChange()`  
**Expected:**
- `s_debtorName.value` = case's debtor name
- `s_assignedTo.value === 'OA'`
- `s_lawyer.value === 'John Doe'`

---

### TC-SLA-006: Completion date overrides status to "Completed"
**Setup:** SLA entry with `deadline = future`, but `completionDate = '2026-03-01'`  
**Expected:** `readSlaForm().status === 'Completed'`

---

## TC-PRESC — Prescription Watch Tests

---

### TC-PRESC-001: Urgency badge updates on expiry date change
**Action:** Set `p_expiryDate` to a date 90 days from now  
**Function:** `onPrescExpiryChange()`  
**Expected:**
- `p_urgency.value === 'FAST TRACK'`
- `p_urgency_badge.className` contains `badge-red`
- `p_gate1.value === 'FAST TRACK'`

---

### TC-PRESC-002: Action deadline auto-set for FAST TRACK
**Setup:** Expiry 90 days from now → FAST TRACK  
**Expected:** `p_actionDeadline.value === addDays(todayStr(), 3)`

---

### TC-PRESC-003: Auto-fill from case ref
**Setup:** `APP.caseData` has `TEST-002` with `portfolio = '22Q2-MTC'`, `osb = 100000`  
**Action:** Set `p_caseRef = 'TEST-002'`, trigger `onPrescCaseRefChange()`  
**Expected:**
- `p_portfolio.value === '22Q2-MTC'`
- `p_osb.value === '100000'`

---

### TC-PRESC-004: Urgency recalculates live on every table render
**Setup:** `APP.prescriptData` has entry with `expiryDate` = yesterday (stored urgency = `Normal`)  
**Expected:** Table renders badge as `EXPIRED` (live from `gate1Urgency()`, not stored value)

---

### TC-PRESC-005: Expired rows display with reduced opacity
**Setup:** `APP.prescriptData` entry where `daysFromNow(expiryDate) < 0`  
**Expected:** `<tr>` element has `style="opacity:0.7"`

---

## TC-REIMB — Reimbursement Tests

---

### TC-REIMB-001: REQ number auto-generated correctly
**Setup:** `APP.reimburseData = [{reqNo: 'REQ-005'}, {reqNo: 'REQ-003'}]`  
**Function:** `nextReqNo()`  
**Expected:** `'REQ-006'`

---

### TC-REIMB-002: REQ number starts at 001 on empty list
**Setup:** `APP.reimburseData = []`  
**Expected:** `nextReqNo() === 'REQ-001'`

---

### TC-REIMB-003: Expense presets load based on case legal status
**Setup:** Case `TEST-003` has `legalStatus = 'Enforcement'`  
**Action:** Set `r_caseRef = 'TEST-003'`, trigger `onReimbCaseRefChange()`  
**Expected:**
- `r_expenseType` select contains `Enforcement Officer Fee`
- Does NOT contain `Court Filing Fee` (Filing preset)

---

### TC-REIMB-004: Running total correct in table footer
**Setup:** `APP.reimburseData = [{amount: 5000}, {amount: 3000}, {amount: 2500}]`  
**Expected:** Table `<tfoot>` shows `10,500` (Thai locale format)

---

### TC-REIMB-005: Save fails without expense type selected
**Action:** `saveReimb()` with blank `r_expenseType`  
**Expected:** Error toast; `APP.reimburseData.length` unchanged

---

## TC-SEARCH — Search, Filter, Pagination Tests

---

### TC-SEARCH-001: Full-text search filters results
**Setup:** `APP.caseData` has 10 cases; 3 have `debtorName` containing `"สมชาย"`  
**Action:** Set `APP.search.case = 'สมชาย'`; call `applySearchFilter(APP.caseData, 'case')`  
**Expected:** Returns array of length 3

---

### TC-SEARCH-002: Empty search returns all records
**Setup:** `APP.search.case = ''`  
**Expected:** `applySearchFilter(APP.caseData, 'case').length === APP.caseData.length`

---

### TC-SEARCH-003: Dropdown filter stacks with search
**Setup:** 20 cases; 10 have `legalStatus = 'Enforcement'`; 3 of those contain `"john"`  
**Action:** Set filter `legalStatus = 'Enforcement'` AND search `'john'`  
**Expected:** `applySearchFilter()` returns 3 results

---

### TC-SEARCH-004: Pagination slice is correct
**Setup:** Dataset of 120 items, page 3, pageSize 50  
**Function:** `paginate(dataset, 3, 50)`  
**Expected:** `{ slice: [items 100–119], total: 120 }`  
**Note:** Last page has 20 items (120 - 100)

---

### TC-SEARCH-005: Pagination render — more than 5 pages shows ellipsis
**Setup:** 300 items, page 1, pageSize 50 → 6 pages  
**Action:** `renderPagination('container', 300, 1, 50, 'fn')`  
**Expected:** HTML contains `pg-ellipsis` span

---

### TC-SEARCH-006: Filter reset resets page to 1
**Setup:** `APP.page.case = 5`, user changes filter  
**Expected:** `APP.page.case === 1` after filter change  
**Acceptance:** User should not land on page 5 of filtered results that may have fewer pages

---

## TC-EXP — Export / Round-trip Tests

---

### TC-EXP-001: Export without Asset Management loaded shows error
**Setup:** `APP.workbook === null`  
**Action:** `exportExcel()`  
**Expected:** Error toast; no file download triggered

---

### TC-EXP-002: Urgency recalculated fresh on export
**Setup:** Case in APP.caseData has `filingExpiry` that is now FAST TRACK but stored urgency is `Normal`  
**Action:** `exportExcel()`  
**Expected:** Written row has urgency = `'FAST TRACK'` (recalculated, not stale)

---

### TC-EXP-003: Round-trip — save then reload produces same data
**Setup:** Add 3 new cases, export to file, reload the exported file  
**Expected:**
- `APP.caseData.length` same before and after
- All 3 new cases present with correct field values
- No data corruption in Case Ref, Debtor Name, OSB, dates

---

### TC-EXP-004: TOTALS row written to Reimbursement on export
**Setup:** `APP.reimburseData = [{amount: 5000, advance: 1000}, {amount: 3000, advance: 500}]`  
**Action:** `exportExcel()`  
**Expected:** Exported sheet has a row with `col[0] = 'TOTALS'`, `col[6] = 8000`, `col[10] = 1500`

---

## Edge Cases & Negative Tests

---

### TC-EDGE-001: Very large OSB (10 billion)
**Function:** `osbToTier(10000000000)`  
**Expected:** `'Tier 4'` — no overflow

---

### TC-EDGE-002: OSB = 0
**Function:** `osbToTier(0)`  
**Expected:** `''` — empty string, not an error

---

### TC-EDGE-003: daysFromNow with invalid date string
**Function:** `daysFromNow('not-a-date')`  
**Expected:** Returns `null` — no crash

---

### TC-EDGE-004: fmtDate with Date object
**Function:** `fmtDate(new Date('2026-03-24'))`  
**Expected:** `'2026-03-24'`

---

### TC-EDGE-005: fmtDate with null
**Function:** `fmtDate(null)`  
**Expected:** `''`

---

### TC-EDGE-006: fmtThb with string number
**Function:** `fmtThb('12345.67')`  
**Expected:** `'12,345.67'` (Thai locale)

---

### TC-EDGE-007: fmtThb with empty string
**Function:** `fmtThb('')`  
**Expected:** `'—'`

---

### TC-EDGE-008: Gate 1 — exactly 365 days
**Function:** `gate1Urgency(date365DaysFromNow)`  
**Expected:** `'Normal'` (365 is NOT < 365)

---

### TC-EDGE-009: Gate 1 — exactly 364 days
**Function:** `gate1Urgency(date364DaysFromNow)`  
**Expected:** `'6-12 Months'`

---

### TC-EDGE-010: calcSlaStatus — exactly 7 days
**Function:** `calcSlaStatus(date7DaysFromNow)`  
**Expected:** `'At Risk'` (7 is ≤ 7)

---

### TC-EDGE-011: calcSlaStatus — exactly 8 days
**Function:** `calcSlaStatus(date8DaysFromNow)`  
**Expected:** `'On Track'`

---

### TC-EDGE-012: addDays — month boundary
**Function:** `addDays('2026-01-30', 5)`  
**Expected:** `'2026-02-04'`

---

### TC-EDGE-013: addDays — year boundary
**Function:** `addDays('2025-12-28', 10)`  
**Expected:** `'2026-01-07'`

---

### TC-EDGE-014: nextReqNo — handles non-numeric suffixes gracefully
**Setup:** `APP.reimburseData = [{reqNo: 'REQ-ABC'}]`  
**Expected:** `nextReqNo() === 'REQ-001'` (parseInt('ABC') = NaN → fallback to 0)

---

## Test Data Fixtures

```javascript
// Fixture: Case with all fields
const CASE_FIXTURE = {
  caseRef: 'TC-TEST-001',
  debtorName: 'นาย ทดสอบ ระบบ',
  portfolio: '22Q2-MTC',
  osb: 250000,
  tier: 'Tier 2',
  debtorClass: 'B',
  legalStatus: 'Approved to Sue',
  assignedTo: 'OA',
  assignDate: '2026-01-15',
  lawyer: 'Wongwit Law Office',
  prescriptionType: 'Filing',
  filingExpiry: '<180 days from test date>',
  enforcExpiry: '',
  filingUrgency: 'FAST TRACK',
  enforcUrgency: '',
  gate1: 'FAST TRACK',
  gate2: 'Wage garnishment case',
  gate3: 'Conditional — asset or workplace required',
  gate4roi: 1.8,
  gate4dec: 'Default Approve',
};

// Fixture: LawStep row (minimal)
const LAWSTEP_FIXTURE = {
  lawstep_newcontractnumber: 'TC-TEST-001',
  lawstep_name: 'นาย ทดสอบ ระบบ',
  lawstep_existedstatus: 'JM',
  lawstep_oa_id: 'Legal',
  lawstep_status: 'ฟ้อง',
  lawstep_filingdate: '2025-11-01',
  lawstep_judgementdate: '2026-02-15',
  lawstep_sueapprovaldate: '2025-10-01',
  6: '22Q2-MTC',
};
```

---

## Test Execution Checklist

### Pre-test setup
- [ ] Open `dist/app.html` in Chrome (latest)
- [ ] Open DevTools → Console (watch for errors)
- [ ] Have `Litigation_Weekly_Monitor.xlsx` ready
- [ ] Have `Law_Step.xlsx` ready
- [ ] Clear browser cache if re-running

### Smoke test (5 min)
- [ ] Load Asset Management file → no console errors → data appears
- [ ] Navigate all 4 tabs → data shows in each
- [ ] Import LawStep → counts change
- [ ] Export → file downloads → re-open in Excel → data intact

### Regression after any code change
- [ ] All TC-GATE tests (unit) pass
- [ ] TC-LOAD-001 (full load) pass
- [ ] TC-CRUD-001, 004, 005 (add/edit/delete) pass
- [ ] TC-EXP-003 (round-trip) pass

### Performance baseline
| Scenario | Acceptable |
|---|---|
| Load 8000 case Asset Management file | < 3 seconds |
| LawStep import 1200 rows | < 2 seconds |
| Render table with search | < 500ms |
| Export 8000 cases | < 5 seconds |
