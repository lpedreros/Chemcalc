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
    'data-status-for="' + id + '" aria-label="Status for ' + num + '" ' +
    'onchange="' + handler + '(\'' + id + '\', this)">' +
    estimateStatusOptions(status) +
    '</select>';
}

/* Save the status chosen in selectEl and recolor every copy of that estimate's
   select on the page (history.html draws the same estimate twice: desktop table
   and mobile list). Returns the new status; the caller updates its own cache. */
async function saveEstimateStatus(id, selectEl) {
  var newStatus = selectEl.value;
  var statusInfo = STATUS_LABELS[newStatus] || { cls: 'history-status--draft' };

  Array.prototype.forEach.call(document.querySelectorAll('select[data-status-for="' + id + '"]'), function(sel) {
    if (sel !== selectEl) sel.value = newStatus;
    Object.values(STATUS_LABELS).forEach(function(s) { sel.classList.remove(s.cls); });
    sel.classList.add(statusInfo.cls);
  });

  // Update in Supabase
  if (typeof _sb !== 'undefined') {
    await _sb.from('estimates')
      .update({ status: newStatus })
      .eq('id', id);
  }
  return newStatus;
}
