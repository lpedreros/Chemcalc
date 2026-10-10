/* ============================================================
   ESTIMATE HISTORY — history.js
   chemcalc.co | Think & Engage LLC
   ============================================================ */

var _allEstimates = [];
var _pendingDeleteId = null;
var _historyWired = false;

/* The statuses (STATUS_LABELS), the status select and the status save are in
   estimate-status.js, shared with the Estimate History preview on estimate.html. */

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
    // Logged out: never leave the last user's estimates on screen.
    proGate.classList.add('d-none');
    content.classList.add('d-none');
    _applyPlanUI('out');
    return;
  }
  authGate.classList.add('d-none');

  if (tier !== 'pro') {
    proGate.classList.remove('d-none');
    content.classList.add('d-none');
    _applyPlanUI('free');
    return;
  }
  proGate.classList.add('d-none');
  content.classList.remove('d-none');
  _applyPlanUI('pro');
  loadHistory();
}

/* ── Hero: plan pill + New Estimate button ─────────────────── */
function _applyPlanUI(state) {
  var pill = document.getElementById('histPlanPill');
  var note = document.getElementById('histPlanNote');
  var newBtn = document.getElementById('histNewBtn');
  var isPro = state === 'pro';
  if (pill) {
    pill.textContent = isPro ? 'Pro plan' : 'Free plan';
    pill.classList.toggle('is-pro', isPro);
  }
  if (note) {
    note.textContent = isPro ? 'History, PDF export & Trello included' : 'Saving estimates requires Pro';
  }
  if (newBtn) newBtn.classList.toggle('d-none', state === 'out');
}

/* ── Load estimates from Supabase ──────────────────────────── */
async function loadHistory() {
  document.getElementById('histLoading').classList.remove('d-none');
  document.getElementById('histEmpty').classList.add('d-none');
  document.getElementById('histNoMatch').classList.add('d-none');

  var estimates = [];
  if (typeof loadEstimatesFromSupabase === 'function') {
    estimates = await loadEstimatesFromSupabase();
  }
  await _addTrelloFlags(estimates);

  _allEstimates = estimates;
  document.getElementById('histLoading').classList.add('d-none');

  // Wire up search and filter (once — loadHistory runs again on every auth refresh)
  _wireHistoryControls();
  applyFilters();
}

/* ── Which estimates already have a Trello card? ────────────
   loadEstimatesFromSupabase() (auth.js) does not select trello_card_id, and auth.js is not
   ours to change here, so ask for just that one column. Read-only, own rows only (RLS), and
   skipped entirely if auth.js ever starts returning the column itself. The marker is cosmetic:
   any failure here must never block the list. */
async function _addTrelloFlags(rows) {
  if (!rows || !rows.length) return;
  if (Object.prototype.hasOwnProperty.call(rows[0], 'trello_card_id')) return;
  if (typeof _sb === 'undefined' || !_sb) return;
  try {
    var res = await _sb.from('estimates').select('id, trello_card_id').not('trello_card_id', 'is', null);
    if (!res || res.error || !res.data) return;
    var byId = {};
    res.data.forEach(function(r) { byId[r.id] = r.trello_card_id; });
    rows.forEach(function(r) { if (byId[r.id]) r.trello_card_id = byId[r.id]; });
  } catch (e) { /* ignore */ }
}

function _wireHistoryControls() {
  if (_historyWired) return;
  _historyWired = true;
  document.getElementById('histSearch').addEventListener('input', applyFilters);
  _buildFilters();
  document.getElementById('histFilters').addEventListener('click', function(ev) {
    var btn = ev.target.closest ? ev.target.closest('button[data-status]') : null;
    if (!btn) return;
    document.getElementById('histStatusFilter').value = btn.getAttribute('data-status');
    applyFilters();
  });
  document.getElementById('histClearFilters').addEventListener('click', clearFilters);
}

/* ── Status filter buttons: All + one per real status ───────── */
function _buildFilters() {
  var box = document.getElementById('histFilters');
  var html = '<button type="button" class="history-filter" data-status="" aria-pressed="true">All <span class="history-filter-count">0</span></button>';
  Object.keys(STATUS_LABELS).forEach(function(k) {
    html += '<button type="button" class="history-filter" data-status="' + k + '" aria-pressed="false">' +
            STATUS_LABELS[k].label + ' <span class="history-filter-count">0</span></button>';
  });
  box.innerHTML = html;
}

/* Counts always come from the full loaded set, not the filtered one. */
function _syncFilters() {
  var box = document.getElementById('histFilters');
  if (!box) return;
  var current = document.getElementById('histStatusFilter').value;
  Array.prototype.forEach.call(box.querySelectorAll('button[data-status]'), function(btn) {
    var s = btn.getAttribute('data-status');
    var n = s === '' ? _allEstimates.length
                     : _allEstimates.filter(function(e) { return (e.status || 'draft') === s; }).length;
    btn.querySelector('.history-filter-count').textContent = n;
    btn.setAttribute('aria-pressed', s === current ? 'true' : 'false');
  });
}

function clearFilters() {
  document.getElementById('histSearch').value = '';
  document.getElementById('histStatusFilter').value = '';
  applyFilters();
}

