// ═══════════════════════════════════════════════════════════════
// GATE LOGIC ENGINE  (from 📖 Reference sheet)
// ═══════════════════════════════════════════════════════════════

// GATE 1 — Prescription control
function gate1(expiryDateStr) {
  if (!expiryDateStr) return { pass: null, label: '—', color: 'badge-gray' };
  const d = daysFromNow(expiryDateStr);
  if (d < 0)   return { pass: false, label: 'DO NOT FILE',          color: 'badge-red',  days: d };
  if (d < 180) return { pass: true,  label: 'FAST TRACK',           color: 'badge-red',  days: d };
  if (d < 365) return { pass: true,  label: 'Prioritize in queue',  color: 'badge-gold', days: d };
  return        { pass: true,  label: 'Normal evaluation',    color: 'badge-green',days: d };
}

function gate1Urgency(expiryDateStr) {
  const g = gate1(expiryDateStr);
  if (!expiryDateStr) return '';
  const d = g.days;
  if (d < 0)   return 'EXPIRED';
  if (d < 180) return 'FAST TRACK';
  if (d < 365) return '6-12 Months';
  return 'Normal';
}

// GATE 2 — Asset & Workplace (Debtor Class)
// A = confirmed asset+workplace → Immediate filing
// B = workplace only → Wage garnishment
// C = suspected asset → Asset investigation first
// D = nothing → HOLD
function gate2(debtorClass) {
  const map = {
    'A': { strategy: 'Immediate filing',           proceed: true  },
    'B': { strategy: 'Wage garnishment case',       proceed: true  },
    'C': { strategy: 'Asset investigation first',   proceed: true  },
    'D': { strategy: 'HOLD — do not file',          proceed: false },
  };
  return map[debtorClass] || { strategy: '—', proceed: null };
}

// GATE 3 — Financial viability (Tier)
// Tier 1 <50K → do NOT litigate (targeted discount)
// Tier 2 50K-300K → conditional
// Tier 3/4 → default litigate
function gate3(tier) {
  const map = {
    'Tier 1': { rule: 'Offer targeted discount — do NOT litigate', proceed: false },
    'Tier 2': { rule: 'Conditional — asset or workplace required',  proceed: null  },
    'Tier 3': { rule: 'Default litigate (unless legally defective)', proceed: true  },
    'Tier 4': { rule: 'Default litigate (unless legally defective)', proceed: true  },
  };
  return map[tier] || { rule: '—', proceed: null };
}

// GATE 4 — Cost-benefit ROI
// ROI = OSB / (filing fee + lawyer cost + process cost)
// <1.2x → Reject; 1.2-1.5x → Exception; >1.5x → Default Approve; >2.0x → Priority
function calcROI(osb, filingFee=0, lawyerCost=3000, processCost=2000) {
  const cost = filingFee + lawyerCost + processCost;
  if (!cost || !osb) return null;
  return Number(osb) / cost;
}

function gate4(roi) {
  if (roi === null || roi === undefined || roi === '') return { decision: '—', approver: '—', color: 'badge-gray' };
  const r = Number(roi);
  if (r >= 2.0) return { decision: 'Priority Filing',           approver: 'DCEO / CEO', color: 'badge-green' };
  if (r >= 1.5) return { decision: 'Default Approve',           approver: 'DCEO / CEO', color: 'badge-green' };
  if (r >= 1.2) return { decision: 'Exception Approval Required',approver: 'DCEO / CEO', color: 'badge-gold'  };
  return              { decision: 'Reject',                     approver: '—',          color: 'badge-red'   };
}

// Combined Gate summary for a case
function evaluateAllGates(row) {
  const g1filing  = row.filingExpiry  ? gate1(row.filingExpiry)  : null;
  const g1enforce = row.enforcExpiry  ? gate1(row.enforcExpiry)  : null;
  const g1Result  = g1filing || g1enforce;
  const g2Result  = gate2(row.debtorClass);
  const g3Result  = gate3(row.tier);
  const roi       = (row.gate4roi && Number(row.gate4roi)) ? Number(row.gate4roi) : null;
  const g4Result  = gate4(roi);

  // Overall recommendation
  let recommend = 'PROCEED';
  let stopReason = '';
  if (g1Result && !g1Result.pass) { recommend = 'DO NOT FILE'; stopReason = 'Prescription expired'; }
  else if (!g2Result.proceed && g2Result.proceed !== null) { recommend = 'HOLD'; stopReason = 'Debtor class D'; }
  else if (!g3Result.proceed) { recommend = 'DO NOT LITIGATE'; stopReason = 'Tier 1 — low viability'; }
  else if (g4Result.decision === 'Reject') { recommend = 'REJECT'; stopReason = 'ROI < 1.2x'; }

  return { g1:g1Result, g2:g2Result, g3:g3Result, g4:g4Result, recommend, stopReason };
}

