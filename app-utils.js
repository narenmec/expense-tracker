/** Shared helpers used across pages */

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function setStatusBox(el, message, type) {
  if (!el) return;
  el.textContent = message;
  el.className = "status-box" + (type ? " " + type : "");
}

function initConnectionBadge(badgeId) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  setConnectionBadge(badge, "connecting");
  monitorConnection((state) => setConnectionBadge(badge, state));
}

function countExpenseRecords(val) {
  if (!val) return 0;
  if (Array.isArray(val)) return val.length;
  return Object.keys(val).length;
}

function sumFromRecords(val, typeMatch) {
  if (!val) return 0;
  const rows = Array.isArray(val) ? val : Object.values(val);
  return rows.reduce((sum, row) => {
    const type = (row.Income_Expense || row.type || row.Type || "").toLowerCase();
    const amount = Number(row.Amount || row.amount || row.INR || 0) || 0;
    if (typeMatch(type)) return sum + amount;
    return sum;
  }, 0);
}
