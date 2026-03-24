// ── forecast.js ─────────────────────────────────────────────────────
// Placeholder module for forecasting and trend analysis features.
// Add your implementations here and call them from kpi.js or main.js.

/**
 * Example: forecast SLA breach rate over next N weeks
 * based on current breach % in slaData.
 *
 * @param {number} weeks - number of weeks to project
 * @returns {Array<{week: number, projected: number}>}
 */
function forecastSlaBreachRate(weeks = 4) {
  const { slaData } = APP;
  if (!slaData.length) return [];

  const breached = slaData.filter(r => r.status === 'Breached').length;
  const rate     = breached / slaData.length; // current breach rate

  return Array.from({ length: weeks }, (_, i) => ({
    week:      i + 1,
    projected: Math.round(slaData.length * rate * (1 + i * 0.05)), // simple linear growth
  }));
}

/**
 * Example: estimate prescriptions expiring in next N days
 *
 * @param {number} days
 * @returns {Array} cases expiring within the window
 */
function prescriptionsDueIn(days = 30) {
  const { prescriptData } = APP;
  const now     = new Date();
  const cutoff  = new Date(now.getTime() + days * 86400000);

  return prescriptData.filter(r => {
    if (!r.expiryDate) return false;
    const exp = new Date(r.expiryDate);
    return exp >= now && exp <= cutoff;
  });
}

/**
 * Example: monthly reimbursement trend from loaded data
 *
 * @returns {Object} month -> total amount
 */
function reimburseMonthlyTrend() {
  const trend = {};
  APP.reimburseData.forEach(r => {
    const d = r.payDate || r.advanceDate;
    if (!d) return;
    const month = d.slice(0, 7); // YYYY-MM
    trend[month] = (trend[month] || 0) + (Number(r.amount) || 0);
  });
  return trend;
}