// OSB → Tier
function osbToTier(osb) {
  const n=Number(osb);
  if(!n) return '';
  if(n<50000)   return 'Tier 1';
  if(n<300000)  return 'Tier 2';
  if(n<1000000) return 'Tier 3';
  return 'Tier 4';
}

// Tier → default Class suggestion
function tierToDefaultClass(tier) {
  return {'Tier 1':'D','Tier 2':'C','Tier 3':'B','Tier 4':'A'}[tier]||'';
}

// Assignment logic
function calcAssignment(row) {
  // IH: FAST TRACK / OSB>1M / in-house / Northern region
  // Otherwise OA
  const isFastTrack = row.filingUrgency === 'FAST TRACK' || row.enforcUrgency === 'FAST TRACK';
  const osb = Number(row.osb)||0;
  if (isFastTrack || osb > 1000000) return 'Internal (IH)';
  return 'OA';
}

// SLA status from deadline
function calcSlaStatus(deadline) {
  if (!deadline) return '';
  const d = daysFromNow(deadline);
  if (d===null) return '';
  if (d<0)  return 'Breached';
  if (d<=7) return 'At Risk';
  return 'On Track';
}

function addDays(dateStr, days) {
  if(!dateStr||!days) return '';
  const d=new Date(dateStr);
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}

function getCaseByRef(caseRef) {
  return APP.caseData.find(c=>String(c.caseRef)===String(caseRef))||null;
}

function nextReqNo() {
  const nums=APP.reimburseData.map(r=>parseInt((r.reqNo||'').replace(/\D/g,''))||0);
  return `REQ-${String((nums.length?Math.max(...nums):0)+1).padStart(3,'0')}`;
}

// ═══════════════════════════════════════════════════════════════
// LAW_STEP IMPORT ENGINE
// ═══════════════════════════════════════════════════════════════

// Status mapping from LawStep existedstatus → Legal Status
const LAWSTEP_STATUS_MAP = {
  'Closed':          'Closed',
  'JM':              'Judgment',
  'Execution':       'Enforcement',
  'Pre-Execution':   'Judgment',
  'CM':              'Filed & Hearing',
  'Pre-Subrogation': 'Approved to Sue',
  'Subrogation':     'Approved to Sue',
  'NPL':             'Non-legal',
  'Early Sue':       'Approved to Sue',
  'Loss-JM':         'Closed',
  'Loss on sale':    'Closed',
  'Loss on Sale':    'Closed',
  'Loss no litigation': 'Closed',
  'Bankruptcy':      'Closed',
};

