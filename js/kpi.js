// ── Dashboard / KPI Visualization ──────────────────────────────────
// Called whenever user switches to the dashboard page.

function renderDashboard() {
  const { caseData, slaData, prescriptData, reimburseData } = APP;

  // ── Top stat counters ─────────────────────────────────────────────
  document.getElementById('statCase').textContent      = caseData.length;
  document.getElementById('statSla').textContent       = slaData.length;
  document.getElementById('statPrescript').textContent = prescriptData.length;
  document.getElementById('statReimburse').textContent = reimburseData.length;

  renderSlaStatusDonut();
  renderLegalStatusBar();
  renderUrgencyBreakdown();
  renderReimbursePayStatus();
  renderOsbByTier();
}

// ── Colour palette helpers ────────────────────────────────────────
const C = {
  accent:  '#2d7aff',
  green:   '#22c55e',
  danger:  '#ff3b5c',
  gold:    '#ffc840',
  teal:    '#00d4aa',
  purple:  '#a855f7',
  orange:  '#ff6b35',
  dim:     '#7a8899',
  border:  '#2a3040',
  surface2:'#1e2330',
};

function hex2rgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ── Generic: render an SVG donut chart ───────────────────────────
// segments: [{label, value, color}]
function svgDonut(segments, cx=80, cy=80, r=60, thickness=22) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (!total) return `<text x="${cx}" y="${cy+5}" text-anchor="middle" class="chart-bar-label">ไม่มีข้อมูล</text>`;

  let svgPaths = '';
  let angle = -Math.PI / 2;

  for (const seg of segments) {
    const frac = seg.value / total;
    const sweep = frac * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;

    const or = r;
    const ir = r - thickness;
    const ox1 = cx + or * Math.cos(angle - sweep);
    const oy1 = cy + or * Math.sin(angle - sweep);
    const ox2 = cx + or * Math.cos(angle);
    const oy2 = cy + or * Math.sin(angle);
    const ix1 = cx + ir * Math.cos(angle);
    const iy1 = cy + ir * Math.sin(angle);
    const ix2 = cx + ir * Math.cos(angle - sweep);
    const iy2 = cy + ir * Math.sin(angle - sweep);

    svgPaths += `<path d="M${ox1},${oy1} A${or},${or} 0 ${large},1 ${ox2},${oy2}
      L${ix1},${iy1} A${ir},${ir} 0 ${large},0 ${ix2},${iy2} Z"
      fill="${seg.color}" opacity="0.9"/>`;
  }

  return svgPaths;
}

