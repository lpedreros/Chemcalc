/* ============================================================
   MARINE REPAIR ESTIMATOR — estimate.js
   chemcalc.co | Think & Engage LLC
   ============================================================ */

/* ── Session state ── */
var currentView = 'internal'; // 'internal' | 'customer'
var taskCounter = 0;
var grandTotalValue = 0;

/* setUserTier — called by auth.js after session loads */
function setUserTier(tier) {
  var isPro = tier === 'pro';
  var loggedIn = false;
  try { loggedIn = (typeof window.isLoggedIn === 'function') ? window.isLoggedIn() : false; } catch(e) {}

  // Pro-only elements
  document.querySelectorAll('.pro-only').forEach(function (el) {
    el.style.display = isPro ? '' : 'none';
  });

  // Internal summary (logged-in only)
  var internalSummary = document.getElementById('internalSummary');
  if (internalSummary) internalSummary.classList.toggle('d-none', !loggedIn);

  // Body class for print CSS
  document.body.classList.toggle('free-user', !isPro);
  document.body.classList.toggle('pro-user', isPro);

  // Update estimate number prefix for pro users (from saved biz info)
  if (isPro) {
    var biz = loadBusinessInfo();
    if (biz && biz.prefix) {
      var estNum = document.getElementById('estimateNumber').value;
      var prefixPattern = /^[A-Z0-9]+-/;
      if (prefixPattern.test(estNum)) {
        document.getElementById('estimateNumber').value = estNum.replace(prefixPattern, biz.prefix.toUpperCase() + '-');
      }
    }
    // Pre-fill biz info modal fields
    populateBizInfoModal();
  }

  // Populate print header with current data
  populatePrintHeader();
}

/* ── Business Info (Pro): save/load from localStorage ── */
function saveBusinessInfo() {
  var biz = {
    name:    document.getElementById('bizName').value.trim(),
    tagline: document.getElementById('bizTagline').value.trim(),
    phone:   document.getElementById('bizPhone').value.trim(),
    email:   document.getElementById('bizEmail').value.trim(),
    website: document.getElementById('bizWebsite').value.trim(),
    address: document.getElementById('bizAddress').value.trim(),
    prefix:  document.getElementById('bizPrefix').value.trim().toUpperCase(),
    logoUrl: document.getElementById('bizLogoUrl').value.trim()
  };
  localStorage.setItem('chemcalc_biz_info', JSON.stringify(biz));

  // Apply prefix to current estimate number
  if (biz.prefix) {
    var estNum = document.getElementById('estimateNumber').value;
    var prefixPattern = /^[A-Z0-9]+-/;
    if (prefixPattern.test(estNum)) {
      document.getElementById('estimateNumber').value = estNum.replace(prefixPattern, biz.prefix + '-');
    }
  }

  populatePrintHeader();

  var status = document.getElementById('bizSaveStatus');
  if (status) {
    status.textContent = '\u2713 Saved!';
    status.style.color = '#7ed47e';
    setTimeout(function () { status.textContent = ''; }, 2500);
  }
}

