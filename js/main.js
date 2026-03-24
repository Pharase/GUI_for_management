// ═══════════════════════════════════════════════════════════════
// LOAD Asset Management (primary database)
// ═══════════════════════════════════════════════════════════════
function loadCases(e) {
  const file = e.target.files[0];
  if (!file) return;
  ['caseTable','slaTable','prescriptTable','reimburseTable'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.innerHTML=skeletonTable(8,10);
  });
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      APP.workbook = XLSX.read(ev.target.result, { type:'binary', cellDates:true });

      // ── Case Register ─────────────────────────────────────────
      APP.caseData = [];
      const wsC = APP.workbook.Sheets['📁 Case Register'];
      if (wsC) {
        const rows = XLSX.utils.sheet_to_json(wsC, { header:1, defval:'' });
        for (let i=2; i<rows.length; i++) {
          const r = rows[i];
          const ref = String(r[0]||'').trim();
          if (!ref || ref==='NaN') continue;
          const osb = r[3]!==''?r[3]:'';
          const tier = String(r[4]||'')||osbToTier(osb);
          APP.caseData.push({
            caseRef:ref, debtorName:String(r[1]||''), portfolio:String(r[2]||''), osb,
            tier, debtorClass:String(r[5]||''), legalStatus:String(r[6]||''),
            assignedTo:String(r[7]||''), assignDate:fmtDate(r[8]), lawyer:String(r[9]||''),
            prescriptionType:String(r[10]||''),
            filingExpiry:fmtDate(r[11]), enforcExpiry:fmtDate(r[12]),
            filingUrgency:gate1Urgency(fmtDate(r[11]))||String(r[13]||''),
            enforcUrgency:gate1Urgency(fmtDate(r[12]))||String(r[14]||''),
            gate1:String(r[15]||''), gate2:String(r[16]||''),
            gate3:String(r[17]||''), gate4roi:r[18]!==''?r[18]:'',
            gate4dec:String(r[19]||''), approvalRef:String(r[20]||''),
            approvalDate:fmtDate(r[21]),
            filingDate:fmtDate(r[23]), judgmentDate:fmtDate(r[24]),
            enforcMethod:String(r[25]||''), enforcDate:fmtDate(r[26]),
            lastAction:String(r[27]||''), nextAction:String(r[28]||''),
            nextActionDate:fmtDate(r[29]), slaStatus:String(r[30]||''),
            remarks:String(r[31]||''), reviewedBy:String(r[32]||''), reviewDate:fmtDate(r[33]),
          });
        }
      }

      // ── SLA Tracker ───────────────────────────────────────────
      APP.slaData = [];
      const wsS = APP.workbook.Sheets['⏰ SLA Tracker'];
      if (wsS) {
        const rows = XLSX.utils.sheet_to_json(wsS, { header:1, defval:'' });
        for (let i=2; i<rows.length; i++) {
          const r=rows[i]; const ref=String(r[0]||'').trim();
          if(!ref||ref==='NaN') continue;
          APP.slaData.push({ caseRef:ref, debtorName:String(r[1]||''),
            assignedTo:String(r[2]||''), slaNo:r[3]!==''?String(r[3]):'',
            category:String(r[4]||''), milestone:String(r[5]||''),
            triggerDate:fmtDate(r[6]), deadline:fmtDate(r[7]),
            status:calcSlaStatus(fmtDate(r[7]))||String(r[8]||''),
            completionDate:fmtDate(r[9]), lawyer:String(r[11]||''),
            escalation:String(r[12]||''), remarks:String(r[13]||''),
          });
        }
      }

      // ── Prescription Watch ────────────────────────────────────
      APP.prescriptData = [];
      const wsP = APP.workbook.Sheets['🚨 Prescription Watch'];
      if (wsP) {
        const rows = XLSX.utils.sheet_to_json(wsP, { header:1, defval:'' });
        for (let i=2; i<rows.length; i++) {
          const r=rows[i]; const ref=String(r[0]||'').trim();
          if(!ref||ref==='NaN') continue;
          const expiry=fmtDate(r[6]);
          APP.prescriptData.push({ caseRef:ref, debtorName:String(r[1]||''),
            portfolio:String(r[2]||''), osb:r[3]!==''?r[3]:'',
            assignedTo:String(r[4]||''), prescriptionType:String(r[5]||''),
            expiryDate:expiry, urgency:gate1Urgency(expiry)||String(r[8]||''),
            gate1:gate1(expiry).label||String(r[9]||''),
            actionRequired:String(r[10]||''), actionOwner:String(r[11]||''),
            actionDeadline:fmtDate(r[12]), status:String(r[13]||''), remarks:String(r[14]||''),
          });
        }
      }

      // ── Reimbursement ─────────────────────────────────────────
      APP.reimburseData = [];
      const wsR = APP.workbook.Sheets['💰 Reimbursement'];
      if (wsR) {
        const rows = XLSX.utils.sheet_to_json(wsR, { header:1, defval:'' });
        for (let i=2; i<rows.length; i++) {
          const r=rows[i]; const reqNo=String(r[0]||'').trim();
          if(!reqNo||reqNo==='NaN'||reqNo.toUpperCase()==='TOTALS') continue;
          APP.reimburseData.push({ reqNo, lawyer:String(r[1]||''),
            caseRef:String(r[2]||''), debtorName:String(r[3]||''),
            expenseType:String(r[4]||''), amount:r[5]!==''?r[5]:'',
            payStatus:String(r[6]||''), payDate:fmtDate(r[7]),
            advance:r[9]!==''?r[9]:'', advanceDate:fmtDate(r[10]),
            receipt:String(r[11]||''), reimbRef:String(r[12]||''),
            approvedBy:String(r[13]||''), remarks:String(r[14]||''),
          });
        }
      }

      document.getElementById('fileStatus').classList.add('loaded');
      document.getElementById('fileStatusText').textContent = file.name;
      document.getElementById('btnExport').disabled = false;
      document.getElementById('btnLawstep').disabled = false;

      renderCaseTable(); renderSlaTable(); renderPrescriptTable(); renderReimburseTable();
      updateCounts();
      const total = APP.caseData.length+APP.slaData.length+APP.prescriptData.length+APP.reimburseData.length;
      toast(`โหลด Asset Management สำเร็จ — ${total.toLocaleString()} รายการ · ข้อมูล Gate คำนวณอัตโนมัติแล้ว`, 'success');
    } catch(err) {
      toast('โหลดไม่สำเร็จ: '+err.message,'error');
      console.error(err);
    }
  };
  reader.readAsBinaryString(file);
}

