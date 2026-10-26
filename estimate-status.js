/* ============================================================
   ESTIMATE STATUS — estimate-status.js
   chemcalc.co | Think & Engage LLC

   The statuses an estimate can have, the chip-styled <select> that shows
   and changes one, and the save. history.html (history.js) and the Estimate
   History preview on estimate.html (estimate.js) both draw and save a status
   through this file, so a status is defined and written in one place. The
   chip colors are the .history-status--* rules in style.css. The save needs
   supabase-client.js (_sb) loaded first.
   ============================================================ */

var STATUS_LABELS = {
  draft:       { label: 'Draft',       cls: 'history-status--draft' },
  sent:        { label: 'Sent',        cls: 'history-status--sent' },
  approved:    { label: 'Approved',    cls: 'history-status--approved' },
  in_progress: { label: 'In Progress', cls: 'history-status--in-progress' },
  completed:   { label: 'Completed',   cls: 'history-status--completed' },
  invoiced:    { label: 'Invoiced',    cls: 'history-status--invoiced' },
  declined:    { label: 'Declined',    cls: 'history-status--declined' }
};

/* <option>s for a status select, the current status selected */
function estimateStatusOptions(current) {
  return Object.keys(STATUS_LABELS).map(function(k) {
    var s = STATUS_LABELS[k];
    return '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + s.label + '</option>';
  }).join('');
}

/* The status select for one estimate. `num` is the estimate number, already
   HTML-escaped (it names the control for screen readers). `handler` is the
   name of the page's change handler, called as handler(id, selectElement). */
function estimateStatusSelectHtml(id, status, num, handler) {
  return '<select class="history-status ' + (STATUS_LABELS[status] || { cls: 'history-status--draft' }).cls + '" ' +
    'data-status-for="' + id + '" data-prev="' + status + '" aria-label="Status for ' + num + '" ' +
    'onchange="' + handler + '(\'' + id + '\', this)">' +
    estimateStatusOptions(status) +
    '</select>';
}

/* Save the status chosen in selectEl. Only once Supabase confirms the row was updated are the colors changed: every copy of that
   estimate's select on the page is recolored (history.html draws the same estimate twice: desktop table and mobile list) and its
   data-prev is moved to the new status; the new status is returned and the caller updates its own cache. On any failure (no client,
   an error, or no row updated, which is what a blocked update looks like) every copy goes back to the previous status and null is
   returned: the caller must then leave its cache alone. */
async function saveEstimateStatus(id, selectEl) {
  var newStatus = selectEl.value;
  var prev = selectEl.getAttribute('data-prev') || 'draft';
  var copies = Array.prototype.slice.call(document.querySelectorAll('select[data-status-for="' + id + '"]'));
  if (copies.indexOf(selectEl) === -1) copies.push(selectEl);

  function paint(status) {
    var info = STATUS_LABELS[status] || { cls: 'history-status--draft' };
    copies.forEach(function(sel) {
      sel.value = status;
      sel.setAttribute('data-prev', status);
      Object.values(STATUS_LABELS).forEach(function(s) { sel.classList.remove(s.cls); });
      sel.classList.add(info.cls);
    });
  }

  var saved = false;
  try {
    if (typeof _sb !== 'undefined' && _sb) {
      var res = await _sb.from('estimates').update({ status: newStatus }).eq('id', id).select('id');
      saved = !!res && !res.error && Array.isArray(res.data) && res.data.length > 0;
    }
  } catch (e) {
    saved = false;
  }

  if (!saved) { paint(prev); return null; }
  paint(newStatus);
  return newStatus;
}

/* The short error shown by both pages when a status did not save: a role="alert" line placed next to `anchor` (where is the
   insertAdjacentElement position), gone after 6 seconds. One at a time. */
function showEstimateStatusError(anchor, where) {
  if (!anchor) return;
  var old = document.getElementById('estimateStatusError');
  if (old) old.remove();
  var p = document.createElement('p');
  p.id = 'estimateStatusError';
  p.className = 'save-status save-status--error';
  p.setAttribute('role', 'alert');
  p.textContent = "Couldn't save the status. Please try again.";
  anchor.insertAdjacentElement(where, p);
  clearTimeout(showEstimateStatusError._timer);
  showEstimateStatusError._timer = setTimeout(function() { p.remove(); }, 6000);
}
