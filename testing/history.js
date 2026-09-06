/* ============================================================
   ESTIMATE HISTORY — history.js
   chemcalc.co | Think & Engage LLC
   ============================================================ */

var _allEstimates = [];
var _pendingDeleteId = null;

var STATUS_LABELS = {
  draft:       { label: 'Draft',       cls: 'status-draft' },
  sent:        { label: 'Sent',        cls: 'status-sent' },
  approved:    { label: 'Approved',    cls: 'status-approved' },
  in_progress: { label: 'In Progress', cls: 'status-inprogress' },
  completed:   { label: 'Completed',   cls: 'status-completed' },
  invoiced:    { label: 'Invoiced',    cls: 'status-invoiced' },
  declined:    { label: 'Declined',    cls: 'status-declined' }
};

function fmtMoney(v) {
  var n = parseFloat(v) || 0;
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDate(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
}

/* ── Called by auth.js after session loads ─────────────────── */
function setUserTier(tier) {
  var authGate  = document.getElementById('histAuthGate');
  var proGate   = document.getElementById('histProGate');
  var content   = document.getElementById('histContent');

  if (!window.isLoggedIn || !window.isLoggedIn()) {
    authGate.classList.remove('d-none');
    return;
  }
  authGate.classList.add('d-none');

  if (tier !== 'pro') {
    proGate.classList.remove('d-none');
    return;
  }
  proGate.classList.add('d-none');
  content.classList.remove('d-none');
  loadHistory();
}

/* ── Load estimates from Supabase ──────────────────────────── */
async function loadHistory() {
  document.getElementById('histLoading').classList.remove('d-none');
  document.getElementById('histEmpty').classList.add('d-none');

  var estimates = [];
  if (typeof loadEstimatesFromSupabase === 'function') {
    estimates = await loadEstimatesFromSupabase();
  }

  _allEstimates = estimates;
  document.getElementById('histLoading').classList.add('d-none');
  renderStats(estimates);
  renderTable(estimates);

  // Wire up search and filter
  document.getElementById('histSearch').addEventListener('input', applyFilters);
  document.getElementById('histStatusFilter').addEventListener('change', applyFilters);
}

/* ── Stats bar ─────────────────────────────────────────────── */
function renderStats(rows) {
  document.getElementById('statTotal').textContent = rows.length;
  var totalVal = rows.reduce(function(s, r){ return s + (parseFloat(r.grand_total) || 0); }, 0);
  document.getElementById('statValue').textContent = fmtMoney(totalVal);
  document.getElementById('statApproved').textContent = rows.filter(function(r){ return r.status === 'approved'; }).length;
  document.getElementById('statDraft').textContent = rows.filter(function(r){ return r.status === 'draft' || !r.status; }).length;
}

/* ── Render table rows ─────────────────────────────────────── */
function renderTable(rows) {
  var tbody = document.getElementById('histTableBody');
  var empty = document.getElementById('histEmpty');
  tbody.innerHTML = '';

  if (!rows || rows.length === 0) {
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  rows.forEach(function(est) {
    var clientName = ((est.customer_first || '') + ' ' + (est.customer_last || '')).trim() || '—';
    var vessel = [est.boat_make, est.boat_model].filter(Boolean).join(' ') || '—';
    var status = est.status || 'draft';
    var statusInfo = STATUS_LABELS[status] || { label: status, cls: 'status-draft' };

    var tr = document.createElement('tr');
    tr.dataset.id = est.id;
    tr.innerHTML =
      '<td class="col-est-num"><a href="estimate.html?draft=' + est.id + '" class="hist-est-link">' + (est.estimate_number || '—') + '</a></td>' +
      '<td class="col-client">' + _esc(clientName) + '</td>' +
      '<td class="col-vessel">' + _esc(vessel) + '</td>' +
      '<td class="col-total">' + fmtMoney(est.grand_total) + '</td>' +
      '<td class="col-date">' + fmtDate(est.created_at) + '</td>' +
      '<td class="col-status">' +
        '<select class="hist-status-select ' + statusInfo.cls + '" onchange="updateStatus(\'' + est.id + '\', this)">' +
          _statusOptions(status) +
        '</select>' +
      '</td>' +
      '<td class="col-actions">' +
        '<a href="estimate.html?draft=' + est.id + '" class="hist-action-btn hist-open" title="Open">Open</a>' +
        '<button class="hist-action-btn hist-dup" onclick="duplicateEstimate(\'' + est.id + '\')" title="Duplicate">Copy</button>' +
        '<button class="hist-action-btn hist-del" onclick="confirmDelete(\'' + est.id + '\', \'' + _esc(est.estimate_number || 'this estimate') + '\')" title="Delete">Delete</button>' +
      '</td>';
    tbody.appendChild(tr);
  });
}

function _statusOptions(current) {
  return Object.keys(STATUS_LABELS).map(function(k) {
    var s = STATUS_LABELS[k];
    return '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + s.label + '</option>';
  }).join('');
}

function _esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Search + filter ───────────────────────────────────────── */
function applyFilters() {
  var q = (document.getElementById('histSearch').value || '').toLowerCase().trim();
  var statusFilter = document.getElementById('histStatusFilter').value;

  var filtered = _allEstimates.filter(function(est) {
    var clientName = ((est.customer_first || '') + ' ' + (est.customer_last || '')).trim().toLowerCase();
    var vessel = ((est.boat_make || '') + ' ' + (est.boat_model || '')).trim().toLowerCase();
    var estNum = (est.estimate_number || '').toLowerCase();
    var matchQ = !q || clientName.includes(q) || vessel.includes(q) || estNum.includes(q);
    var matchStatus = !statusFilter || (est.status || 'draft') === statusFilter;
    return matchQ && matchStatus;
  });

  renderStats(filtered);
  renderTable(filtered);
}

/* ── Update status ─────────────────────────────────────────── */
async function updateStatus(id, selectEl) {
  var newStatus = selectEl.value;
  var statusInfo = STATUS_LABELS[newStatus] || { cls: 'status-draft' };

  // Update class on select for color
  Object.values(STATUS_LABELS).forEach(function(s) { selectEl.classList.remove(s.cls); });
  selectEl.classList.add(statusInfo.cls);

  // Update in Supabase
  if (typeof _sb !== 'undefined') {
    await _sb.from('estimates')
      .update({ status: newStatus })
      .eq('id', id);
  }

  // Update local cache
  var est = _allEstimates.find(function(e){ return e.id === id; });
  if (est) est.status = newStatus;
  renderStats(_allEstimates);
}

/* ── Duplicate estimate ────────────────────────────────────── */
async function duplicateEstimate(id) {
  if (typeof loadEstimateById !== 'function') return;
  var data = await loadEstimateById(id);
  if (!data) { alert('Could not load estimate data.'); return; }

  // Open estimator with data pre-loaded via sessionStorage
  sessionStorage.setItem('chemcalc_duplicate', JSON.stringify(data));
  window.location.href = 'estimate.html?duplicate=1';
}

/* ── Delete ────────────────────────────────────────────────── */
function confirmDelete(id, label) {
  _pendingDeleteId = id;
  document.getElementById('deleteModalMsg').textContent =
    'Delete estimate "' + label + '"? This cannot be undone.';
  document.getElementById('deleteModal').classList.remove('d-none');
  document.getElementById('deleteConfirmBtn').onclick = function() {
    executeDelete(id);
  };
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.add('d-none');
  _pendingDeleteId = null;
}

async function executeDelete(id) {
  closeDeleteModal();
  if (typeof deleteEstimateById === 'function') {
    await deleteEstimateById(id);
  }
  _allEstimates = _allEstimates.filter(function(e){ return e.id !== id; });
  applyFilters();
}