// ─── Load LawStep (delta update) ─────────────────────────────────
function loadLawStep(e) {
  const file = e.target.files[0];
  if (!file) { toast('เลือกไฟล์ Law_Step.xlsx','warn'); return; }
  if (!APP.workbook) { toast('กรุณาโหลดไฟล์ Asset Management ก่อน','error'); return; }
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const wb = XLSX.read(ev.target.result, { type:'binary', cellDates:true });
      const wsL = wb.Sheets['LAWSTEP ALL'];
      if (!wsL) { toast('ไม่พบ sheet "LAWSTEP ALL"','error'); return; }
      const result = processLawstepImport(wsL);
      renderCaseTable(); renderPrescriptTable(); updateCounts();
      toast(`อัปเดตจาก LawStep สำเร็จ — เพิ่ม ${result.added} | อัปเดต ${result.updated} | ข้าม ${result.skipped} รายการ`, 'success', 6000);
    } catch(err) {
      toast('LawStep import ผิดพลาด: '+err.message,'error');
      console.error(err);
    }
  };
  reader.readAsBinaryString(file);
}

// ═══════════════════════════════════════════════════════════════
// SAVE / EXPORT Asset Management (write-back as DB)
// ═══════════════════════════════════════════════════════════════
function clearSheetRows(ws, fromRow) {
  const ref=ws['!ref']; if(!ref) return;
  const rng=XLSX.utils.decode_range(ref);
  for(let R=fromRow;R<=rng.e.r;R++)
    for(let C=rng.s.c;C<=rng.e.c;C++)
      delete ws[XLSX.utils.encode_cell({r:R,c:C})];
}

function exportExcel() {
  if (!APP.workbook) { toast('กรุณาโหลดไฟล์ Asset Management ก่อน','error'); return; }
  const btn=document.getElementById('btnExport');
  btn.disabled=true; btn.textContent='⏳ กำลังบันทึก…';

  setTimeout(()=>{
    try {
      // ── Case Register ─────────────────────────────────────────
      const wsC=APP.workbook.Sheets['📁 Case Register'];
      if(wsC) {
        clearSheetRows(wsC,2);
        APP.caseData.forEach((r,i)=>{
          const fu=gate1Urgency(r.filingExpiry)||r.filingUrgency;
          const eu=gate1Urgency(r.enforcExpiry)||r.enforcUrgency;
          const g=evaluateAllGates(r);
          XLSX.utils.sheet_add_aoa(wsC,[[
            r.caseRef,r.debtorName,r.portfolio,r.osb,
            r.tier||osbToTier(r.osb),r.debtorClass,r.legalStatus,
            r.assignedTo||calcAssignment(r),r.assignDate,r.lawyer,
            r.prescriptionType,r.filingExpiry,r.enforcExpiry,fu,eu,
            r.gate1||(g.g1?g.g1.label:''),
            r.gate2||g.g2.strategy,
            r.gate3||g.g3.rule,
            r.gate4roi,r.gate4dec||g.g4.decision,
            r.approvalRef,r.approvalDate,'',
            r.filingDate,r.judgmentDate,r.enforcMethod,r.enforcDate,
            r.lastAction,r.nextAction,r.nextActionDate,
            r.slaStatus||'',r.remarks,r.reviewedBy,r.reviewDate,
          ]],{origin:{r:2+i,c:0}});
        });
      }

      // ── SLA Tracker ───────────────────────────────────────────
      const wsS=APP.workbook.Sheets['⏰ SLA Tracker'];
      if(wsS) {
        clearSheetRows(wsS,2);
        APP.slaData.forEach((r,i)=>{
          const st=r.completionDate?'Completed':calcSlaStatus(r.deadline)||r.status;
          XLSX.utils.sheet_add_aoa(wsS,[[
            r.caseRef,r.debtorName,r.assignedTo,r.slaNo,r.category,
            r.milestone,r.triggerDate,r.deadline,st,r.completionDate,
            '',r.lawyer,r.escalation,r.remarks,
          ]],{origin:{r:2+i,c:0}});
        });
      }

      // ── Prescription Watch ────────────────────────────────────
      const wsP=APP.workbook.Sheets['🚨 Prescription Watch'];
      if(wsP) {
        clearSheetRows(wsP,2);
        APP.prescriptData.forEach((r,i)=>{
          const urg=gate1Urgency(r.expiryDate)||r.urgency;
          const g1=gate1(r.expiryDate).label||r.gate1;
          XLSX.utils.sheet_add_aoa(wsP,[[
            r.caseRef,r.debtorName,r.portfolio,r.osb,r.assignedTo,
            r.prescriptionType,r.expiryDate,'',urg,g1,
            r.actionRequired,r.actionOwner,r.actionDeadline,r.status,'',r.remarks,
          ]],{origin:{r:2+i,c:0}});
        });
      }

      // ── Reimbursement ─────────────────────────────────────────
      const wsR=APP.workbook.Sheets['💰 Reimbursement'];
      if(wsR) {
        clearSheetRows(wsR,2);
        APP.reimburseData.forEach((r,i)=>{
          XLSX.utils.sheet_add_aoa(wsR,[[
            r.reqNo,r.lawyer,r.caseRef,r.debtorName,r.expenseType,
            r.amount,r.payStatus,r.payDate,'',r.advance,r.advanceDate,
            r.receipt,r.reimbRef,r.approvedBy,r.remarks,
          ]],{origin:{r:2+i,c:0}});
        });
        const tot=2+APP.reimburseData.length;
        const tAmt=APP.reimburseData.reduce((s,r)=>s+(Number(r.amount)||0),0);
        const tAdv=APP.reimburseData.reduce((s,r)=>s+(Number(r.advance)||0),0);
        XLSX.utils.sheet_add_aoa(wsR,[['TOTALS','','','','',tAmt,'','','',tAdv]],{origin:{r:tot,c:0}});
      }

      XLSX.writeFile(APP.workbook,'Litigation_Updated.xlsx');
      toast('บันทึกสำเร็จ: Litigation_Updated.xlsx  [Ctrl+S ครั้งต่อไป]','success');
    } catch(err) {
      toast('บันทึกไม่สำเร็จ: '+err.message,'error');
    } finally {
      btn.disabled=false; btn.textContent='⬇️ บันทึก / Export';
    }
  },50);
}