function loadBusinessInfo() {
  try {
    var raw = localStorage.getItem('chemcalc_biz_info');
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function populateBizInfoModal() {
  var biz = loadBusinessInfo();
  if (!biz) return;
  var fields = {
    bizName: biz.name, bizTagline: biz.tagline, bizPhone: biz.phone,
    bizEmail: biz.email, bizWebsite: biz.website, bizAddress: biz.address,
    bizPrefix: biz.prefix, bizLogoUrl: biz.logoUrl
  };
  Object.keys(fields).forEach(function (id) {
    var el = document.getElementById(id);
    if (el && fields[id]) el.value = fields[id];
  });
}

/* ── Populate print header with live estimate + biz data ── */
function populatePrintHeader() {
  var isPro = (typeof window.isPro === 'function') ? window.isPro() : false;
  var biz = isPro ? loadBusinessInfo() : null;

  // Estimate meta
  var estNum = document.getElementById('estimateNumber').value;
  var estDate = document.getElementById('estimateDate').value;
  var estValid = document.getElementById('estimateValidUntil').value;
  setText('printEstNum',   estNum   ? 'Est. #' + estNum : '');
  setText('printEstDate',  estDate  ? 'Date: ' + estDate : '');
  setText('printEstValid', estValid ? 'Valid: ' + estValid : '');

  // Company info (pro)
  if (biz) {
    setText('printCompanyName',    biz.name    || '');
    setText('printCompanyTagline', biz.tagline || '');
    setText('printCompanyPhone',   biz.phone   || '');
    setText('printCompanyEmail',   biz.email   || '');
    setText('printCompanyWebsite', biz.website || '');
    setText('printCompanyAddress', biz.address || '');
    // Logo
    var logoEl = document.getElementById('printLogoImg');
    if (logoEl && biz.logoUrl) {
      logoEl.src = biz.logoUrl;
      logoEl.style.display = '';
    }
  }
}

function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Affiliate links map (keyed from affiliate_links.js globals) ── */
function getAffiliateLink(key) {
  if (typeof affiliateLinksData !== 'undefined' && affiliateLinksData[key]) {
    return affiliateLinksData[key].url;
  }
  return null;
}

/* ── Material presets ── */
var MATERIAL_PRESETS = {
  gelcoat: {
    materials: [
      { name: 'White Gelcoat, 1-gallon kit', cost: 0, qty: 1, source: 'amz', affKey: 'white_gel_coat_1gallon_kit_with_wax_and_mekp' },
      { name: '3M Platinum Plus Filler (gallon)', cost: 0, qty: 1, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
      { name: '80-grit Sanding Disc 5-inch (50-box)', cost: 0, qty: 2, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: '400-grit Wet Sandpaper (50 sheets)', cost: 0, qty: 2, source: 'amz', affKey: '400_grit_wet_paper_50_sheets' },
      { name: 'Preval Sprayer (single)', cost: 0, qty: 2, source: 'amz', affKey: 'preval_singlepack' },
      { name: 'Denatured Alcohol (gallon)', cost: 0, qty: 1, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: 'Masking Paper 12-inch', cost: 0, qty: 1, source: 'amz', affKey: 'masking_paper_12inch' },
      { name: '3M Clean Sanding Blocks', cost: 0, qty: 1, source: 'amz', affKey: '3m_clean_sanding_blocks' }
    ],
    paint: [],
    taskName: 'Gelcoat Repair',
    tasks: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Mask', hours: 0.5 },
      { name: 'Grind', hours: 1.0 },
      { name: 'Fill & Shape', hours: 1.5 },
      { name: 'Shoot Gel Coat', hours: 1.0 },
      { name: 'Wet Sand & Buff', hours: 1.5 },
      { name: 'Cleanup', hours: 0.5 },
      { name: 'Driving', hours: 0.5 }
    ]
  },
  fiberglass: {
    materials: [
      { name: 'Polyester Resin (gallon)', cost: 0, qty: 1, source: 'amz', affKey: 'polyester_resin_1gallon_kit_with_mekp' },
      { name: '1708 Biaxial Cloth 50in x 10yd', cost: 0, qty: 3, source: 'amz', affKey: 'fiberglass_cloth_1708_biaxial_50_in_x_10_yards' },
      { name: '3M Platinum Plus Filler (gallon)', cost: 0, qty: 1, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
      { name: '80-grit Sanding Disc 5-inch (50-box)', cost: 0, qty: 2, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: '400-grit Wet Sandpaper (50 sheets)', cost: 0, qty: 2, source: 'amz', affKey: '400_grit_wet_paper_50_sheets' },
      { name: 'Denatured Alcohol (gallon)', cost: 0, qty: 1, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: 'Masking Paper 12-inch', cost: 0, qty: 1, source: 'amz', affKey: 'masking_paper_12inch' },
      { name: 'White Gelcoat, 1-gallon kit', cost: 0, qty: 1, source: 'amz', affKey: 'white_gel_coat_1gallon_kit_with_wax_and_mekp' }
    ],
    paint: [],
    taskName: 'Fiberglass Repair',
    tasks: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Mask', hours: 0.5 },
      { name: 'Grind', hours: 1.5 },
      { name: 'Cut Cloth', hours: 0.5 },
      { name: 'Glass', hours: 2.0 },
      { name: 'Fill & Shape', hours: 2.0 },
      { name: 'Match', hours: 1.0 },
      { name: 'Shoot Gel Coat', hours: 1.0 },
      { name: 'Wet Sand & Buff', hours: 2.0 },
      { name: 'Cleanup', hours: 0.5 },
      { name: 'Driving', hours: 0.5 }
    ]
  },
  paint: {
    materials: [
      { name: '80-grit Sanding Disc 5-inch (50-box)', cost: 0, qty: 2, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: '400-grit Wet Sandpaper (50 sheets)', cost: 0, qty: 3, source: 'amz', affKey: '400_grit_wet_paper_50_sheets' },
      { name: 'Masking Paper 12-inch', cost: 0, qty: 2, source: 'amz', affKey: 'masking_paper_12inch' },
      { name: 'Denatured Alcohol (gallon)', cost: 0, qty: 1, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: '320-grit Xtract Sanding Disc 5-inch (50-box)', cost: 0, qty: 2, source: 'amz', affKey: '320_grit_xtract_sanding_disc_5_inch_50box' }
    ],
    paint: [
      { name: 'Awlcraft 2000 / Awlgrip Spray Converter (qt)', cost: 0, qty: 1, source: 'amz', affKey: 'awlcraft2000awlgrip_spray_converter_1quart' },
      { name: 'Awlcraft 2000 / Awlgrip Spray Reducer (qt)', cost: 0, qty: 1, source: 'amz', affKey: 'awlcraft2000awlgrip_spray_reducer_1quart' }
    ],
    taskName: 'Full Paint Job',
    tasks: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Mask', hours: 1.0 },
      { name: 'Grind / Sand', hours: 2.0 },
      { name: 'Fill & Shape', hours: 1.0 },
      { name: 'Match', hours: 0.5 },
      { name: 'Shoot Paint', hours: 2.0 },
      { name: 'Wet Sand & Buff', hours: 2.0 },
      { name: 'Cleanup', hours: 0.5 },
      { name: 'Driving', hours: 0.5 }
    ]
  },
  structural: {
    materials: [
      { name: 'Polyester Resin (gallon)', cost: 0, qty: 2, source: 'amz', affKey: 'polyester_resin_1gallon_kit_with_mekp' },
      { name: '1708 Biaxial Cloth 50in x 10yd', cost: 0, qty: 6, source: 'amz', affKey: 'fiberglass_cloth_1708_biaxial_50_in_x_10_yards' },
      { name: 'Coosa Board (sheet)', cost: 0, qty: 1, source: 'web', affKey: null },
      { name: '3M Platinum Plus Filler (gallon)', cost: 0, qty: 1, source: 'amz', affKey: '3m_platinum_plus_filler_1_gallon' },
      { name: 'Denatured Alcohol (gallon)', cost: 0, qty: 1, source: 'amz', affKey: 'denatured_alcohol_1gallon' },
      { name: '80-grit Sanding Disc 5-inch (50-box)', cost: 0, qty: 2, source: 'amz', affKey: '80_grit_sanding_disc_5inch_50box' },
      { name: 'Masking Paper 12-inch', cost: 0, qty: 1, source: 'amz', affKey: 'masking_paper_12inch' }
    ],
    paint: [],
    taskName: 'Structural Repair',
    tasks: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Demo / Removal', hours: 2.0 },
      { name: 'Grind', hours: 2.0 },
      { name: 'Cut Cloth', hours: 1.0 },
      { name: 'Glass', hours: 3.0 },
      { name: 'Fill & Shape', hours: 2.0 },
      { name: 'Cleanup', hours: 1.0 },
      { name: 'Driving', hours: 0.5 }
    ]
  },
  custom: {
    materials: [],
    paint: [],
    taskName: 'Repair Task',
    tasks: [
      { name: 'Getting Ready', hours: 0.5 },
      { name: 'Mask', hours: 0.5 },
      { name: 'Grind', hours: 1.0 },
      { name: 'Fill & Shape', hours: 1.0 },
      { name: 'Cleanup', hours: 0.5 },
      { name: 'Driving', hours: 0.5 }
    ]
  }
};

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function () {
  initEstimate();
  checkExpiry();
  // auth.js initializes session and calls setUserTier()
  if (typeof authInit === 'function') authInit();
  // Default: load blank estimate with one repair task
  addRepairTask();
});