// ── Chart 1: SLA Status donut ─────────────────────────────────────
function renderSlaStatusDonut() {
  const el = document.getElementById('chartSlaStatus');
  if (!el) return;
  const data = APP.slaData;
  const counts = { 'On Track':0, 'Breached':0, 'At Risk':0, 'Completed':0, 'อื่นๆ':0 };
  data.forEach(r => {
    if (counts[r.status] !== undefined) counts[r.status]++;
    else counts['อื่นๆ']++;
  });

  const palette = { 'On Track': C.green, 'Breached': C.danger, 'At Risk': C.gold, 'Completed': C.accent, 'อื่นๆ': C.dim };
  const segments = Object.entries(counts)
    .filter(([,v]) => v > 0)
    .map(([label, value]) => ({ label, value, color: palette[label] }));

  const total = data.length;
  const cx = 80, cy = 80;

  const legendHtml = segments.map(s => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${s.color}"></div>
      <span>${s.label}</span>
      <span style="margin-left:auto;font-family:var(--mono);color:var(--text)">${s.value}</span>
    </div>`).join('');

  el.innerHTML = `
    <div class="donut-wrap">
      <svg width="160" height="160" style="flex-shrink:0">
        ${svgDonut(segments, cx, cy, 62, 22)}
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" style="font-size:22px;font-weight:700;fill:var(--text);font-family:'IBM Plex Mono',monospace">${total}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle" style="font-size:10px;fill:var(--text-dim);font-family:'IBM Plex Sans Thai',sans-serif">รายการ</text>
      </svg>
      <div class="donut-legend" style="flex:1">${legendHtml || '<div class="legend-item">ไม่มีข้อมูล</div>'}</div>
    </div>`;
}

// ── Chart 2: Legal Status horizontal bar chart ────────────────────
function renderLegalStatusBar() {
  const el = document.getElementById('chartLegalStatus');
  if (!el) return;

  const statusList = ['Non-legal','Approved to Sue','Filed & Hearing','Judgment','Enforcement'];
  const colorList  = [C.dim, C.gold, C.accent, C.teal, C.green];
  const counts = {};
  statusList.forEach(s => counts[s] = 0);
  APP.caseData.forEach(r => {
    if (counts[r.legalStatus] !== undefined) counts[r.legalStatus]++;
  });

  const max = Math.max(...Object.values(counts), 1);
  const W = 260, barH = 14, gap = 28, padL = 110, padT = 16;
  const svgH = padT + statusList.length * gap + 10;

  const bars = statusList.map((s, i) => {
    const val = counts[s];
    const bw  = Math.max((val / max) * W, val > 0 ? 4 : 0);
    const y   = padT + i * gap;
    return `
      <text x="${padL - 8}" y="${y + barH/2 + 4}" text-anchor="end" class="chart-bar-label">${s}</text>
      <rect x="${padL}" y="${y}" width="${bw}" height="${barH}" rx="3" fill="${colorList[i]}" opacity="0.85"/>
      ${val > 0 ? `<text x="${padL + bw + 5}" y="${y + barH/2 + 4}" class="chart-value">${val}</text>` : ''}`;
  }).join('');

  el.innerHTML = `<svg width="100%" viewBox="0 0 ${padL + W + 40} ${svgH}" preserveAspectRatio="xMidYMid meet">
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${svgH - 6}" class="chart-axis"/>
    ${bars}
  </svg>`;
}

// ── Chart 3: Urgency breakdown (Prescription Watch) ───────────────
function renderUrgencyBreakdown() {
  const el = document.getElementById('chartUrgency');
  if (!el) return;

  const bands = ['EXPIRED','FAST TRACK','6-12 Months','Normal'];
  const colors = [C.danger, C.orange, C.gold, C.green];
  const counts = {}; bands.forEach(b => counts[b] = 0);
  APP.prescriptData.forEach(r => {
    if (counts[r.urgency] !== undefined) counts[r.urgency]++;
    else counts['Normal']++;
  });
  const total = APP.prescriptData.length || 1;

  el.innerHTML = bands.map((b, i) => {
    const val  = counts[b];
    const pct  = Math.round((val / total) * 100);
    return `
      <div class="urgency-row">
        <div style="width:90px;font-size:11px;color:${colors[i]};font-weight:600">${b}</div>
        <div class="urgency-bar-wrap">
          <div class="urgency-bar" style="width:${pct}%;background:${colors[i]}"></div>
        </div>
        <div style="width:28px;text-align:right;font-family:var(--mono);font-size:11px;color:var(--text)">${val}</div>
      </div>`;
  }).join('');
}

// ── Chart 4: Reimbursement payment status donut ───────────────────
function renderReimbursePayStatus() {
  const el = document.getElementById('chartPayStatus');
  if (!el) return;

  const statuses = { 'Paid': C.green, 'Pending': C.gold, 'Overdue': C.danger, 'Cancelled': C.dim };
  const counts = {}; Object.keys(statuses).forEach(s => counts[s] = 0);
  APP.reimburseData.forEach(r => {
    if (counts[r.payStatus] !== undefined) counts[r.payStatus]++;
  });

  const totalAmt = APP.reimburseData.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const segments = Object.entries(counts)
    .filter(([,v]) => v > 0)
    .map(([label, value]) => ({ label, value, color: statuses[label] }));

  const legendHtml = Object.entries(counts).map(([label, val]) => val > 0 ? `
    <div class="legend-item">
      <div class="legend-dot" style="background:${statuses[label]}"></div>
      <span>${label}</span>
      <span style="margin-left:auto;font-family:var(--mono);color:var(--text)">${val}</span>
    </div>` : '').join('');

  el.innerHTML = `
    <div class="donut-wrap">
      <svg width="160" height="160" style="flex-shrink:0">
        ${svgDonut(segments, 80, 80, 62, 22)}
        <text x="80" y="74" text-anchor="middle" style="font-size:9px;fill:var(--text-dim);font-family:'IBM Plex Sans Thai',sans-serif">ยอดรวม</text>
        <text x="80" y="90" text-anchor="middle" style="font-size:11px;font-weight:700;fill:var(--text);font-family:'IBM Plex Mono',monospace">${(totalAmt/1000).toFixed(0)}K</text>
      </svg>
      <div class="donut-legend" style="flex:1">${legendHtml || '<div class="legend-item">ไม่มีข้อมูล</div>'}</div>
    </div>`;
}

// ── Chart 5: OSB by Tier vertical bar chart ───────────────────────
function renderOsbByTier() {
  const el = document.getElementById('chartOsbTier');
  if (!el) return;

  const tiers  = ['Tier 1','Tier 2','Tier 3','Tier 4'];
  const colors = [C.teal, C.accent, C.gold, C.danger];
  const sums   = {}; tiers.forEach(t => sums[t] = 0);
  APP.caseData.forEach(r => {
    if (sums[r.tier] !== undefined) sums[r.tier] += Number(r.osb) || 0;
  });

  const max = Math.max(...Object.values(sums), 1);
  const W = 44, gap = 16, H = 100, padB = 24, padL = 10;
  const svgW = padL + tiers.length * (W + gap);

  const bars = tiers.map((t, i) => {
    const val  = sums[t];
    const bh   = Math.max((val / max) * H, val > 0 ? 4 : 0);
    const x    = padL + i * (W + gap);
    const y    = H - bh;
    return `
      <rect x="${x}" y="${y}" width="${W}" height="${bh}" rx="4"
        fill="${colors[i]}" opacity="0.85"/>
      <text x="${x + W/2}" y="${H + 16}" text-anchor="middle" class="chart-bar-label">${t}</text>
      ${val > 0 ? `<text x="${x + W/2}" y="${y - 4}" text-anchor="middle" class="chart-value" style="font-size:10px">${(val/1000000).toFixed(1)}M</text>` : ''}`;
  }).join('');

  el.innerHTML = `<svg width="100%" viewBox="0 0 ${svgW} ${H + padB + 10}" preserveAspectRatio="xMidYMid meet">
    <line x1="${padL - 4}" y1="0" x2="${padL - 4}" y2="${H}" class="chart-axis"/>
    <line x1="${padL - 4}" y1="${H}" x2="${svgW}" y2="${H}" class="chart-axis"/>
    ${bars}
  </svg>`;
}