// ═══════════════════════════════════════════════════════════════
// CASE REGISTER — CRUD
// ═══════════════════════════════════════════════════════════════
const CASE_FIELDS = [
  'c_caseRef','c_debtorName','c_portfolio','c_osb','c_tier','c_debtorClass',
  'c_legalStatus','c_assignedTo','c_assignDate','c_lawyer','c_prescriptionType',
  'c_filingExpiry','c_enforcExpiry','c_filingUrgency','c_enforcUrgency',
  'c_gate1','c_gate2','c_gate3','c_gate4roi','c_gate4dec',
  'c_pamRef','c_pamDate','c_filingDate','c_judgmentDate',
  'c_enforcMethod','c_enforcDate','c_lastAction','c_nextAction',
  'c_nextActionDate','c_slaStatus','c_remarks','c_reviewedBy','c_reviewDate',
];

// Live recalculation as user types
function recalcCaseForm() {
  const osb  = nv('c_osb');
  const tier = v('c_tier') || osbToTier(osb);
  if (osb && !v('c_tier'))   setField('c_tier', tier);
  if (tier && !v('c_debtorClass')) setField('c_debtorClass', tierToDefaultClass(tier));

  // Gate 1 urgency from expiry dates
  const fe=v('c_filingExpiry'), ee=v('c_enforcExpiry');
  setField('c_filingUrgency',  gate1Urgency(fe)  || '');
  setField('c_enforcUrgency',  gate1Urgency(ee)  || '');
  const g1=gate1(fe||ee); setField('c_gate1', g1.label||'');

  // Gate 2
  const dc=v('c_debtorClass');
  if (dc) setField('c_gate2', gate2(dc).strategy);

  // Gate 3
  const t=v('c_tier');
  if (t) setField('c_gate3', gate3(t).rule);

  // Gate 4
  const roi=nv('c_gate4roi');
  if (roi) setField('c_gate4dec', gate4(roi).decision);

  // Assignment suggestion
  if (!v('c_assignedTo')) {
    const tmp = { filingUrgency:gate1Urgency(fe), enforcUrgency:gate1Urgency(ee), osb };
    setField('c_assignedTo', calcAssignment(tmp));
  }

  // Show/hide prescription blocks
  onPrescriptionTypeChange();
  updateGateSummary();
}

function updateGateSummary() {
  const row = readCaseForm();
  const g = evaluateAllGates(row);
  const el = document.getElementById('gateSummary');
  if (!el) return;
  const colorMap = { 'PROCEED':'badge-green','DO NOT FILE':'badge-red','DO NOT LITIGATE':'badge-red','HOLD':'badge-gold','REJECT':'badge-red' };
  el.innerHTML = `
    <div class="gate-summary">
      <span class="gate-chip ${g.g1?g.g1.color:'badge-gray'}">G1: ${g.g1?g.g1.label:'—'}</span>
      <span class="gate-chip ${g.g2.proceed===false?'badge-red':g.g2.proceed?'badge-green':'badge-gold'}">G2: ${g.g2.strategy||'—'}</span>
      <span class="gate-chip ${g.g3.proceed===false?'badge-red':g.g3.proceed?'badge-green':'badge-gold'}">G3: ${g.g3.rule||'—'}</span>
      <span class="gate-chip ${g.g4.color}">G4: ${g.g4.decision||'—'}</span>
      <span class="gate-chip ${colorMap[g.recommend]||'badge-gray'}" style="font-weight:700">⇒ ${g.recommend}${g.stopReason?' ('+g.stopReason+')':''}</span>
    </div>`;
}

function onPrescriptionTypeChange() {
  const type=v('c_prescriptionType');
  const fb=document.getElementById('prescriptionFilingBlock');
  const eb=document.getElementById('prescriptionEnforcBlock');
  if(fb) fb.style.display=(!type||type==='Filing')?'':'none';
  if(eb) eb.style.display=(!type||type==='Enforcement')?'':'none';
  if(type==='Filing')      {setField('c_enforcExpiry','');setField('c_enforcUrgency','');}
  if(type==='Enforcement') {setField('c_filingExpiry','');setField('c_filingUrgency','');}
}

function showCaseForm(prefill) {
  APP.editIdx.case=-1;
  CASE_FIELDS.forEach(id=>setField(id,''));
  if (prefill) Object.keys(prefill).forEach(k=>setField('c_'+k, prefill[k]));
  setField('c_assignDate', todayStr());
  document.getElementById('caseFormTitle').textContent='เพิ่มคดีใหม่';
  document.getElementById('caseFormWrap').style.display='block';
  onPrescriptionTypeChange(); updateGateSummary();
  document.getElementById('caseFormWrap').scrollIntoView({behavior:'smooth'});
  setTimeout(()=>document.getElementById('c_debtorName')?.focus(),100);
}
function hideCaseForm() { document.getElementById('caseFormWrap').style.display='none'; }

function readCaseForm() {
  return {
    caseRef:v('c_caseRef'), debtorName:v('c_debtorName'), portfolio:v('c_portfolio'),
    osb:nv('c_osb'), tier:v('c_tier'), debtorClass:v('c_debtorClass'),
    legalStatus:v('c_legalStatus'), assignedTo:v('c_assignedTo'), assignDate:v('c_assignDate'),
    lawyer:v('c_lawyer'), prescriptionType:v('c_prescriptionType'),
    filingExpiry:v('c_filingExpiry'), enforcExpiry:v('c_enforcExpiry'),
    filingUrgency:gate1Urgency(v('c_filingExpiry'))||v('c_filingUrgency'),
    enforcUrgency:gate1Urgency(v('c_enforcExpiry'))||v('c_enforcUrgency'),
    gate1:v('c_gate1'), gate2:v('c_gate2'), gate3:v('c_gate3'),
    gate4roi:nv('c_gate4roi'), gate4dec:v('c_gate4dec'),
    approvalRef:v('c_pamRef'), approvalDate:v('c_pamDate'),
    filingDate:v('c_filingDate'), judgmentDate:v('c_judgmentDate'),
    enforcMethod:v('c_enforcMethod'), enforcDate:v('c_enforcDate'),
    lastAction:v('c_lastAction'), nextAction:v('c_nextAction'),
    nextActionDate:v('c_nextActionDate'), slaStatus:v('c_slaStatus'),
    remarks:v('c_remarks'), reviewedBy:v('c_reviewedBy'), reviewDate:v('c_reviewDate'),
  };
}