function initEstimate() {
  var now = new Date();
  var estNum = 'EST-' + now.getFullYear() +
    pad(now.getMonth() + 1) + pad(now.getDate()) + '-' +
    Math.floor(1000 + Math.random() * 9000);
  document.getElementById('estimateNumber').value = estNum;
  document.getElementById('estimateDate').value = formatDate(now);
  var validUntil = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
  document.getElementById('estimateValidUntil').value = formatDate(validUntil);
  // Populate print header once dates are set
  setTimeout(populatePrintHeader, 0);
}

function checkExpiry() {
  var validStr = document.getElementById('estimateValidUntil').value;
  if (!validStr) return;
  var parts = validStr.split('/');
  if (parts.length !== 3) return;
  var validDate = new Date(parts[2], parts[0] - 1, parts[1]);
  if (new Date() > validDate) {
    document.getElementById('expiryWarning').classList.remove('d-none');
  }
}

/* ── View toggle ── */
function setView(view) {
  currentView = view;
  if (view === 'customer') {
    document.body.classList.add('customer-view');
    document.getElementById('btnCustomerView').classList.add('active');
    document.getElementById('btnInternalView').classList.remove('active');
  } else {
    document.body.classList.remove('customer-view');
    document.getElementById('btnInternalView').classList.add('active');
    document.getElementById('btnCustomerView').classList.remove('active');
  }
  updateSummary();
}

/* ── Job preset ── */
function applyJobPreset(presetKey) {
  if (!presetKey) return;
  var preset = MATERIAL_PRESETS[presetKey];
  if (!preset) return;

  // Clear and repopulate materials
  var matBody = document.getElementById('materialsBody');
  matBody.innerHTML = '';
  preset.materials.forEach(function (item) {
    addRow('materialsBody', 'materialsMarkup', 'materialsSubtotal', 'sumMaterials', item);
  });

  // Clear and repopulate paint
  var paintBody = document.getElementById('paintBody');
  paintBody.innerHTML = '';
  preset.paint.forEach(function (item) {
    addRow('paintBody', 'paintMarkup', 'paintSubtotal', 'sumPaint', item);
  });

  // Clear existing tasks and add one preset task
  document.getElementById('tasksContainer').innerHTML = '';
  taskCounter = 0;
  addRepairTask(preset.taskName, preset.tasks);

  // Reset preset dropdown
  document.getElementById('jobPreset').value = '';
  updateSummary();
}

/* ── Add material row ── */
function addRow(bodyId, markupId, subtotalId, sumId, prefill) {
  var tbody = document.getElementById(bodyId);
  var markupPct = parseFloat(document.getElementById(markupId).value) || 40;
  var item = prefill || { name: '', cost: 0, qty: 1, source: 'wm', affKey: null };

  var tr = document.createElement('tr');
  tr.setAttribute('data-source', item.source || 'wm');
  tr.setAttribute('data-affkey', item.affKey || '');

  var retailPrice = item.cost * (1 + markupPct / 100);
  var lineTotal = retailPrice * (item.qty || 1);
  var buyHtml = buildBuyLink(item.affKey, item.source);

  tr.innerHTML =
    '<td><input type="text" class="item-name-input" value="' + escHtml(item.name) + '" oninput="recalcRow(this)" placeholder="Item name" /></td>' +
    '<td><input type="number" class="cost-input" value="' + (item.cost || '') + '" min="0" step="0.01" oninput="recalcRow(this)" placeholder="0.00" /></td>' +
    '<td><input type="number" class="markup-row-input" value="' + markupPct + '" min="0" max="500" step="1" oninput="recalcRow(this)" /></td>' +
    '<td><span class="retail-display">' + fmtCurrency(retailPrice) + '</span></td>' +
    '<td><input type="number" class="qty-input" value="' + (item.qty || 1) + '" min="0" step="0.01" oninput="recalcRow(this)" /></td>' +
    '<td><span class="line-total-display">' + fmtCurrency(lineTotal) + '</span></td>' +
    '<td class="d-print-none">' + buyHtml + '</td>' +
    '<td class="d-print-none"><button class="btn-del-row" onclick="delRow(this, \'' + subtotalId + '\', \'' + sumId + '\')" title="Remove">&#10005;</button></td>';

  tbody.appendChild(tr);
  recalcSection(bodyId, markupId, subtotalId, sumId);
}

