// ═══════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════
window.APP = {
  workbook:      null,          // Litigation_Weekly_Monitor.xlsx
  caseData:      [],
  slaData:       [],
  prescriptData: [],
  reimburseData: [],
  editIdx: { case: -1, sla: -1, prescript: -1, reimburse: -1 },
  page:     { case: 1, sla: 1, prescript: 1, reimburse: 1 },
  pageSize: 50,
  search:   { case: '', sla: '', prescript: '', reimburse: '' },
  filter:   { case: {}, sla: {}, prescript: {}, reimburse: {} },
};

// ── Form I/O ─────────────────────────────────────────────────────
function v(id)  { const el=document.getElementById(id); return el?el.value.trim():''; }
function nv(id) { const el=document.getElementById(id); return el&&el.value!==''?Number(el.value):''; }
function setField(id,val) { const el=document.getElementById(id); if(el&&val!=null) el.value=val; }

// ── Date helpers ─────────────────────────────────────────────────
function fmtDate(val) {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString().slice(0,10);
  const s=String(val);
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  return s;
}
function todayStr() { return new Date().toISOString().slice(0,10); }
function daysFromNow(dateStr) {
  if (!dateStr) return null;
  const d=new Date(dateStr); d.setHours(0,0,0,0);
  const t=new Date(); t.setHours(0,0,0,0);
  return Math.round((d-t)/86400000);
}
function fmtThb(n) {
  if (n===''||n==null||isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
}

// ── Toast ─────────────────────────────────────────────────────────
function toast(msg, type='info', dur=3800) {
  const icons={success:'✓',error:'✕',info:'ℹ',warn:'⚠'};
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span>${icons[type]||'ℹ'}</span><span style="flex:1">${msg}</span>
    <button onclick="this.parentNode.remove()" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 4px;font-size:14px">✕</button>`;
  const c=document.getElementById('toast-container');
  c.appendChild(el);
  while(c.children.length>5) c.firstChild.remove();
  setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(20px)';el.style.transition='all 0.3s';},dur-350);
  setTimeout(()=>el.remove(),dur);
}

// ── Confirm modal ─────────────────────────────────────────────────
let _cResolve=null;
function showConfirm(msg,danger=true) {
  return new Promise(r=>{
    _cResolve=r;
    const m=document.getElementById('confirmModal');
    if(!m){r(window.confirm(msg));return;}
    document.getElementById('confirmMsg').textContent=msg;
    const ok=document.getElementById('confirmOk');
    ok.className=`btn btn-sm ${danger?'btn-danger':'btn-primary'}`;
    ok.textContent=danger?'🗑 ลบ':'✓ ยืนยัน';
    m.style.display='flex';
  });
}
function _confirmResult(yes) {
  const m=document.getElementById('confirmModal');
  if(m) m.style.display='none';
  if(_cResolve){_cResolve(yes);_cResolve=null;}
}

// ── Navigation ────────────────────────────────────────────────────
function switchPage(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  const nav=document.querySelector(`[data-page="${name}"]`);
  if(nav) nav.classList.add('active');
  if(name==='dashboard') renderDashboard();
}

// ── Counts + datalist ─────────────────────────────────────────────
function updateCounts() {
  document.getElementById('cntCase').textContent      = APP.caseData.length;
  document.getElementById('cntSla').textContent       = APP.slaData.length;
  document.getElementById('cntPrescript').textContent = APP.prescriptData.length;
  document.getElementById('cntReimburse').textContent = APP.reimburseData.length;
  const refs=APP.caseData.map(c=>c.caseRef);
  ['s_caseRef_list','p_caseRef_list','r_caseRef_list'].forEach(id=>{
    const dl=document.getElementById(id);
    if(dl) dl.innerHTML=refs.map(r=>`<option value="${r}">`).join('');
  });
}

// ── Search + filter + pagination ──────────────────────────────────
function applySearchFilter(dataset,pageKey) {
  let data=dataset;
  const q=(APP.search[pageKey]||'').toLowerCase().trim();
  if(q) data=data.filter(r=>Object.values(r).some(val=>String(val).toLowerCase().includes(q)));
  const filters=APP.filter[pageKey]||{};
  Object.entries(filters).forEach(([k,val])=>{ if(val) data=data.filter(r=>r[k]===val); });
  return data;
}
function paginate(dataset,page,size) {
  return {slice:dataset.slice((page-1)*size, page*size), total:dataset.length};
}
function renderPagination(cid,total,cur,size,fn) {
  const el=document.getElementById(cid); if(!el) return;
  const pages=Math.ceil(total/size);
  if(pages<=1){el.innerHTML='';return;}
  const s=Math.max(1,cur-2), e=Math.min(pages,cur+2);
  let h=`<div class="pagination">`;
  h+=`<button class="pg-btn" ${cur===1?'disabled':''} onclick="${fn}(${cur-1})">‹</button>`;
  if(s>1){h+=`<button class="pg-btn" onclick="${fn}(1)">1</button>`;if(s>2) h+=`<span class="pg-ellipsis">…</span>`;}
  for(let p=s;p<=e;p++) h+=`<button class="pg-btn${p===cur?' active':''}" onclick="${fn}(${p})">${p}</button>`;
  if(e<pages){if(e<pages-1) h+=`<span class="pg-ellipsis">…</span>`;h+=`<button class="pg-btn" onclick="${fn}(${pages})">${pages}</button>`;}
  h+=`<button class="pg-btn" ${cur===pages?'disabled':''} onclick="${fn}(${cur+1})">›</button>`;
  h+=`<span class="pg-info">${(cur-1)*size+1}–${Math.min(cur*size,total)} / ${total}</span></div>`;
  el.innerHTML=h;
}
function buildSearchBar(pk,ph,filterDefs=[]) {
  const q=APP.search[pk]||'';
  const rfn={case:'renderCaseTable',sla:'renderSlaTable',prescript:'renderPrescriptTable',reimburse:'renderReimburseTable'}[pk]||'';
  const selects=filterDefs.map(f=>{
    const cur=(APP.filter[pk]||{})[f.key]||'';
    return `<select class="filter-select" onchange="APP.filter['${pk}']['${f.key}']=this.value;APP.page['${pk}']=1;${rfn}()">
      <option value="">${f.label}</option>
      ${f.values.map(fv=>`<option value="${fv}"${cur===fv?' selected':''}>${fv}</option>`).join('')}
    </select>`;
  }).join('');
  return `<div class="search-bar-wrap">
    <div class="search-input-wrap">
      <span class="search-icon">🔍</span>
      <input class="search-input" placeholder="${ph}" value="${q}"
        oninput="APP.search['${pk}']=this.value;APP.page['${pk}']=1;${rfn}()">
      ${q?`<button class="search-clear" onclick="APP.search['${pk}']='';APP.page['${pk}']=1;this.closest('.search-bar-wrap').querySelector('.search-input').value='';${rfn}()">✕</button>`:''}
    </div>${selects}
  </div>`;
}

function setCasePage(p)      { APP.page.case=p;      renderCaseTable(); }
function setSlaPage(p)       { APP.page.sla=p;       renderSlaTable(); }
function setPrescriptPage(p) { APP.page.prescript=p; renderPrescriptTable(); }
function setReimbursePage(p) { APP.page.reimburse=p; renderReimburseTable(); }

// ── Keyboard shortcuts ────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(e.key==='Escape') {
    ['caseFormWrap','slaFormWrap','prescriptFormWrap','reimburseFormWrap','lawstepFormWrap'].forEach(id=>{
      const el=document.getElementById(id);
      if(el&&el.style.display!=='none') el.style.display='none';
    });
    _confirmResult(false);
    const mm=document.getElementById('milestoneManagerModal');
    if(mm&&mm.style.display!=='none') closeMilestoneManager();
  }
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();if(APP.workbook) exportExcel();else toast('โหลดไฟล์ Asset Management ก่อน','warn');}
  if((e.ctrlKey||e.metaKey)&&e.key==='f'){
    const si=document.querySelector('.page.active .search-input');
    if(si){e.preventDefault();si.focus();si.select();}
  }
});

// ── Skeleton ─────────────────────────────────────────────────────
function skeletonTable(cols=7,rows=5) {
  const hc=Array(cols).fill('<th><div class="skel"></div></th>').join('');
  const dc=Array(cols).fill('<td><div class="skel" style="height:12px;border-radius:4px"></div></td>').join('');
  return `<div class="table-wrap"><table><thead><tr>${hc}</tr></thead><tbody>${Array(rows).fill(`<tr>${dc}</tr>`).join('')}</tbody></table></div>`;
}

// ── Drag-drop ─────────────────────────────────────────────────────
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',e=>{
  e.preventDefault();
  const f=e.dataTransfer.files[0];
  if(f&&(f.name.endsWith('.xlsx')||f.name.endsWith('.xls'))) loadCases({target:{files:[f]}});
});