function saveCase() {
  const row=readCaseForm();
  if(!row.caseRef)    {toast('กรุณากรอก Case Ref No.','error');return;}
  if(!row.debtorName) {toast('กรุณากรอก Debtor Name','error');return;}
  const isEdit=APP.editIdx.case>=0;
  if(isEdit) {
    APP.caseData[APP.editIdx.case]=row; APP.editIdx.case=-1; toast('แก้ไขคดีสำเร็จ','success');
  } else {
    if(getCaseByRef(row.caseRef)){toast(`Case "${row.caseRef}" มีอยู่แล้ว`,'warn');return;}
    APP.caseData.push(row); toast('เพิ่มคดีสำเร็จ','success');
    autoSeedLinkedSheets(row);
  }
  CASE_FIELDS.forEach(id=>setField(id,'')); hideCaseForm();
  renderCaseTable(); updateCounts();
}

function autoSeedLinkedSheets(row) {
  const t=todayStr(); const notes=[];
  const cat=row.legalStatus==='Enforcement'?'Execution':'Sue';
  const m1=(APP.slaMilestones[cat]||{})[1];
  if(m1) {
    APP.slaData.push({ caseRef:row.caseRef, debtorName:row.debtorName,
      assignedTo:row.assignedTo, slaNo:'1', category:cat,
      milestone:m1.label, triggerDate:t, deadline:addDays(t,m1.days),
      status:'On Track', completionDate:'', lawyer:row.lawyer,
      escalation:'No', remarks:'Auto-seeded' });
    renderSlaTable(); notes.push('⏰ SLA #1');
  }
  const pts=[];
  if(row.filingExpiry)  pts.push({type:'Filing',      expiry:row.filingExpiry});
  if(row.enforcExpiry)  pts.push({type:'Enforcement', expiry:row.enforcExpiry});
  pts.forEach(pt=>{
    const urg=gate1Urgency(pt.expiry);
    const g1l=gate1(pt.expiry).label;
    APP.prescriptData.push({ caseRef:row.caseRef, debtorName:row.debtorName,
      portfolio:row.portfolio, osb:row.osb, assignedTo:row.assignedTo,
      prescriptionType:pt.type, expiryDate:pt.expiry, urgency:urg, gate1:g1l,
      actionRequired:urg==='FAST TRACK'||urg==='EXPIRED'?'ดำเนินการด่วน':'ติดตามปกติ',
      actionOwner:row.lawyer||row.assignedTo,
      actionDeadline:urg==='FAST TRACK'?addDays(t,3):'',
      status:'Pending', remarks:'Auto-seeded' });
  });
  if(pts.length){renderPrescriptTable();notes.push('🚨 Prescription Watch');}
  if(notes.length) setTimeout(()=>toast(`สร้างอัตโนมัติ: ${notes.join(', ')}`,'info'),600);
  updateCounts();
}

function editCase(i) {
  APP.editIdx.case=i;
  const r=APP.caseData[i];
  Object.keys(r).forEach(k=>setField('c_'+k,r[k]));
  document.getElementById('caseFormTitle').textContent='แก้ไขข้อมูลคดี';
  document.getElementById('caseFormWrap').style.display='block';
  onPrescriptionTypeChange(); updateGateSummary();
  document.getElementById('caseFormWrap').scrollIntoView({behavior:'smooth'});
}
async function deleteCase(i) {
  const ok=await showConfirm(`ลบคดี "${APP.caseData[i]?.caseRef}"?`);
  if(!ok) return;
  APP.caseData.splice(i,1);
  if(APP.editIdx.case===i){APP.editIdx.case=-1;hideCaseForm();}
  renderCaseTable(); updateCounts(); toast('ลบสำเร็จ','info');
}

function renderCaseTable() {
  const el=document.getElementById('caseTable');
  document.getElementById('caseCount').textContent=APP.caseData.length;
  const filtered=applySearchFilter(APP.caseData,'case');
  const {slice,total}=paginate(filtered,APP.page.case,APP.pageSize);
  const filterDefs=[
    {key:'legalStatus',label:'Legal Status',values:['Non-legal','Approved to Sue','Filed & Hearing','Judgment','Enforcement','Closed']},
    {key:'assignedTo', label:'Assigned',    values:['Internal (IH)','OA']},
    {key:'tier',       label:'Tier',        values:['Tier 1','Tier 2','Tier 3','Tier 4']},
  ];
  if(!filtered.length){
    el.innerHTML=buildSearchBar('case','🔍 ค้นหาคดี... (Ctrl+F)',filterDefs)+
      `<div class="empty-state"><div class="icon">📁</div><p>${APP.search.case?'ไม่พบข้อมูลที่ค้นหา':'ยังไม่มีข้อมูล'}</p></div>`;
    return;
  }
  const rows=slice.map(r=>{
    const i=APP.caseData.indexOf(r);
    const g=evaluateAllGates(r);
    const fu=gate1Urgency(r.filingExpiry)||r.filingUrgency;
    const urgColor=fu==='EXPIRED'||fu==='FAST TRACK'?'badge-red':fu==='6-12 Months'?'badge-gold':fu==='Normal'?'badge-green':'badge-gray';
    const recColor={'PROCEED':'badge-green','DO NOT FILE':'badge-red','DO NOT LITIGATE':'badge-red','HOLD':'badge-gold','REJECT':'badge-red'}[g.recommend]||'badge-gray';
    const dfe=r.filingExpiry?daysFromNow(r.filingExpiry):null;
    return `<tr>
      <td class="td-mono" style="white-space:nowrap">${r.caseRef}</td>
      <td title="${r.debtorName}" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.debtorName}</td>
      <td><span class="badge badge-gray" style="font-size:10px">${r.portfolio||'—'}</span></td>
      <td style="font-family:var(--mono);text-align:right;font-size:12px">${fmtThb(r.osb)}</td>
      <td><span class="badge badge-gray" style="font-size:10px">${r.tier||'—'}</span></td>
      <td style="font-size:12px">${r.legalStatus||'—'}</td>
      <td>${fu?`<span class="badge ${urgColor}" style="font-size:10px">${fu}</span>`:'—'}${dfe!==null?`<span style="font-family:var(--mono);font-size:10px;color:${dfe<0?'var(--danger)':dfe<180?'var(--gold)':'var(--text-muted)'};margin-left:4px">${dfe}d</span>`:''}</td>
      <td><span class="badge ${recColor}" style="font-size:10px">${g.recommend}</span></td>
      <td style="font-size:11px">${r.assignedTo||'—'}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm" onclick="editCase(${i})" title="แก้ไข">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCase(${i})" title="ลบ">🗑</button>
      </td>
    </tr>`;
  }).join('');
  el.innerHTML=buildSearchBar('case','🔍 ค้นหาคดี... (Ctrl+F)',filterDefs)+
    `<div class="table-wrap"><table>
      <thead><tr><th>Case Ref</th><th>ชื่อลูกหนี้</th><th>Portfolio</th>
      <th style="text-align:right">OSB (THB)</th><th>Tier</th><th>Legal Status</th>
      <th>Urgency / Days</th><th>Gate Rec.</th><th>Assigned</th><th>จัดการ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div><div id="casePagination"></div>`;
  renderPagination('casePagination',total,APP.page.case,APP.pageSize,'setCasePage');
}