function buildBuyLink(affKey, source) {
  var url = affKey ? getAffiliateLink(affKey) : null;
  if (url) {
    return '<a href="' + url + '" target="_blank" rel="noopener" class="buy-link">Buy Here</a>';
  }
  return '<span class="buy-link-none">—</span>';
}

function recalcRow(input) {
  var tr = input.closest('tr');
  var cost = parseFloat(tr.querySelector('.cost-input').value) || 0;
  var markup = parseFloat(tr.querySelector('.markup-row-input').value) || 0;
  var qty = parseFloat(tr.querySelector('.qty-input').value) || 0;
  var retail = cost * (1 + markup / 100);
  var total = retail * qty;
  tr.querySelector('.retail-display').textContent = fmtCurrency(retail);
  tr.querySelector('.line-total-display').textContent = fmtCurrency(total);

  // Determine which section this row belongs to
  var tbody = tr.closest('tbody');
  if (tbody) {
    var bodyId = tbody.id;
    if (bodyId === 'materialsBody') recalcSection('materialsBody', 'materialsMarkup', 'materialsSubtotal', 'sumMaterials');
    else if (bodyId === 'paintBody') recalcSection('paintBody', 'paintMarkup', 'paintSubtotal', 'sumPaint');
  }
}

function recalcSection(bodyId, markupId, subtotalId, sumId) {
  var rows = document.querySelectorAll('#' + bodyId + ' tr');
  var subtotal = 0;
  var costTotal = 0;
  rows.forEach(function (tr) {
    var cost = parseFloat(tr.querySelector('.cost-input') ? tr.querySelector('.cost-input').value : 0) || 0;
    var markup = parseFloat(tr.querySelector('.markup-row-input') ? tr.querySelector('.markup-row-input').value : 0) || 0;
    var qty = parseFloat(tr.querySelector('.qty-input') ? tr.querySelector('.qty-input').value : 0) || 0;
    var retail = cost * (1 + markup / 100);
    subtotal += retail * qty;
    costTotal += cost * qty;
  });
  document.getElementById(subtotalId).textContent = fmtCurrency(subtotal);
  if (document.getElementById(sumId)) {
    document.getElementById(sumId).textContent = fmtCurrency(subtotal);
  }
  updateSummary();
}

function delRow(btn, subtotalId, sumId) {
  var tr = btn.closest('tr');
  var tbody = tr.closest('tbody');
  tr.remove();
  var bodyId = tbody.id;
  if (bodyId === 'materialsBody') recalcSection('materialsBody', 'materialsMarkup', 'materialsSubtotal', 'sumMaterials');
  else if (bodyId === 'paintBody') recalcSection('paintBody', 'paintMarkup', 'paintSubtotal', 'sumPaint');
}

/* ── Markup global change ── */
document.addEventListener('input', function (e) {
  if (e.target.id === 'materialsMarkup') {
    applyGlobalMarkup('materialsBody', 'materialsMarkup', 'materialsSubtotal', 'sumMaterials');
  } else if (e.target.id === 'paintMarkup') {
    applyGlobalMarkup('paintBody', 'paintMarkup', 'paintSubtotal', 'sumPaint');
  } else if (e.target.id === 'hourlyRate') {
    recalcAllTasks();
  }
});

function applyGlobalMarkup(bodyId, markupId, subtotalId, sumId) {
  var markup = parseFloat(document.getElementById(markupId).value) || 0;
  var rows = document.querySelectorAll('#' + bodyId + ' tr');
  rows.forEach(function (tr) {
    var inp = tr.querySelector('.markup-row-input');
    if (inp) { inp.value = markup; recalcRow(inp); }
  });
  recalcSection(bodyId, markupId, subtotalId, sumId);
}