// LawStep field → case field mapping
function lawstepRowToCase(law, existingCase) {
  const contractNo = String(law['lawstep_newcontractnumber']||'').trim();
  const rawStatus  = String(law['lawstep_existedstatus']||'');
  const legalStatus = LAWSTEP_STATUS_MAP[rawStatus] || rawStatus;

  const oaId = String(law['lawstep_oa_id']||'');
  const assignedTo = (oaId==='Legal'||oaId==='Internal') ? 'Internal (IH)' : 'OA';
  const lawyerName = String(law['lawstep_oaforsue_id']||law['lawstep_oaforsubrogation_id']||'');

  // Determine prescription type from status
  const status = String(law['lawstep_status']||'');
  let prescriptionType = '';
  let filingExpiry = '';
  let enforcExpiry = '';

  if (status === 'สวมสิทธิ') {
    prescriptionType = 'Filing'; // subrogation = filing
  } else if (rawStatus === 'Execution' || rawStatus === 'Pre-Execution') {
    prescriptionType = 'Enforcement';
  } else if (status === 'ฟ้อง') {
    prescriptionType = 'Filing';
  }

  // Dates
  const filingDate    = fmtDate(law['lawstep_filingdate']);
  const judgmentDate  = fmtDate(law['lawstep_judgementdate']);
  const enforceDate   = fmtDate(law['lawstep_enforcereqdate']);
  const approvalDate   = fmtDate(law['lawstep_sueapprovaldate']||law['lawstep_subrogationapprovaldate']);
  const port          = String(law['lawstep_oa_id']&&law[6]?law[6]:existingCase?.portfolio||'');
  const portCode      = String(law[6]||existingCase?.portfolio||'');

  // Court & case numbers
  const blackNo  = String(law['lawstep_blacknumber']||'');
  const redNo    = String(law['lawstep_rednumber']||'');
  const court    = String(law['lawstep_courtforsue']||'');

  // Last action from latest data
  let lastAction = '';
  let nextAction = '';
  if (legalStatus === 'Enforcement') {
    lastAction = enforceDate ? `ออกหมายตั้ง ${enforceDate}` : '';
    nextAction = 'ติดตามผลบังคับคดี';
  } else if (legalStatus === 'Judgment') {
    lastAction = judgmentDate ? `พิพากษา ${judgmentDate}` : '';
    nextAction = 'พิจารณาอุทธรณ์ / บังคับคดี';
  } else if (legalStatus === 'Filed & Hearing') {
    lastAction = filingDate ? `ยื่นฟ้อง ${filingDate}` : '';
    const hearing1 = fmtDate(law['lawstep_appdate01']);
    nextAction = hearing1 ? `นัดสืบ ${hearing1}` : 'รอนัดสืบ';
  } else if (legalStatus === 'Approved to Sue') {
    lastAction = approvalDate ? `อนุมัติฟ้อง ${approvalDate}` : '';
    nextAction = 'เตรียมยื่นฟ้อง';
  }

  // Judgement result → remarks
  const judgementResult = String(law['lawstep_judgementresult']||'');
  const judgementSum    = String(law['lawstep_judgementsum']||'');
  const remarks         = [judgementResult, judgementSum].filter(Boolean).join(' | ').slice(0,200);

  // Keep existing case data for fields not in LawStep
  const base = existingCase || {};

  return {
    caseRef:          contractNo,
    debtorName:       String(law['lawstep_name']||base.debtorName||''),
    portfolio:        portCode||base.portfolio||'',
    osb:              base.osb||'',                          // OSB comes from the case workbook, not LawStep
    tier:             base.tier||osbToTier(base.osb)||'',
    debtorClass:      base.debtorClass||'',
    legalStatus,
    assignedTo:       assignedTo||base.assignedTo||'',
    assignDate:       approvalDate||base.assignDate||'',
    lawyer:           lawyerName!=='Legal'?lawyerName:base.lawyer||'',
    prescriptionType: prescriptionType||base.prescriptionType||'',
    filingExpiry:     base.filingExpiry||'',
    enforcExpiry:     base.enforcExpiry||'',
    filingUrgency:    gate1Urgency(base.filingExpiry)||base.filingUrgency||'',
    enforcUrgency:    gate1Urgency(base.enforcExpiry)||base.enforcUrgency||'',
    gate1:            base.gate1||'',
    gate2:            base.debtorClass ? gate2(base.debtorClass).strategy : base.gate2||'',
    gate3:            (base.tier||osbToTier(base.osb)) ? gate3(base.tier||osbToTier(base.osb)).rule : base.gate3||'',
    gate4roi:         base.gate4roi||'',
    gate4dec:         base.gate4dec||'',
    approvalRef:           String(law['lawstep_blacknumber']||base.approvalRef||''),
    approvalDate:          approvalDate||base.approvalDate||'',
    filingDate,
    judgmentDate,
    enforcMethod:     '',
    enforcDate:       enforceDate,
    blackNumber:      blackNo,
    redNumber:        redNo,
    court,
    lastAction:       lastAction||base.lastAction||'',
    nextAction:       nextAction||base.nextAction||'',
    nextActionDate:   fmtDate(law['lawstep_appdate01'])||base.nextActionDate||'',
    slaStatus:        '',  // will be auto-calculated
    remarks:          remarks||base.remarks||'',
    reviewedBy:       base.reviewedBy||'',
    reviewDate:       base.reviewDate||'',
    // Extra fields from LawStep (stored for reference)
    _lawstepStatus:   rawStatus,
    _sueDefund:       law['lawstep_suedefund']||'',
    _principal:       law['lawstep_pricipal']||'',
    _interest:        law['lawstep_interest']||'',
    _hearing1:        fmtDate(law['lawstep_appdate01']),
    _hearing2:        fmtDate(law['lawstep_appdate02']),
    _hearing3:        fmtDate(law['lawstep_appdate03']),
    _updatedAt:       fmtDate(law['lawstep_date']),
  };
}

// Source exports may put a system prefix in front of field names (e.g. <prefix>lawstep_name); drop it.
function neutralKey(h) {
  return String(h).trim().replace(/^[a-z]*?(?=lawstep_|oareport_)/i, '');
}