/* ── Stats bar ─────────────────────────────────────────────── */
function renderStats(rows) {
  document.getElementById('statTotal').textContent = rows.length;
  var totalVal = rows.reduce(function(s, r){ return s + (parseFloat(r.grand_total) || 0); }, 0);
  document.getElementById('statValue').textContent = fmtMoney(totalVal);
  var approved = rows.filter(function(r){ return r.status === 'approved'; });
  document.getElementById('statApproved').textContent = approved.length;
  var approvedVal = approved.reduce(function(s, r){ return s + (parseFloat(r.grand_total) || 0); }, 0);
  document.getElementById('statApprovedValue').textContent = fmtMoney(approvedVal);
  document.getElementById('statDraft').textContent = rows.filter(function(r){ return r.status === 'draft' || !r.status; }).length;
}

/* ── Render rows: one data set, two targets (desktop table + mobile list) ── */
function renderTable(rows) {
  var tbody = document.getElementById('histTableBody');
  var list = document.getElementById('histMobileList');
  var empty = document.getElementById('histEmpty');
  var noMatch = document.getElementById('histNoMatch');
  var count = document.getElementById('histCount');
  var wrap = document.getElementById('histTableWrap');
  tbody.innerHTML = '';
  list.innerHTML = '';

  // No rows: show only the empty / no-match message, not an empty table with its header row.
  wrap.classList.toggle('d-none', !rows || rows.length === 0);

  if (!rows || rows.length === 0) {
    // Nothing saved at all vs. saved estimates that the current search/filter hides.
    if (_allEstimates.length === 0) {
      empty.classList.remove('d-none');
      noMatch.classList.add('d-none');
    } else {
      noMatch.classList.remove('d-none');
      empty.classList.add('d-none');
    }
    count.classList.add('d-none');
    _syncFilters();
    return;
  }
  empty.classList.add('d-none');
  noMatch.classList.add('d-none');

  rows.forEach(function(est) {
    var clientName = ((est.customer_first || '') + ' ' + (est.customer_last || '')).trim() || '—';
    var vessel = [est.boat_make, est.boat_model].filter(Boolean).join(' ') || '—';
    var status = est.status || 'draft';
    var num = _esc(est.estimate_number || '—');
    var openHref = 'estimate.html?draft=' + est.id;
    var statusSelect = estimateStatusSelectHtml(est.id, status, num, 'updateStatus');
    var trello = est.trello_card_id
      ? '<span class="history-trello" title="Card created in Trello">' +
          '<svg width="12" height="12" aria-hidden="true"><use href="#icon-external-link"/></svg>Trello</span>'
      : '';
    var actions =
      '<div class="history-actions">' +
        '<button type="button" class="history-icon-btn" onclick="duplicateEstimate(\'' + est.id + '\')" title="Duplicate">' +
          '<span class="sr-only">Duplicate ' + num + '</span>' +
          '<svg width="16" height="16" aria-hidden="true"><use href="#icon-copy"/></svg></button>' +
        '<button type="button" class="history-icon-btn history-icon-btn--danger" onclick="confirmDelete(\'' + est.id + '\', \'' + _esc(est.estimate_number || 'this estimate') + '\')" title="Delete">' +
          '<span class="sr-only">Delete ' + num + '</span>' +
          '<svg width="16" height="16" aria-hidden="true"><use href="#icon-trash"/></svg></button>' +
      '</div>';

    var tr = document.createElement('tr');
    tr.dataset.id = est.id;
    tr.innerHTML =
      '<td class="history-td-num"><a href="' + openHref + '" class="history-est-link">' + num + '</a></td>' +
      '<td class="history-td-client">' + _esc(clientName) + '</td>' +
      '<td class="history-td-vessel">' + _esc(vessel) + '</td>' +
      '<td class="history-td-total">' + fmtMoney(est.grand_total) + '</td>' +
      '<td class="history-td-date">' + fmtDate(est.created_at) + '</td>' +
      '<td class="history-td-status"><div class="history-status-cell">' + statusSelect + trello + '</div></td>' +
      '<td class="history-td-actions">' + actions + '</td>';
    tbody.appendChild(tr);

    var li = document.createElement('li');
    li.className = 'history-item';
    li.dataset.id = est.id;
    li.innerHTML =
      '<div class="history-item-top">' +
        '<div class="history-item-main">' +
          '<a href="' + openHref + '" class="history-est-link history-est-link--sm">' + num + '</a>' +
          '<p class="history-item-client">' + _esc(clientName) + '</p>' +
          '<p class="history-item-vessel">' + _esc(vessel) + '</p>' +
        '</div>' +
        '<p class="history-item-total">' + fmtMoney(est.grand_total) + '</p>' +
      '</div>' +
      '<div class="history-item-bottom">' +
        '<div class="history-item-meta">' + statusSelect + '<span class="history-item-date">' + fmtDate(est.created_at) + '</span></div>' +
        actions +
      '</div>';
    list.appendChild(li);
  });

  count.textContent = 'Showing ' + rows.length + ' of ' + _allEstimates.length;
  count.classList.remove('d-none');
  _syncFilters();
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
  // Recolors both copies of the select (desktop table + mobile list) and saves it.
  var newStatus = await saveEstimateStatus(id, selectEl);

  // Update local cache
  var est = _allEstimates.find(function(e){ return e.id === id; });
  if (est) est.status = newStatus;
  renderStats(_allEstimates);
  _syncFilters();
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