/* ── Repair task cards ── */
function addRepairTask(taskName, taskList) {
  taskCounter++;
  var id = taskCounter;
  var name = taskName || 'Repair Task ' + id;
  var tasks = taskList || [
    { name: 'Getting Ready', hours: 0.5 },
    { name: 'Mask', hours: 0.5 },
    { name: 'Grind', hours: 1.0 },
    { name: 'Cut Cloth', hours: 0.5 },
    { name: 'Glass', hours: 1.0 },
    { name: 'Fill & Shape', hours: 1.5 },
    { name: 'Match', hours: 0.5 },
    { name: 'Shoot Gel Coat', hours: 1.0 },
    { name: 'Wet Sand & Buff', hours: 1.5 },
    { name: 'Cleanup', hours: 0.5 },
    { name: 'Driving', hours: 0.5 }
  ];

  var card = document.createElement('div');
  card.className = 'repair-card';
  card.id = 'repairCard' + id;
  card.setAttribute('data-task-id', id);

  var rowsHtml = '';
  tasks.forEach(function (t) {
    var rate = parseFloat(document.getElementById('hourlyRate').value) || 100;
    var price = t.hours * rate;
    rowsHtml +=
      '<tr>' +
      '<td><input type="text" value="' + escHtml(t.name) + '" oninput="recalcTask(' + id + ')" /></td>' +
      '<td><input type="number" class="task-hours" value="' + t.hours + '" min="0" step="0.25" oninput="recalcTask(' + id + ')" /></td>' +
      '<td><span class="task-price-display">' + fmtCurrency(price) + '</span></td>' +
      '<td class="d-print-none"><button class="btn-del-row" onclick="delTaskRow(this,' + id + ')" title="Remove">&#10005;</button></td>' +
      '</tr>';
  });

  card.innerHTML =
    '<div class="repair-card-header">' +
      '<input type="text" class="repair-name-input" value="' + escHtml(name) + '" oninput="updateLaborSummary()" placeholder="Repair name" />' +
      '<div class="repair-card-actions d-print-none">' +
        '<button class="btn-dup-task" onclick="duplicateTask(' + id + ')" title="Duplicate this repair">&#128260; Duplicate</button>' +
        '<button class="btn-del-task" onclick="deleteTask(' + id + ')" title="Remove this repair">&#10005;</button>' +
      '</div>' +
    '</div>' +
    '<div class="table-responsive">' +
      '<table class="repair-task-table" id="taskTable' + id + '">' +
        '<thead><tr><th>Task</th><th>Hours</th><th>Price</th><th class="d-print-none"></th></tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
        '<tfoot>' +
          '<tr class="repair-subtotal-row">' +
            '<td colspan="2" class="repair-subtotal-label">Labor Subtotal</td>' +
            '<td class="repair-subtotal-val" id="taskSubtotal' + id + '">' + fmtCurrency(calcTaskTotal(tasks)) + '</td>' +
            '<td class="d-print-none"></td>' +
          '</tr>' +
        '</tfoot>' +
      '</table>' +
    '</div>' +
    '<div class="d-print-none">' +
      '<button class="btn-add-task-row" onclick="addTaskRow(' + id + ')">+ Add Task</button>' +
    '</div>' +
    '<div class="repair-scope-wrap">' +
      '<button class="repair-scope-toggle d-print-none" onclick="toggleScope(this)">+ Add scope of work note</button>' +
      '<textarea class="repair-scope-textarea" id="repairScope' + id + '" rows="3" placeholder="Optional: describe the work for this repair..."></textarea>' +
    '</div>';

  document.getElementById('tasksContainer').appendChild(card);
  recalcTask(id);
  updateLaborSummary();
}

function calcTaskTotal(tasks) {
  var rate = parseFloat(document.getElementById('hourlyRate').value) || 100;
  var total = 0;
  tasks.forEach(function (t) { total += t.hours * rate; });
  return total;
}

function recalcTask(id) {
  var table = document.getElementById('taskTable' + id);
  if (!table) return;
  var rate = parseFloat(document.getElementById('hourlyRate').value) || 100;
  var total = 0;
  var rows = table.querySelectorAll('tbody tr');
  rows.forEach(function (tr) {
    var hoursInput = tr.querySelector('.task-hours');
    var hours = parseFloat(hoursInput ? hoursInput.value : 0) || 0;
    var price = hours * rate;
    total += price;
    var priceEl = tr.querySelector('.task-price-display');
    if (priceEl) priceEl.textContent = fmtCurrency(price);
  });
  var subtotalEl = document.getElementById('taskSubtotal' + id);
  if (subtotalEl) subtotalEl.textContent = fmtCurrency(total);
  updateLaborSummary();
}

function recalcAllTasks() {
  var cards = document.querySelectorAll('.repair-card');
  cards.forEach(function (card) {
    var id = card.getAttribute('data-task-id');
    if (id) recalcTask(parseInt(id));
  });
}

function addTaskRow(id) {
  var tbody = document.querySelector('#taskTable' + id + ' tbody');
  var rate = parseFloat(document.getElementById('hourlyRate').value) || 100;
  var tr = document.createElement('tr');
  tr.innerHTML =
    '<td><input type="text" value="" oninput="recalcTask(' + id + ')" placeholder="Task name" /></td>' +
    '<td><input type="number" class="task-hours" value="0" min="0" step="0.25" oninput="recalcTask(' + id + ')" /></td>' +
    '<td><span class="task-price-display">' + fmtCurrency(0) + '</span></td>' +
    '<td class="d-print-none"><button class="btn-del-row" onclick="delTaskRow(this,' + id + ')" title="Remove">&#10005;</button></td>';
  tbody.appendChild(tr);
}

function delTaskRow(btn, id) {
  btn.closest('tr').remove();
  recalcTask(id);
}

function deleteTask(id) {
  var card = document.getElementById('repairCard' + id);
  if (card) card.remove();
  updateLaborSummary();
}

function duplicateTask(id) {
  var card = document.getElementById('repairCard' + id);
  if (!card) return;
  var nameInput = card.querySelector('.repair-name-input');
  var taskName = (nameInput ? nameInput.value : 'Repair Task') + ' (Copy)';
  var rows = card.querySelectorAll('#taskTable' + id + ' tbody tr');
  var tasks = [];
  rows.forEach(function (tr) {
    var nameEl = tr.querySelector('input[type="text"]');
    var hoursEl = tr.querySelector('.task-hours');
    tasks.push({
      name: nameEl ? nameEl.value : '',
      hours: parseFloat(hoursEl ? hoursEl.value : 0) || 0
    });
  });
  addRepairTask(taskName, tasks);
}

function toggleScope(btn) {
  var wrap = btn.closest('.repair-scope-wrap');
  var textarea = wrap.querySelector('.repair-scope-textarea');
  if (textarea.style.display === 'block') {
    textarea.style.display = 'none';
    btn.textContent = '+ Add scope of work note';
  } else {
    textarea.style.display = 'block';
    btn.textContent = '− Hide scope note';
    textarea.focus();
  }
}