// ═══════════════════════════════════════════════════════════════
// SLA TRACKER
// ═══════════════════════════════════════════════════════════════
const SLA_FIELDS=['s_caseRef','s_debtorName','s_assignedTo','s_slaNo','s_category','s_milestone','s_triggerDate','s_deadline','s_status','s_completionDate','s_lawyer','s_escalation','s_remarks'];

function onSlaCaseRefChange() {
  const c=getCaseByRef(v('s_caseRef')); if(!c) return;
  setField('s_debtorName',c.debtorName); setField('s_assignedTo',c.assignedTo); setField('s_lawyer',c.lawyer);
  const cat=c.legalStatus==='Enforcement'?'Execution':'Sue';
  setField('s_category',cat);
  const existing=APP.slaData.filter(s=>String(s.caseRef)===String(c.caseRef));
  const maxNo=existing.reduce((m,s)=>Math.max(m,parseInt(s.slaNo)||0),0);
  setField('s_slaNo',String(maxNo+1));
  if(!v('s_triggerDate')) setField('s_triggerDate',todayStr());
  onSlaCategoryOrNoChange();
}
function onSlaCategoryOrNoChange() {
  const cat=v('s_category'); const no=v('s_slaNo');
  const ms=document.getElementById('s_milestone_sel'); if(!ms) return;
  const mils=APP.slaMilestones[cat]||{};
  ms.innerHTML='<option value="">-- เลือก --</option>';
  Object.entries(mils).forEach(([k,m])=>{ const o=document.createElement('option');o.value=m.label;o.textContent=`SLA ${k}: ${m.label} (${m.days}d)`;ms.appendChild(o); });
  const co=document.createElement('option');co.value='__custom__';co.textContent='＋ กำหนดเอง...';ms.appendChild(co);
  if(no&&mils[no]){ms.value=mils[no].label;setField('s_milestone',mils[no].label);const tr=v('s_triggerDate');if(tr){const dl=addDays(tr,mils[no].days);setField('s_deadline',dl);setField('s_status',calcSlaStatus(dl)||'');}}
}
function onSlaNoChange(){const cat=v('s_category');const no=v('s_slaNo');const m=(APP.slaMilestones[cat]||{})[no];if(m){const ms=document.getElementById('s_milestone_sel');if(ms)ms.value=m.label;setField('s_milestone',m.label);const tr=v('s_triggerDate');if(tr){const dl=addDays(tr,m.days);setField('s_deadline',dl);setField('s_status',calcSlaStatus(dl)||'');}}}
function onSlaMilestoneSelect(){const ms=document.getElementById('s_milestone_sel');const cw=document.getElementById('s_milestone_custom_wrap');const val=ms?ms.value:'';if(val==='__custom__'){if(cw)cw.style.display='';setField('s_milestone','');}else{if(cw)cw.style.display='none';setField('s_milestone',val);const cat=v('s_category');const m=Object.values(APP.slaMilestones[cat]||{}).find(x=>x.label===val);if(m&&v('s_triggerDate')){const dl=addDays(v('s_triggerDate'),m.days);setField('s_deadline',dl);setField('s_status',calcSlaStatus(dl)||'');}}}
function onSlaTriggerChange(){const cat=v('s_category');const no=v('s_slaNo');const m=(APP.slaMilestones[cat]||{})[no];if(m&&v('s_triggerDate')){const dl=addDays(v('s_triggerDate'),m.days);setField('s_deadline',dl);setField('s_status',calcSlaStatus(dl)||'');}}