// Process full LawStep import
function processLawstepImport(lawWs) {
  const rows = XLSX.utils.sheet_to_json(lawWs, { header: 1, defval: '' });
  if (rows.length < 2) return { updated: 0, added: 0, skipped: 0 };

  // Build header map
  const headers = rows[1];  // row index 1 = header (row 0 = Thai display names)
  const colMap = {};
  headers.forEach((h, i) => { if (h) colMap[String(h).trim()] = i; });

  let updated=0, added=0, skipped=0;

  for (let i=2; i<rows.length; i++) {
    const r = rows[i];
    // Convert row array to object using header map
    const law = {};
    headers.forEach((h, ci) => { if (h) law[neutralKey(h)] = r[ci]; });
    // Also preserve numeric indexes for unnamed columns
    r.forEach((val, ci) => { law[ci] = val; });

    const contractNo = String(law['lawstep_newcontractnumber']||'').trim();
    if (!contractNo || contractNo === 'NaN') { skipped++; continue; }

    const existingIdx = APP.caseData.findIndex(c => String(c.caseRef) === contractNo);
    const existingCase = existingIdx >= 0 ? APP.caseData[existingIdx] : null;

    const caseRow = lawstepRowToCase(law, existingCase);

    // Auto-calculate gates now that we have full data
    const gates = evaluateAllGates(caseRow);
    if (!caseRow.gate1 && caseRow.filingExpiry)   caseRow.gate1   = gates.g1 ? gates.g1.label : '';
    if (!caseRow.gate2 && caseRow.debtorClass)     caseRow.gate2   = gates.g2.strategy;
    if (!caseRow.gate3 && caseRow.tier)            caseRow.gate3   = gates.g3.rule;
    if (!caseRow.gate4dec && gates.g4.decision!=='—') caseRow.gate4dec = gates.g4.decision;

    if (existingIdx >= 0) {
      APP.caseData[existingIdx] = caseRow;
      updated++;
    } else {
      APP.caseData.push(caseRow);
      added++;
    }
  }

  return { updated, added, skipped };
}

// ═══════════════════════════════════════════════════════════════
// SLA MILESTONE LIBRARY
// ═══════════════════════════════════════════════════════════════
APP.slaMilestones = {
  Sue: {
    1: { label: 'Case approval by management',             days: 3  },
    2: { label: 'Complete documents sent to OA',    days: 7  },
    3: { label: 'Legal notice sent to debtor',      days: 7  },
    4: { label: 'File lawsuit to court',            days: 30 },
    5: { label: 'First hearing date obtained',      days: 60 },
    6: { label: 'Obtain court judgment',            days: 90 },
    7: { label: 'Obtain enforcement officer appt.', days: 30 },
    8: { label: 'Prepare appeal/cassation draft',   days: 30 },
  },
  Subrogation: {
    1: { label: 'Subrogation case approval by management', days: 3  },
    2: { label: 'Insurance documents verified',     days: 5  },
    3: { label: 'File subrogation claim',           days: 30 },
    4: { label: 'Respond to counter-claim',         days: 14 },
    5: { label: 'Obtain subrogation judgment',      days: 90 },
  },
  Execution: {
    1: { label: 'Issue execution writ',             days: 7  },
    2: { label: 'Locate debtor assets',             days: 14 },
    3: { label: 'Seize / freeze assets',            days: 7  },
    4: { label: 'Public auction / sale',            days: 30 },
    5: { label: 'Receive proceeds',                 days: 14 },
    6: { label: 'Close execution file',             days: 7  },
  },
};

APP.expensePresets = {
  Filing:      [
    { label: 'Court Filing Fee',        amount: 0    },
    { label: 'Process Server Fee',      amount: 500  },
    { label: 'Document Translation',    amount: 0    },
    { label: 'Legal Notice Postage',    amount: 200  },
    { label: 'OA Professional Fee',     amount: 0    },
    { label: 'Stamp Duty',              amount: 0    },
  ],
  Enforcement: [
    { label: 'Enforcement Officer Fee', amount: 1500 },
    { label: 'Asset Seizure Fee',       amount: 0    },
    { label: 'Public Auction Fee',      amount: 0    },
    { label: 'Bailiff Service Fee',     amount: 800  },
    { label: 'Bank Account Freeze Fee', amount: 500  },
    { label: 'OA Professional Fee',     amount: 0    },
  ],
  General:     [
    { label: 'Court Fee',               amount: 0    },
    { label: 'Professional Fee',        amount: 0    },
    { label: 'Process Server',          amount: 500  },
    { label: 'Translation',             amount: 0    },
  ],
};