/* ── Summary ── */
function updateLaborSummary() {
  var laborRows = document.getElementById('laborSummaryRows');
  var customerRepairRows = document.getElementById('customerRepairRows');
  laborRows.innerHTML = '';
  customerRepairRows.innerHTML = '';

  var cards = document.querySelectorAll('.repair-card');
  cards.forEach(function (card) {
    var id = card.getAttribute('data-task-id');
    var nameInput = card.querySelector('.repair-name-input');
    var name = nameInput ? nameInput.value || ('Repair Task ' + id) : ('Repair Task ' + id);
    var subtotalEl = document.getElementById('taskSubtotal' + id);
    var val = subtotalEl ? subtotalEl.textContent : '$0.00';

    // Internal summary row
    var div = document.createElement('div');
    div.className = 'summary-row';
    div.innerHTML = '<span>' + escHtml(name) + ' (Labor)</span><span>' + val + '</span>';
    laborRows.appendChild(div);

    // Customer summary row
    var cdiv = document.createElement('div');
    cdiv.className = 'summary-row';
    cdiv.innerHTML = '<span>' + escHtml(name) + '</span><span>' + val + '</span>';
    customerRepairRows.appendChild(cdiv);
  });

  updateSummary();
}

function updateSummary() {
  var matVal = parseCurrency(document.getElementById('materialsSubtotal').textContent);
  var paintVal = parseCurrency(document.getElementById('paintSubtotal').textContent);
  var laborTotal = 0;
  document.querySelectorAll('[id^="taskSubtotal"]').forEach(function (el) {
    laborTotal += parseCurrency(el.textContent);
  });

  var grand = matVal + paintVal + laborTotal;
  grandTotalValue = grand;

  document.getElementById('grandTotal').textContent = fmtCurrency(grand);
  document.getElementById('grandTotalCustomer').textContent = fmtCurrency(grand);
  document.getElementById('sumMaterials').textContent = fmtCurrency(matVal);
  document.getElementById('sumPaint').textContent = fmtCurrency(paintVal);

  // Internal cost summary
  var matCost = calcSectionCost('materialsBody');
  var paintCost = calcSectionCost('paintBody');
  var totalCost = matCost + paintCost;
  var grossProfit = grand - totalCost;
  var margin = grand > 0 ? (grossProfit / grand * 100) : 0;

  document.getElementById('sumCostMaterials').textContent = fmtCurrency(matCost);
  document.getElementById('sumCostPaint').textContent = fmtCurrency(paintCost);
  document.getElementById('grossProfit').textContent = fmtCurrency(grossProfit);
  document.getElementById('marginPct').textContent = margin.toFixed(1) + '%';
}

function calcSectionCost(bodyId) {
  var total = 0;
  document.querySelectorAll('#' + bodyId + ' tr').forEach(function (tr) {
    var costEl = tr.querySelector('.cost-input');
    var qtyEl = tr.querySelector('.qty-input');
    var cost = parseFloat(costEl ? costEl.value : 0) || 0;
    var qty = parseFloat(qtyEl ? qtyEl.value : 0) || 0;
    total += cost * qty;
  });
  return total;
}

/* ── Auth (stub — replace with real backend) ── */
/* doLogin / doLogout / doSignup / doGoogleLogin are defined in auth.js */

/* ── Auth tab switcher ── */
function switchAuthTab(tab) {
  document.getElementById('authPanelLogin').style.display  = tab === 'login'  ? '' : 'none';
  document.getElementById('authPanelSignup').style.display = tab === 'signup' ? '' : 'none';
  document.getElementById('tabLogin').classList.toggle('active',  tab === 'login');
  document.getElementById('tabSignup').classList.toggle('active', tab === 'signup');
}

/* ── Save / Load drafts (Pro, Supabase) ── */
function saveDraft() {
  if (!window.isPro || !window.isPro()) { openModal('upgradeModal'); return; }
  var data = collectEstimateData();
  window.saveEstimateToSupabase(data).then(function(result) {
    if (result.error) {
      alert('Save failed: ' + result.error.message);
    } else {
      alert('Estimate saved: ' + data.estimateNumber);
    }
  });
}

function openLoadDraftModal() {
  if (!window.isPro || !window.isPro()) { openModal('upgradeModal'); return; }
  var list = document.getElementById('savedEstimatesList');
  var noMsg = document.getElementById('noSavedMsg');
  list.innerHTML = '<p style="color:#aaa;">Loading...</p>';
  openModal('loadDraftModal');

  window.loadEstimatesFromSupabase().then(function(rows) {
    list.innerHTML = '';
    if (!rows || rows.length === 0) {
      noMsg.style.display = '';
    } else {
      noMsg.style.display = 'none';
      rows.forEach(function(row) {
        var item = document.createElement('div');
        item.className = 'saved-item';
        item.innerHTML =
          '<div>' +
            '<div>' + escHtml(row.estimate_number) + ' — ' + escHtml((row.customer_first || '') + ' ' + (row.customer_last || '')) + '</div>' +
            '<div class="saved-item-meta">' + escHtml(row.created_at ? row.created_at.slice(0,10) : '') + ' | ' + escHtml(row.boat_make || '') + ' ' + escHtml(row.boat_model || '') + ' | $' + (row.grand_total || 0).toFixed(2) + '</div>' +
          '</div>' +
          '<button class="saved-item-del" onclick="deleteSavedEstimate(\'' + row.id + '\')" title="Delete">&#10005;</button>';
        item.addEventListener('click', function(e) {
          if (e.target.classList.contains('saved-item-del')) return;
          window.loadEstimateById(row.id).then(function(data) {
            if (data) { loadDraft(data); closeModal('loadDraftModal'); }
          });
        });
        list.appendChild(item);
      });
    }
  });
}