function openMilestoneManager(){renderMilestoneManager();document.getElementById('milestoneManagerModal').style.display='flex';}
function closeMilestoneManager(){document.getElementById('milestoneManagerModal').style.display='none';}
function renderMilestoneManager(){const body=document.getElementById('milestoneManagerBody');if(!body)return;body.innerHTML=Object.entries(APP.slaMilestones).map(([cat,entries])=>`<div style="margin-bottom:20px"><div class="section-divider">${cat}</div><div style="display:flex;flex-direction:column;gap:6px">${Object.entries(entries).map(([no,m])=>`<div style="display:flex;align-items:center;gap:8px"><span class="badge badge-gray" style="width:36px;justify-content:center;flex-shrink:0">${no}</span><input value="${m.label}" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 8px;font-size:12px" onchange="APP.slaMilestones['${cat}'][${no}].label=this.value"><input type="number" value="${m.days}" style="width:56px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;color:var(--text);padding:5px 8px;font-size:12px;text-align:center" onchange="APP.slaMilestones['${cat}'][${no}].days=Number(this.value)"><span style="font-size:11px;color:var(--text-dim);width:24px">วัน</span><button class="btn btn-danger btn-sm" onclick="deleteMilestone('${cat}',${no})">✕</button></div>`).join('')}</div><button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="addMilestone('${cat}')">＋ เพิ่ม</button></div>`).join('');}
function addMilestone(cat){const max=Math.max(...Object.keys(APP.slaMilestones[cat]).map(Number),0);APP.slaMilestones[cat][max+1]={label:'New Milestone',days:7};renderMilestoneManager();}
function deleteMilestone(cat,no){delete APP.slaMilestones[cat][no];renderMilestoneManager();}

function showSlaForm(pre){APP.editIdx.sla=-1;SLA_FIELDS.forEach(id=>setField(id,''));setField('s_slaNo','1');const ms=document.getElementById('s_milestone_sel');if(ms)ms.innerHTML='<option value="">--</option>';document.getElementById('slaFormWrap').style.display='block';if(pre){setField('s_caseRef',pre);onSlaCaseRefChange();}else{setField('s_slaNo','1');onSlaCategoryOrNoChange();}document.getElementById('slaFormWrap').scrollIntoView({behavior:'smooth'});}
function hideSlaForm(){document.getElementById('slaFormWrap').style.display='none';}
function readSlaForm(){const cw=document.getElementById('s_milestone_custom_wrap');const ci=document.getElementById('s_milestone_custom');const milestone=(cw&&cw.style.display!=='none'&&ci)?ci.value.trim():v('s_milestone');const dl=v('s_deadline');return{caseRef:v('s_caseRef'),debtorName:v('s_debtorName'),assignedTo:v('s_assignedTo'),slaNo:v('s_slaNo'),category:v('s_category'),milestone,triggerDate:v('s_triggerDate'),deadline:dl,status:v('s_completionDate')?'Completed':calcSlaStatus(dl)||v('s_status'),completionDate:v('s_completionDate'),lawyer:v('s_lawyer'),escalation:v('s_escalation'),remarks:v('s_remarks')};}
function saveSla(){const r=readSlaForm();if(!r.caseRef){toast('กรอก Case Ref','error');return;}if(!r.milestone){toast('เลือก Milestone','error');return;}if(APP.editIdx.sla>=0){APP.slaData[APP.editIdx.sla]=r;APP.editIdx.sla=-1;toast('แก้ไข SLA สำเร็จ','success');}else{APP.slaData.push(r);toast('บันทึก SLA สำเร็จ','success');}SLA_FIELDS.forEach(id=>setField(id,''));hideSlaForm();renderSlaTable();updateCounts();}
function editSla(i){APP.editIdx.sla=i;const r=APP.slaData[i];SLA_FIELDS.forEach(id=>setField(id,r[id.replace('s_','')]??''));onSlaCategoryOrNoChange();const ms=document.getElementById('s_milestone_sel');if(ms&&r.milestone)ms.value=r.milestone;document.getElementById('slaFormWrap').style.display='block';document.getElementById('slaFormWrap').scrollIntoView({behavior:'smooth'});}
async function deleteSla(i){if(!await showConfirm('ลบ SLA นี้?'))return;APP.slaData.splice(i,1);if(APP.editIdx.sla===i){APP.editIdx.sla=-1;hideSlaForm();}renderSlaTable();updateCounts();toast('ลบสำเร็จ','info');}

function renderSlaTable(){
  const el=document.getElementById('slaTable');
  document.getElementById('slaCount').textContent=APP.slaData.length;
  const filtered=applySearchFilter(APP.slaData,'sla');
  const {slice,total}=paginate(filtered,APP.page.sla,APP.pageSize);
  const filterDefs=[{key:'category',label:'Category',values:['Sue','Subrogation','Execution']},{key:'status',label:'Status',values:['On Track','At Risk','Breached','Completed']}];
  if(!filtered.length){el.innerHTML=buildSearchBar('sla','🔍 ค้นหา SLA...',filterDefs)+`<div class="empty-state"><div class="icon">⏰</div><p>ยังไม่มีข้อมูล</p></div>`;return;}
  const rows=slice.map(r=>{
    const i=APP.slaData.indexOf(r);
    const d=daysFromNow(r.deadline);
    const st=r.completionDate?'Completed':calcSlaStatus(r.deadline)||r.status;
    const sc=st==='On Track'?'badge-green':st==='Breached'?'badge-red':st==='Completed'?'badge-blue':'badge-gold';
    return `<tr><td class="td-mono">${r.caseRef}</td><td>${r.debtorName||'—'}</td><td style="font-family:var(--mono)">${r.slaNo||'—'}</td><td>${r.category||'—'}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.milestone||'—'}</td><td style="font-family:var(--mono);font-size:11px">${r.deadline||'—'}</td><td><span style="font-family:var(--mono);font-size:11px;color:${d!==null?(d<0?'var(--danger)':d<=7?'var(--gold)':'var(--text-dim)'):'var(--text-dim)'}">${d!==null?d+'d':'—'}</span></td><td>${st?`<span class="badge ${sc}">${st}</span>`:'—'}</td><td class="td-actions"><button class="btn btn-secondary btn-sm" onclick="editSla(${i})">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteSla(${i})">🗑</button></td></tr>`;
  }).join('');
  el.innerHTML=buildSearchBar('sla','🔍 ค้นหา SLA...',filterDefs)+`<div class="table-wrap"><table><thead><tr><th>Case Ref</th><th>Debtor</th><th>SLA#</th><th>Category</th><th>Milestone</th><th>Deadline</th><th>Days</th><th>Status</th><th>จัดการ</th></tr></thead><tbody>${rows}</tbody></table></div><div id="slaPagination"></div>`;
  renderPagination('slaPagination',total,APP.page.sla,APP.pageSize,'setSlaPage');
}

// ═══════════════════════════════════════════════════════════════
// PRESCRIPTION WATCH
// ═══════════════════════════════════════════════════════════════
const PRESC_FIELDS=['p_caseRef','p_debtorName','p_portfolio','p_osb','p_assignedTo','p_prescriptionType','p_expiryDate','p_urgency','p_gate1','p_actionRequired','p_actionOwner','p_actionDeadline','p_status','p_remarks'];
function onPrescCaseRefChange(){const c=getCaseByRef(v('p_caseRef'));if(!c)return;setField('p_debtorName',c.debtorName);setField('p_portfolio',c.portfolio);setField('p_osb',c.osb);setField('p_assignedTo',c.assignedTo);setField('p_actionOwner',c.lawyer||c.assignedTo);const type=v('p_prescriptionType')||c.prescriptionType;if(type){setField('p_prescriptionType',type);const exp=type==='Enforcement'?c.enforcExpiry:c.filingExpiry;if(exp){setField('p_expiryDate',exp);onPrescExpiryChange();}}}
function onPrescTypeChange(){const c=getCaseByRef(v('p_caseRef'));if(!c)return;const exp=v('p_prescriptionType')==='Enforcement'?c.enforcExpiry:c.filingExpiry;if(exp){setField('p_expiryDate',exp);onPrescExpiryChange();}}
function onPrescExpiryChange(){const exp=v('p_expiryDate');const urg=gate1Urgency(exp);const g1=gate1(exp);setField('p_urgency',urg);setField('p_gate1',g1.label);if(urg==='FAST TRACK'||urg==='EXPIRED'){setField('p_actionRequired','ดำเนินการด่วน — ตรวจสอบและเตรียมยื่นฟ้อง');if(!v('p_actionDeadline'))setField('p_actionDeadline',addDays(todayStr(),3));}else if(!v('p_actionRequired'))setField('p_actionRequired','ติดตามตามปกติ');const badge=document.getElementById('p_urgency_badge');if(badge){badge.textContent=urg||'—';badge.className=`badge ${urg==='EXPIRED'||urg==='FAST TRACK'?'badge-red':urg==='6-12 Months'?'badge-gold':urg==='Normal'?'badge-green':'badge-gray'}`;}}
function showPrescForm(pre){APP.editIdx.prescript=-1;PRESC_FIELDS.forEach(id=>setField(id,''));document.getElementById('prescriptFormWrap').style.display='block';if(pre){setField('p_caseRef',pre);onPrescCaseRefChange();}document.getElementById('prescriptFormWrap').scrollIntoView({behavior:'smooth'});}
function hidePrescForm(){document.getElementById('prescriptFormWrap').style.display='none';}
function readPrescForm(){const urg=gate1Urgency(v('p_expiryDate'))||v('p_urgency');return{caseRef:v('p_caseRef'),debtorName:v('p_debtorName'),portfolio:v('p_portfolio'),osb:nv('p_osb'),assignedTo:v('p_assignedTo'),prescriptionType:v('p_prescriptionType'),expiryDate:v('p_expiryDate'),urgency:urg,gate1:gate1(v('p_expiryDate')).label||v('p_gate1'),actionRequired:v('p_actionRequired'),actionOwner:v('p_actionOwner'),actionDeadline:v('p_actionDeadline'),status:v('p_status'),remarks:v('p_remarks')};}
function savePresc(){const r=readPrescForm();if(!r.caseRef){toast('กรอก Case Ref','error');return;}if(APP.editIdx.prescript>=0){APP.prescriptData[APP.editIdx.prescript]=r;APP.editIdx.prescript=-1;toast('แก้ไขสำเร็จ','success');}else{APP.prescriptData.push(r);toast('บันทึกสำเร็จ','success');}PRESC_FIELDS.forEach(id=>setField(id,''));hidePrescForm();renderPrescriptTable();updateCounts();}
function editPresc(i){APP.editIdx.prescript=i;const r=APP.prescriptData[i];PRESC_FIELDS.forEach(id=>setField(id,r[id.replace('p_','')]??''));onPrescExpiryChange();document.getElementById('prescriptFormWrap').style.display='block';document.getElementById('prescriptFormWrap').scrollIntoView({behavior:'smooth'});}
async function deletePresc(i){if(!await showConfirm('ลบรายการ Prescription นี้?'))return;APP.prescriptData.splice(i,1);if(APP.editIdx.prescript===i){APP.editIdx.prescript=-1;hidePrescForm();}renderPrescriptTable();updateCounts();toast('ลบสำเร็จ','info');}
function renderPrescriptTable(){
  const el=document.getElementById('prescriptTable');
  document.getElementById('prescriptCount').textContent=APP.prescriptData.length;
  const filtered=applySearchFilter(APP.prescriptData,'prescript');
  const {slice,total}=paginate(filtered,APP.page.prescript,APP.pageSize);
  const filterDefs=[{key:'prescriptionType',label:'Type',values:['Filing','Enforcement']},{key:'status',label:'Status',values:['Pending','In Progress','Done']}];
  if(!filtered.length){el.innerHTML=buildSearchBar('prescript','🔍 ค้นหา...',filterDefs)+`<div class="empty-state"><div class="icon">🚨</div><p>ยังไม่มีข้อมูล</p></div>`;return;}
  const rows=slice.map(r=>{
    const i=APP.prescriptData.indexOf(r);
    const liveUrg=gate1Urgency(r.expiryDate)||r.urgency;
    const d=r.expiryDate?daysFromNow(r.expiryDate):null;
    const uc=liveUrg==='EXPIRED'||liveUrg==='FAST TRACK'?'badge-red':liveUrg==='6-12 Months'?'badge-gold':'badge-green';
    const g1=gate1(r.expiryDate);
    return `<tr${d!==null&&d<0?' style="opacity:0.7"':''}><td class="td-mono">${r.caseRef}</td><td>${r.debtorName||'—'}</td><td>${r.prescriptionType||'—'}</td><td style="font-family:var(--mono);font-size:11px">${r.expiryDate||'—'}</td><td><span style="font-family:var(--mono);font-size:11px;font-weight:600;color:${d!==null?(d<0?'var(--danger)':d<180?'var(--gold)':'var(--text-dim)'):'var(--text-dim)'}">${d!==null?d+'d':'—'}</span></td><td>${liveUrg?`<span class="badge ${uc}">${liveUrg}</span>`:'—'}</td><td style="font-size:11px">${g1.label||r.gate1||'—'}</td><td>${r.status||'—'}</td><td class="td-actions"><button class="btn btn-secondary btn-sm" onclick="editPresc(${i})">✏️</button><button class="btn btn-danger btn-sm" onclick="deletePresc(${i})">🗑</button></td></tr>`;
  }).join('');
  el.innerHTML=buildSearchBar('prescript','🔍 ค้นหา...',filterDefs)+`<div class="table-wrap"><table><thead><tr><th>Case Ref</th><th>Debtor</th><th>Type</th><th>Expiry</th><th>Days Left</th><th>Urgency</th><th>Gate 1</th><th>Status</th><th>จัดการ</th></tr></thead><tbody>${rows}</tbody></table></div><div id="prescriptPagination"></div>`;
  renderPagination('prescriptPagination',total,APP.page.prescript,APP.pageSize,'setPrescriptPage');
}

// ═══════════════════════════════════════════════════════════════
// REIMBURSEMENT
// ═══════════════════════════════════════════════════════════════
const REIMB_FIELDS=['r_reqNo','r_lawyer','r_caseRef','r_debtorName','r_expenseType','r_amount','r_payStatus','r_payDate','r_advance','r_advanceDate','r_receipt','r_reimbRef','r_approvedBy','r_remarks'];
function onReimbCaseRefChange(){const c=getCaseByRef(v('r_caseRef'));if(!c)return;setField('r_debtorName',c.debtorName);setField('r_lawyer',c.lawyer);onReimbWorkType(c.legalStatus==='Enforcement'?'Enforcement':'Filing');if(!v('r_reqNo'))setField('r_reqNo',nextReqNo());}
function onReimbWorkType(wt){const sel=document.getElementById('r_expenseType');if(!sel)return;const presets=APP.expensePresets[wt]||APP.expensePresets.General;sel.innerHTML='<option value="">-- เลือก --</option>';presets.forEach(p=>{const o=document.createElement('option');o.value=p.label;o.textContent=p.label+(p.amount?` (~฿${p.amount.toLocaleString()})`:' (กรอกเอง)');sel.appendChild(o);});const co=document.createElement('option');co.value='__custom__';co.textContent='＋ กรอกเอง';sel.appendChild(co);const cw=document.getElementById('r_expenseCustomWrap');if(cw)cw.style.display='none';setField('r_amount','');}
function onReimbExpenseSelect(){const sel=document.getElementById('r_expenseType');const val=sel?sel.value:'';const cw=document.getElementById('r_expenseCustomWrap');if(val==='__custom__'){if(cw)cw.style.display='';return;}if(cw)cw.style.display='none';const presets=Object.values(APP.expensePresets).flat();const p=presets.find(x=>x.label===val);if(p&&p.amount)setField('r_amount',p.amount);}
function showReimbForm(pre){APP.editIdx.reimburse=-1;REIMB_FIELDS.forEach(id=>setField(id,''));document.getElementById('reimburseFormWrap').style.display='block';setField('r_reqNo',nextReqNo());if(pre){setField('r_caseRef',pre);onReimbCaseRefChange();}else onReimbWorkType('Filing');document.getElementById('reimburseFormWrap').scrollIntoView({behavior:'smooth'});}
function hideReimbForm(){document.getElementById('reimburseFormWrap').style.display='none';}
function readReimbForm(){const cw=document.getElementById('r_expenseCustomWrap');const ci=document.getElementById('r_expenseCustom');const expenseType=(cw&&cw.style.display!=='none'&&ci)?ci.value.trim():v('r_expenseType');return{reqNo:v('r_reqNo'),lawyer:v('r_lawyer'),caseRef:v('r_caseRef'),debtorName:v('r_debtorName'),expenseType,amount:nv('r_amount'),payStatus:v('r_payStatus'),payDate:v('r_payDate'),advance:nv('r_advance'),advanceDate:v('r_advanceDate'),receipt:v('r_receipt'),reimbRef:v('r_reimbRef'),approvedBy:v('r_approvedBy'),remarks:v('r_remarks')};}
function saveReimb(){const r=readReimbForm();if(!r.reqNo){toast('กรอก Request No.','error');return;}if(!r.expenseType){toast('เลือกประเภทค่าใช้จ่าย','error');return;}if(APP.editIdx.reimburse>=0){APP.reimburseData[APP.editIdx.reimburse]=r;APP.editIdx.reimburse=-1;toast('แก้ไขสำเร็จ','success');}else{APP.reimburseData.push(r);toast('บันทึกสำเร็จ','success');}REIMB_FIELDS.forEach(id=>setField(id,''));hideReimbForm();renderReimburseTable();updateCounts();}
function editReimb(i){APP.editIdx.reimburse=i;const r=APP.reimburseData[i];REIMB_FIELDS.forEach(id=>setField(id,r[id.replace('r_','')]??''));onReimbWorkType('General');const sel=document.getElementById('r_expenseType');if(sel)sel.value=r.expenseType;document.getElementById('reimburseFormWrap').style.display='block';document.getElementById('reimburseFormWrap').scrollIntoView({behavior:'smooth'});}
async function deleteReimb(i){if(!await showConfirm('ลบรายการเบิกนี้?'))return;APP.reimburseData.splice(i,1);if(APP.editIdx.reimburse===i){APP.editIdx.reimburse=-1;hideReimbForm();}renderReimburseTable();updateCounts();toast('ลบสำเร็จ','info');}
function renderReimburseTable(){
  const el=document.getElementById('reimburseTable');
  document.getElementById('reimburseCount').textContent=APP.reimburseData.length;
  const filtered=applySearchFilter(APP.reimburseData,'reimburse');
  const {slice,total}=paginate(filtered,APP.page.reimburse,APP.pageSize);
  const totalAmt=filtered.reduce((s,r)=>s+(Number(r.amount)||0),0);
  const filterDefs=[{key:'payStatus',label:'Pay Status',values:['Pending','Paid','Overdue','Cancelled']},{key:'receipt',label:'Receipt',values:['Yes','No']}];
  if(!filtered.length){el.innerHTML=buildSearchBar('reimburse','🔍 ค้นหา...',filterDefs)+`<div class="empty-state"><div class="icon">💰</div><p>ยังไม่มีข้อมูล</p></div>`;return;}
  const rows=slice.map(r=>{const i=APP.reimburseData.indexOf(r);return `<tr><td class="td-mono">${r.reqNo}</td><td class="td-mono" style="font-size:11px">${r.caseRef||'—'}</td><td>${r.debtorName||'—'}</td><td>${r.expenseType||'—'}</td><td style="font-family:var(--mono);text-align:right">${fmtThb(r.amount)}</td><td>${r.payStatus?`<span class="badge ${r.payStatus==='Paid'?'badge-green':r.payStatus==='Overdue'?'badge-red':'badge-gold'}">${r.payStatus}</span>`:'—'}</td><td>${r.receipt?`<span class="badge ${r.receipt==='Yes'?'badge-green':'badge-gray'}">${r.receipt}</span>`:'—'}</td><td class="td-actions"><button class="btn btn-secondary btn-sm" onclick="editReimb(${i})">✏️</button><button class="btn btn-danger btn-sm" onclick="deleteReimb(${i})">🗑</button></td></tr>`;}).join('');
  el.innerHTML=buildSearchBar('reimburse','🔍 ค้นหา...',filterDefs)+`<div class="table-wrap"><table><thead><tr><th>REQ No.</th><th>Case Ref</th><th>Debtor</th><th>Expense Type</th><th style="text-align:right">Amount (THB)</th><th>Pay Status</th><th>Receipt</th><th>จัดการ</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="4" style="text-align:right;font-size:11px;font-weight:600;color:var(--text-dim);padding:8px 12px">รวม ${filtered.length} รายการ</td><td style="font-family:var(--mono);font-weight:700;color:var(--gold);padding:8px 12px;text-align:right">${fmtThb(totalAmt)}</td><td colspan="3"></td></tr></tfoot></table></div><div id="reimbursePagination"></div>`;
  renderPagination('reimbursePagination',total,APP.page.reimburse,APP.pageSize,'setReimbursePage');
}