function deleteSavedEstimate(id) {
  if (confirm('Delete this saved estimate?')) {
    window.deleteEstimateById(id).then(function() { openLoadDraftModal(); });
  }
}

function loadDraft(data) {
  // Restore header fields
  document.getElementById('estimateNumber').value = data.estimateNumber || '';
  document.getElementById('estimateDate').value = data.estimateDate || '';
  document.getElementById('estimateValidUntil').value = data.estimateValidUntil || '';
  document.getElementById('hourlyRate').value = data.hourlyRate || 100;
  document.getElementById('clientFirst').value = data.clientFirst || '';
  document.getElementById('clientLast').value = data.clientLast || '';
  document.getElementById('clientPhone').value = data.clientPhone || '';
  document.getElementById('clientEmail').value = data.clientEmail || '';
  document.getElementById('boatMake').value = data.boatMake || '';
  document.getElementById('boatModel').value = data.boatModel || '';
  document.getElementById('boatName').value = data.boatName || '';
  document.getElementById('boatYear').value = data.boatYear || '';
  document.getElementById('boatHIN').value = data.boatHIN || '';
  document.getElementById('scopeNotes').value = data.scopeNotes || '';
  document.getElementById('materialsMarkup').value = data.materialsMarkup || 40;
  document.getElementById('paintMarkup').value = data.paintMarkup || 40;

  // Restore materials
  document.getElementById('materialsBody').innerHTML = '';
  (data.materials || []).forEach(function (item) {
    addRow('materialsBody', 'materialsMarkup', 'materialsSubtotal', 'sumMaterials', item);
  });

  // Restore paint
  document.getElementById('paintBody').innerHTML = '';
  (data.paint || []).forEach(function (item) {
    addRow('paintBody', 'paintMarkup', 'paintSubtotal', 'sumPaint', item);
  });

  // Restore tasks
  document.getElementById('tasksContainer').innerHTML = '';
  taskCounter = 0;
  (data.tasks || []).forEach(function (t) {
    addRepairTask(t.name, t.rows);
    // Restore scope note if present
    if (t.scope) {
      var scopeEl = document.getElementById('repairScope' + taskCounter);
      if (scopeEl) {
        scopeEl.value = t.scope;
        scopeEl.style.display = 'block';
        var toggleBtn = scopeEl.closest('.repair-scope-wrap') && scopeEl.closest('.repair-scope-wrap').querySelector('.repair-scope-toggle');
        if (toggleBtn) toggleBtn.textContent = '\u2212 Hide scope note';
      }
    }
  });

  checkExpiry();
  updateSummary();
  populatePrintHeader();
}

/* ── Collect estimate data ── */
function collectEstimateData() {
  var materials = [];
  document.querySelectorAll('#materialsBody tr').forEach(function (tr) {
    var nameEl = tr.querySelector('.item-name-input');
    var costEl = tr.querySelector('.cost-input');
    var markupEl = tr.querySelector('.markup-row-input');
    var qtyEl = tr.querySelector('.qty-input');
    materials.push({
      name: nameEl ? nameEl.value : '',
      cost: parseFloat(costEl ? costEl.value : 0) || 0,
      markup: parseFloat(markupEl ? markupEl.value : 0) || 0,
      qty: parseFloat(qtyEl ? qtyEl.value : 1) || 1,
      source: tr.getAttribute('data-source') || 'wm',
      affKey: tr.getAttribute('data-affkey') || ''
    });
  });

  var paint = [];
  document.querySelectorAll('#paintBody tr').forEach(function (tr) {
    var nameEl = tr.querySelector('.item-name-input');
    var costEl = tr.querySelector('.cost-input');
    var markupEl = tr.querySelector('.markup-row-input');
    var qtyEl = tr.querySelector('.qty-input');
    paint.push({
      name: nameEl ? nameEl.value : '',
      cost: parseFloat(costEl ? costEl.value : 0) || 0,
      markup: parseFloat(markupEl ? markupEl.value : 0) || 0,
      qty: parseFloat(qtyEl ? qtyEl.value : 1) || 1,
      source: tr.getAttribute('data-source') || 'wm',
      affKey: tr.getAttribute('data-affkey') || ''
    });
  });

  var tasks = [];
  document.querySelectorAll('.repair-card').forEach(function (card) {
    var id = card.getAttribute('data-task-id');
    var nameInput = card.querySelector('.repair-name-input');
    var rows = [];
    card.querySelectorAll('#taskTable' + id + ' tbody tr').forEach(function (tr) {
      var tNameEl = tr.querySelector('input[type="text"]');
      var hoursEl = tr.querySelector('.task-hours');
      rows.push({
        name: tNameEl ? tNameEl.value : '',
        hours: parseFloat(hoursEl ? hoursEl.value : 0) || 0
      });
    });
    var scopeEl = document.getElementById('repairScope' + id);
    tasks.push({
      name: nameInput ? nameInput.value : '',
      rows: rows,
      scope: scopeEl ? scopeEl.value : ''
    });
  });

  return {
    estimateNumber: document.getElementById('estimateNumber').value,
    estimateDate: document.getElementById('estimateDate').value,
    estimateValidUntil: document.getElementById('estimateValidUntil').value,
    hourlyRate: document.getElementById('hourlyRate').value,
    clientFirst: document.getElementById('clientFirst').value,
    clientLast: document.getElementById('clientLast').value,
    clientPhone: document.getElementById('clientPhone').value,
    clientEmail: document.getElementById('clientEmail').value,
    boatMake: document.getElementById('boatMake').value,
    boatModel: document.getElementById('boatModel').value,
    boatName: document.getElementById('boatName').value,
    boatYear: document.getElementById('boatYear').value,
    boatHIN: document.getElementById('boatHIN').value,
    scopeNotes: document.getElementById('scopeNotes').value,
    materialsMarkup: document.getElementById('materialsMarkup').value,
    paintMarkup: document.getElementById('paintMarkup').value,
    grandTotal: grandTotalValue,
    materials: materials,
    paint: paint,
    tasks: tasks,
    company: (typeof getProfile === 'function' && getProfile()) ? (getProfile().company_name || 'Think & Engage LLC') : 'Think & Engage LLC',
    userEmail: (typeof getUser === 'function' && getUser()) ? getUser().email : null,
    tier: (typeof getProfile === 'function' && getProfile()) ? (getProfile().tier || 'free') : 'free',
    loggedAt: new Date().toISOString()
  };
}

/* ── Database logging (stub — wire to backend API) ── */
function logEstimate() {
  if (typeof isPro !== 'function' || !isPro()) {
    openModal('upgradeModal'); return;
  }
  var data = collectEstimateData();
  var preview = document.getElementById('logPreview');
  preview.innerHTML =
    '<strong>Estimate #:</strong> ' + escHtml(data.estimateNumber) + '<br/>' +
    '<strong>Client:</strong> ' + escHtml(data.clientFirst + ' ' + data.clientLast) + '<br/>' +
    '<strong>Vessel:</strong> ' + escHtml(data.boatYear + ' ' + data.boatMake + ' ' + data.boatModel) + '<br/>' +
    '<strong>Total:</strong> ' + fmtCurrency(data.grandTotal) + '<br/>' +
    '<strong>Company:</strong> ' + escHtml(data.company);
  document.getElementById('logStatus').textContent = '';
  openModal('logModal');
}

function confirmLog() {
  var data = collectEstimateData();
  var statusEl = document.getElementById('logStatus');
  statusEl.textContent = 'Logging...';

  /* ── BACKEND STUB ──
     Replace this fetch with your real Hostinger API endpoint.
     The endpoint should:
       1. Save the estimate JSON to your database
       2. Create a Trello card in the correct board based on data.company
          - Think & Engage LLC → TE board, "Estimate Sent" column
          - Daytona Marine Group → DMG board, "Estimate Sent" column
     Example:
       fetch('https://chemcalc.co/api/log-estimate.php', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
       }).then(r => r.json()).then(res => { ... });
  ── END STUB ── */

  // Simulate success for now
  setTimeout(function () {
    statusEl.textContent = '✓ Logged successfully! Trello card will be created when backend is connected.';
    statusEl.style.color = '#7ed47e';
    // Also save to localStorage as backup
    localStorage.setItem('est_log_' + data.estimateNumber, JSON.stringify(data));
  }, 800);
}

/* ── Export / Share ── */
function exportPDF() {
  var pro = (typeof isPro === 'function') ? isPro() : false;
  if (!pro) {
    // Free/unregistered: customer view, single-page print
    document.body.classList.add('free-user');
    document.body.classList.remove('pro-user');
    setView('customer');
    setTimeout(function () { window.print(); }, 150);
  } else {
    document.body.classList.add('pro-user');
    document.body.classList.remove('free-user');
    window.print();
  }
}

function shareEstimate() {
  var data = collectEstimateData();
  var title = 'Repair Estimate ' + data.estimateNumber;
  var text = 'Marine Repair Estimate for ' + data.clientFirst + ' ' + data.clientLast +
    '\nVessel: ' + data.boatYear + ' ' + data.boatMake + ' ' + data.boatModel +
    '\nTotal: ' + fmtCurrency(data.grandTotal) +
    '\nValid until: ' + data.estimateValidUntil;

  if (navigator.share) {
    // Web Share API — works on mobile (iMessage, WhatsApp, Email, etc.)
    navigator.share({ title: title, text: text })
      .catch(function (err) {
        if (err.name !== 'AbortError') fallbackShare(title, text);
      });
  } else {
    fallbackShare(title, text);
  }
}

function fallbackShare(title, text) {
  var subject = encodeURIComponent(title);
  var body = encodeURIComponent(text);
  window.open('mailto:?subject=' + subject + '&body=' + body, '_blank');
}

function newEstimate() {
  if (confirm('Start a new estimate? Unsaved changes will be lost.')) {
    document.getElementById('clientFirst').value = '';
    document.getElementById('clientLast').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('boatMake').value = '';
    document.getElementById('boatModel').value = '';
    document.getElementById('boatName').value = '';
    document.getElementById('boatYear').value = '';
    document.getElementById('boatHIN').value = '';
    document.getElementById('scopeNotes').value = '';
    document.getElementById('materialsBody').innerHTML = '';
    document.getElementById('paintBody').innerHTML = '';
    document.getElementById('tasksContainer').innerHTML = '';
    taskCounter = 0;
    document.getElementById('materialsSubtotal').textContent = '$0.00';
    document.getElementById('paintSubtotal').textContent = '$0.00';
    document.getElementById('expiryWarning').classList.add('d-none');
    initEstimate();
    addRepairTask();
    updateSummary();
  }
}

/* ── Modal helpers ── */
function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.style.display = 'none';
}
function overlayClose(event, id) {
  if (event.target === document.getElementById(id)) closeModal(id);
}

/* ── Utilities ── */
function fmtCurrency(val) {
  return '$' + (parseFloat(val) || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function parseCurrency(str) {
  return parseFloat((str || '0').replace(/[$,]/g, '')) || 0;
}
function formatDate(d) {
  return pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + '/' + d.getFullYear();
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
