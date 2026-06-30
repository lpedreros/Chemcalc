/* ============================================================
   MARINE REPAIR ESTIMATOR - estimate.js
   chemcalc.co | Think & Engage LLC
   ============================================================ */

/* -- Session state -- */
var currentView = 'internal'; // 'internal' | 'customer'
var currentPrintStyle = 'summary'; // 'summary' | 'itemized'
var currentFormat = 'summary'; // 'summary' | 'itemized' | 'internal'
var taskCounter = 0;
var grandTotalValue = 0;

/* setUserTier - called by auth.js after session loads */
function setUserTier(tier) {
  var isPro = tier === 'pro';
  var loggedIn = false;
  try { loggedIn = (typeof window.isLoggedIn === 'function') ? window.isLoggedIn() : false; } catch(e) {}

  // Pro-feature elements: always visible, but locked (grayed) for free users
  document.querySelectorAll('.pro-feature').forEach(function (el) {
    el.classList.toggle('pro-locked', !isPro);
  });
  // Pro-feature cards: always visible, but locked for free users
  document.querySelectorAll('.pro-feature-card').forEach(function (el) {
    el.classList.toggle('pro-locked-card', !isPro);
  });

  // Update format toggle button labels: show lock icon for free, remove for pro
  var btnFmtItemized = document.getElementById('btnFmtItemized');
  if (btnFmtItemized) btnFmtItemized.innerHTML = isPro ? 'Itemized' : 'Itemized &#128274;';
  var btnFmtInternal = document.getElementById('btnFmtInternal');
  if (btnFmtInternal) btnFmtInternal.innerHTML = isPro ? 'Internal Copy' : 'Internal Copy &#128274;';

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
    // Load saved materials library
    if (typeof loadMaterialsLibrary === 'function') loadMaterialsLibrary();
  }

  // Show History nav link for Pro users
  var navHistoryLink = document.getElementById('navHistoryLink');
  if (navHistoryLink) navHistoryLink.classList.toggle('d-none', !isPro);

  // Deposit calculator - Pro only
  showDepositCalc(isPro);

  // Populate print header with current data
  populatePrintHeader();
}

/* -- Print Style Toggle -- */
function setPrintStyle(style) {
  currentPrintStyle = style;
  var btnSummary  = document.getElementById('btnPrintSummary');
  var btnItemized = document.getElementById('btnPrintItemized');
  if (btnSummary)  btnSummary.classList.toggle('active', style === 'summary');
  if (btnItemized) btnItemized.classList.toggle('active', style === 'itemized');
  // Apply mutually exclusive print body classes
  document.body.classList.toggle('print-summary',  style === 'summary');
  document.body.classList.toggle('print-itemized', style === 'itemized');
  document.body.classList.toggle('print-internal', style === 'internal');
}

/* -- Pro-gated action wrappers -- */
function _checkPro() {
  return (typeof isPro === 'function') ? isPro() : false;
}
function proAction(modalId) {
  if (_checkPro()) { openModal(modalId); } else { openModal('upgradeModal'); }
}
function proSaveDraft() {
  if (_checkPro()) { saveDraft(); } else { openModal('upgradeModal'); }
}
function proLoadDraft() {
  if (_checkPro()) { openLoadDraftModal(); } else { openModal('upgradeModal'); }
}
function proLogEstimate() {
  if (_checkPro()) { logEstimate(); } else { openModal('upgradeModal'); }
}
function proSetPrintItemized() {
  if (_checkPro()) { setPrintStyle('itemized'); } else { openModal('upgradeModal'); }
}

/* -- Consolidated format selector -- */
function setFormat(fmt) {
  currentFormat = fmt;
  // Update pill active state (toolbar + FAP)
  ['summary','itemized','internal'].forEach(function(f) {
    var cap = f.charAt(0).toUpperCase() + f.slice(1);
    var btn = document.getElementById('btnFmt' + cap);
    if (btn) btn.classList.toggle('active', f === fmt);
    var fapBtn = document.getElementById('fapFmt' + cap);
    if (fapBtn) fapBtn.classList.toggle('fap-fmt-active', f === fmt);
  });
  // Body classes for screen + print differentiation
  document.body.classList.toggle('fmt-summary',  fmt === 'summary');
  document.body.classList.toggle('fmt-itemized',  fmt === 'itemized');
  document.body.classList.toggle('fmt-internal',  fmt === 'internal');
  // Apply view + print style
  if (fmt === 'summary') {
    setView('customer');
    setPrintStyle('summary');
  } else if (fmt === 'itemized') {
    setView('customer');
    setPrintStyle('itemized');
  } else { // internal
    setView('internal');
    setPrintStyle('internal');
  }
}
function proSetFormat(fmt) {
  if (_checkPro()) { setFormat(fmt); } else { openModal('upgradeModal'); }
}
function proAddToTrello() {
  if (_checkPro()) { addToTrello(); } else { openModal('upgradeModal'); }
}

/* -- Business Info (Pro): save/load from localStorage -- */
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
  // Always save to localStorage as fast local cache
  localStorage.setItem('chemcalc_biz_info', JSON.stringify(biz));

  // Save biz info + Trello settings to Supabase so it travels with the user
  var user = (typeof getUser === 'function') ? getUser() : null;
  if (user && _sb) {
    var profileUpdate = {
      biz_name:     biz.name,
      biz_tagline:  biz.tagline,
      biz_phone:    biz.phone,
      biz_email:    biz.email,
      biz_website:  biz.website,
      biz_address:  biz.address,
      biz_prefix:   biz.prefix,
      biz_logo_url: biz.logoUrl
    };
    // Merge Trello settings if available
    if (typeof trelloCollectSettings === 'function') {
      var trelloSettings = trelloCollectSettings();
      Object.assign(profileUpdate, trelloSettings);
    }
    _sb.from('profiles').update(profileUpdate).eq('id', user.id)
      .then(function(res) {
        if (res.error) console.warn('Profile save error:', res.error.message);
      });
  } else if (typeof trelloCollectSettings === 'function') {
    // Not logged in - at least update in-memory Trello state
    trelloCollectSettings();
  }

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
  // Prefer Supabase profile data (already loaded into currentProfile by auth.js)
  var profile = (typeof getProfile === 'function') ? getProfile() : null;
  if (profile && profile.biz_name) {
    return {
      name:    profile.biz_name    || '',
      tagline: profile.biz_tagline || '',
      phone:   profile.biz_phone   || '',
      email:   profile.biz_email   || '',
      website: profile.biz_website || '',
      address: profile.biz_address || '',
      prefix:  profile.biz_prefix  || '',
      logoUrl: profile.biz_logo_url || ''
    };
  }
  // Fallback to localStorage (for users who saved before this update)
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
  // Restore Trello UI from saved profile
  if (typeof trelloInit === 'function') {
    var profile = (typeof getProfile === 'function') ? getProfile() : null;
    trelloInit(profile);
  }
}

/* -- Populate print header with live estimate + biz data -- */
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

/* -- Affiliate links map (keyed from affiliate_links.js globals) -- */
function getAffiliateLink(key) {
  if (typeof affiliateLinksData !== 'undefined' && affiliateLinksData[key]) {
    return affiliateLinksData[key].url;
  }
  return null;
}

/* -- Material presets -- */
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

/* -- Init -- */
// -- Help popover toggle --
function showHelp(id, iconEl) {
  var el = document.getElementById(id);
  if (!el) return;
  var isOpen = el.classList.contains('help-popover--open');
  document.querySelectorAll('.help-popover--open').forEach(function(p) {
    p.classList.remove('help-popover--open');
  });
  if (!isOpen) {
    var rect = iconEl.getBoundingClientRect();
    el.style.top = (rect.bottom + 8) + 'px';
    el.style.right = (window.innerWidth - rect.right) + 'px';
    el.classList.add('help-popover--open');
  }
}
document.addEventListener('click', function(e) {
  if (!e.target.classList.contains('help-icon')) {
    document.querySelectorAll('.help-popover--open').forEach(function(p) {
      p.classList.remove('help-popover--open');
    });
  }
});

document.addEventListener('DOMContentLoaded', function () {
  initEstimate();
  checkExpiry();
  // auth.js initializes session and calls setUserTier()
  if (typeof authInit === 'function') authInit();

  // Auto-load duplicate from sessionStorage (used by History page Copy button)
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('duplicate') === '1') {
    var dupData = sessionStorage.getItem('chemcalc_duplicate');
    if (dupData) {
      sessionStorage.removeItem('chemcalc_duplicate');
      try {
        var parsed = JSON.parse(dupData);
        // Clear estimate number so a new one is generated
        parsed.estimateNumber = null;
        setTimeout(function(){ loadDraft(parsed); }, 200);
      } catch(e) { console.warn('Duplicate load failed:', e); }
    }
  }

  // Auto-load estimate from ?draft=UUID URL param (used by Trello card links)
  var draftId = urlParams.get('draft');
  if (draftId) {
    // Wait for auth session to be ready before loading
    var _draftLoadAttempts = 0;
    var _draftLoadInterval = setInterval(function () {
      _draftLoadAttempts++;
      if (typeof window.loadEstimateById === 'function' && typeof window.isLoggedIn === 'function' && window.isLoggedIn()) {
        clearInterval(_draftLoadInterval);
        window.loadEstimateById(draftId).then(function (data) {
          if (data) {
            loadDraft(data);
          } else {
            console.warn('Draft not found or access denied for id:', draftId);
          }
        });
      } else if (_draftLoadAttempts > 40) {
        clearInterval(_draftLoadInterval); // give up after 4s
      }
    }, 100);
  } else {
    // Default: blank estimate, no task pre-added - user clicks Add Task
  }

  // Init typeahead observer for material/paint name inputs
  if (typeof initTypeaheadObserver === 'function') initTypeaheadObserver();

  // Load materials library immediately on page load (will no-op if not logged in)
  if (typeof loadMaterialsLibrary === 'function') loadMaterialsLibrary();
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
  // Apply initial format so body classes are set correctly
  setFormat('summary');
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

/* -- View toggle -- */
function setView(view) {
  currentView = view;
  if (view === 'customer') {
    document.body.classList.add('customer-view');
  } else {
    document.body.classList.remove('customer-view');
  }
  updateSummary();
}

/* -- Job preset -- */
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

  // Clear existing tasks and add one preset task
  document.getElementById('tasksContainer').innerHTML = '';
  taskCounter = 0;
  addRepairTask(preset.taskName, preset.tasks);

  // Reset preset dropdown
  document.getElementById('jobPreset').value = '';
  updateSummary();
}

/* -- Add material row -- */
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
    '<td class="col-cost"><input type="number" class="cost-input" value="' + (item.cost || '') + '" min="0" step="0.01" oninput="recalcRow(this)" placeholder="0.00" /></td>' +
    '<td class="col-markup"><input type="number" class="markup-row-input" value="' + markupPct + '" min="0" max="500" step="1" oninput="recalcRow(this)" /></td>' +
    '<td class="col-retail"><span class="retail-display">' + fmtCurrency(retailPrice) + '</span></td>' +
    '<td class="col-qty"><input type="number" class="qty-input" value="' + (item.qty || 1) + '" min="0" step="0.01" oninput="recalcRow(this)" /></td>' +
    '<td class="col-total"><span class="line-total-display">' + fmtCurrency(lineTotal) + '</span></td>' +
    '<td class="col-link d-print-none">' + buyHtml + '</td>' +
    '<td class="col-del d-print-none"><button class="btn-save-lib" onclick="saveRowToLibrary(this)" title="Save to My Library">&#9733;</button></td>' +
    '<td class="col-del d-print-none"><button class="btn-del-row" onclick="delRow(this, \'' + subtotalId + '\', \'' + sumId + '\')" title="Remove">&#10005;</button></td>';

  tbody.appendChild(tr);
  recalcSection(bodyId, markupId, subtotalId, sumId);
}

function buildBuyLink(affKey, source) {
  var url = affKey ? getAffiliateLink(affKey) : null;
  if (url) {
    return '<a href="' + url + '" target="_blank" rel="noopener" class="buy-link">Buy Here</a>';
  }
  return '<span class="buy-link-none">-</span>';
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
}

/* -- Markup global change -- */
document.addEventListener('input', function (e) {
  if (e.target.id === 'materialsMarkup') {
    applyGlobalMarkup('materialsBody', 'materialsMarkup', 'materialsSubtotal', 'sumMaterials');
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

/* -- Repair task cards -- */
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
        '<button class="btn-save-template d-print-none" onclick="saveTaskAsTemplate(' + id + ')" title="Save as My Template">&#9733; Save as Template</button>' +
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
    btn.textContent = '- Hide scope note';
    textarea.focus();
  }
}

/* -- Summary -- */
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
  var laborTotal = 0;
  document.querySelectorAll('[id^="taskSubtotal"]').forEach(function (el) {
    laborTotal += parseCurrency(el.textContent);
  });

  var grand = matVal + laborTotal;
  grandTotalValue = grand;

  document.getElementById('grandTotal').textContent = fmtCurrency(grand);
  document.getElementById('grandTotalCustomer').textContent = fmtCurrency(grand);
  document.getElementById('sumMaterials').textContent = fmtCurrency(matVal);

  // Internal cost summary
  var matCost = calcSectionCost('materialsBody');
  var grossProfit = grand - matCost;
  var margin = grand > 0 ? (grossProfit / grand * 100) : 0;

  document.getElementById('sumCostMaterials').textContent = fmtCurrency(matCost);
  document.getElementById('grossProfit').textContent = fmtCurrency(grossProfit);
  document.getElementById('marginPct').textContent = margin.toFixed(1) + '%';
  updateDeposit();
}


/* -- Scope of Work Snippets ---------------------------- */
var _scopeSnippets = {
  gelcoat:   'Gelcoat Repair:\nGrind out damaged gelcoat to sound fiberglass laminate. Thoroughly clean and prep the area using styrene/acetone solvent. Apply color-matched marine gelcoat mixed with appropriate catalyst and PVA curing agent. Block sand repaired area progressively from 400-grit up to 2000-grit compound. Machine buff and polish to match the factory gloss and profile of the surrounding hull.',
  spider:    'Spider Cracks (Stress Cracks):\nV-groove cracks down to the laminate to relieve stress points. Fill with reinforced compound, sand flush, apply color-matched gelcoat, and buff to blend with the surrounding surface.',
  paint:     'Full Paint Job (Awlcraft 2000):\nDe-wax and chemically clean all surfaces. Machine sand existing coating to create a mechanical bond profile. Repair minor surface imperfections using marine fairing compound. Apply multiple coats of high-build epoxy primer, followed by block sanding to ensure a perfectly flat surface. Apply 3 cross-coats of Awlcraft 2000 acrylic urethane topcoat via professional spray equipment under controlled environmental conditions to achieve a high-gloss, durable marine finish.',
  buff:      'Hull Buff & Wax (Oxidation Removal):\nMachine compound hull surfaces using heavy-cut wool pads to remove oxidation. Follow with a fine finishing polish to restore depth, and seal with premium marine paste wax or ceramic coating.',
  fiberglass:'Fiberglass Repair:\nGrind back fractured laminate to a 12:1 bevel ratio to ensure structural bonding. Wipe down area with chemical solvent to remove contaminants. Lay up alternating layers of marine-grade biaxial fiberglass cloth saturated with high-strength resin system. Allow full cure cycle before rough-fairing the surface with structural epoxy compound to restore original hull lines and strength profiles.',
  keel:      'Keel Repair:\nGrind back damaged or gouged keel area to clean structure. Rebuild the keel line with high-strength biaxial cloth and vinyl ester/epoxy resin. Fair, barrier coat, and touch up bottom paint or gelcoat.',
  transom:   'Transom Core Replacement:\nRemove top skin or outer skin to access rotted wood core. Excavate degraded material, clean the inner skin, and laminate a new high-density foam or marine plywood core. Re-glass with heavy structural laminate.',
  stringer:  'Stringer / Bulkhead Repair:\nGrind away fractured or delaminated fiberglass tabbing around structural members. Prep surfaces, inject structural adhesive or replace rotted wood, and re-tab to the hull using heavy biaxial glass.',
  rubrail:   'Rub Rail Replacement:\nRemove old rub rail and scrape away old sealant. Seal old fastener holes, bed the new track in marine polyurethane sealant (3M 5200/4200), and insert the new vinyl insert or stainless steel track.',
  thruhull:  'Thru-Hull / Seacock Replacement:\nRemove corroded or damaged fitting. Sand and clean the fiberglass backing area. Install a new marine-grade thru-hull valve bedded in marine polyurethane sealant, tightening to factory safety torque specs.'
};

function insertScopeSnippet(sel) {
  var key = sel.value;
  if (!key) return;
  var ta = document.getElementById('scopeNotes');
  if (!ta) return;
  var text = _scopeSnippets[key] || '';
  ta.value += (ta.value ? '\n\n' : '') + text;
  sel.value = ''; // reset dropdown
  ta.focus();
}

/* -- Deposit Calculator --------------------------------- */
function updateDeposit() {
  var toggle  = document.getElementById('depositToggle');
  var pctSel  = document.getElementById('depositPct');
  var custom  = document.getElementById('depositCustomPct');
  var block   = document.getElementById('depositSummaryBlock');
  if (!toggle || !block) return;

  // Show/hide custom input
  if (pctSel.value === 'custom') {
    custom.classList.remove('d-none');
  } else {
    custom.classList.add('d-none');
  }

  if (!toggle.checked) {
    block.classList.add('d-none');
    return;
  }

  var pct = pctSel.value === 'custom'
    ? (parseFloat(custom.value) || 0)
    : parseFloat(pctSel.value);

  if (pct <= 0) { block.classList.add('d-none'); return; }

  var deposit  = grandTotalValue * (pct / 100);
  var balance  = grandTotalValue - deposit;

  document.getElementById('depositLabel').textContent  = 'Deposit Required (' + pct + '%)';
  document.getElementById('depositAmount').textContent  = fmtCurrency(deposit);
  document.getElementById('depositBalance').textContent = fmtCurrency(balance);
  block.classList.remove('d-none');
}

function showDepositCalc(show) {
  var block = document.getElementById('depositCalcBlock');
  if (block) {
    if (show) block.classList.remove('d-none');
    else      block.classList.add('d-none');
  }
  if (!show) {
    var summaryBlock = document.getElementById('depositSummaryBlock');
    if (summaryBlock) summaryBlock.classList.add('d-none');
    var toggle = document.getElementById('depositToggle');
    if (toggle) toggle.checked = false;
  }
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

/* -- Auth (stub - replace with real backend) -- */
/* doLogin / doLogout / doSignup / doGoogleLogin are defined in auth.js */

/* -- Auth tab switcher -- */
function switchAuthTab(tab) {
  document.getElementById('authPanelLogin').style.display  = tab === 'login'  ? '' : 'none';
  document.getElementById('authPanelSignup').style.display = tab === 'signup' ? '' : 'none';
  document.getElementById('tabLogin').classList.toggle('active',  tab === 'login');
  document.getElementById('tabSignup').classList.toggle('active', tab === 'signup');
}

/* -- Save / Load drafts (Pro, Supabase) -- */
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
            '<div>' + escHtml(row.estimate_number) + ' - ' + escHtml((row.customer_first || '') + ' ' + (row.customer_last || '')) + '</div>' +
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
  if (document.getElementById('clientCompany')) document.getElementById('clientCompany').value = data.clientCompany || '';
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
  // Restore materials
  document.getElementById('materialsBody').innerHTML = '';
  (data.materials || []).forEach(function (item) {
    addRow('materialsBody', 'materialsMarkup', 'materialsSubtotal', 'sumMaterials', item);
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

/* -- Collect estimate data -- */
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
    clientCompany: document.getElementById('clientCompany') ? document.getElementById('clientCompany').value : '',
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
    grandTotal: grandTotalValue,
    materials: materials,
    tasks: tasks,
    company: (typeof getProfile === 'function' && getProfile()) ? (getProfile().company_name || 'Think & Engage LLC') : 'Think & Engage LLC',
    userEmail: (typeof getUser === 'function' && getUser()) ? getUser().email : null,
    tier: (typeof getProfile === 'function' && getProfile()) ? (getProfile().tier || 'free') : 'free',
    loggedAt: new Date().toISOString()
  };
}

/* -- Database logging (stub - wire to backend API) -- */
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

  /* -- BACKEND STUB --
     Replace this fetch with your real Hostinger API endpoint.
     The endpoint should:
       1. Save the estimate JSON to your database
       2. Create a Trello card in the correct board based on data.company
          - Think & Engage LLC -> TE board, "Estimate Sent" column
          - Daytona Marine Group -> DMG board, "Estimate Sent" column
     Example:
       fetch('https://chemcalc.co/api/log-estimate.php', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
       }).then(r => r.json()).then(res => { ... });
  -- END STUB -- */

  // Simulate success for now
  setTimeout(function () {
    statusEl.textContent = 'OK Logged successfully! Trello card will be created when backend is connected.';
    statusEl.style.color = '#7ed47e';
    // Also save to localStorage as backup
    localStorage.setItem('est_log_' + data.estimateNumber, JSON.stringify(data));
  }, 800);
}

/* -- Export / Share -- */
function exportPDF() {
  var pro = _checkPro();
  // Build filename: [Client Name] - [Mode ]Estimate [EstNum] - [Date].pdf
  var estNum     = (document.getElementById('estimateNumber') || {}).value || 'EST';
  var companyName = ((document.getElementById('clientCompany') || {}).value || '').trim();
  var firstName   = (document.getElementById('clientFirst')    || {}).value.trim();
  var lastName    = (document.getElementById('clientLast')     || {}).value.trim();
  var clientName  = companyName || (firstName + ' ' + lastName).trim() || 'Client';
  var today      = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  var modePrefix = currentPrintStyle === 'internal' ? 'Internal '
                 : currentPrintStyle === 'itemized'  ? 'Itemized '
                 : '';
  var prevTitle = document.title;
  document.title = clientName + ' - ' + modePrefix + 'Estimate ' + estNum + ' - ' + today;

  // Flatten numbered scope lines to comma-separated for print
  var scopeOriginals = [];
  document.querySelectorAll('.repair-scope-textarea, #scopeNotes').forEach(function(ta) {
    scopeOriginals.push({ el: ta, val: ta.value });
    if (ta.value.trim()) {
      ta.value = ta.value
        .split('\n')
        .map(function(line) { return line.replace(/^\d+\.\s*/, '').trim(); })
        .filter(function(line) { return line.length > 0; })
        .join(', ');
    }
  });

  function afterPrint() {
    document.title = prevTitle;
    // Restore original scope text
    scopeOriginals.forEach(function(o) { o.el.value = o.val; });
    window.removeEventListener('afterprint', afterPrint);
  }
  window.addEventListener('afterprint', afterPrint);

  if (pro) {
    document.body.classList.add('pro-user');
    document.body.classList.remove('free-user');
    if (currentPrintStyle === 'summary') {
      setView('customer');
      setTimeout(function () { window.print(); }, 150);
    } else {
      window.print();
    }
  } else {
    document.body.classList.add('free-user');
    document.body.classList.remove('pro-user');
    setView('customer');
    setTimeout(function () { window.print(); }, 150);
  }
}

function shareEstimate() {
  var data = collectEstimateData();
  var title = 'Repair Estimate ' + data.estimateNumber;
  var clientDisplay = (data.clientCompany || '').trim() || ((data.clientFirst || '') + ' ' + (data.clientLast || '')).trim() || 'Client';
  var text = 'Marine Repair Estimate for ' + clientDisplay +
    '\nVessel: ' + data.boatYear + ' ' + data.boatMake + ' ' + data.boatModel +
    '\nTotal: ' + fmtCurrency(data.grandTotal) +
    '\nValid until: ' + data.estimateValidUntil;

  if (navigator.share) {
    // Web Share API - works on mobile (iMessage, WhatsApp, Email, etc.)
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
    if (document.getElementById('clientCompany')) document.getElementById('clientCompany').value = '';
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
    document.getElementById('tasksContainer').innerHTML = '';
    taskCounter = 0;
    document.getElementById('materialsSubtotal').textContent = '$0.00';
    document.getElementById('expiryWarning').classList.add('d-none');
    initEstimate();
    updateSummary();
  }
}

/* -- Modal helpers -- */
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

/* -- Utilities -- */
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

/* ============================================================
   TASK STARTER MODAL
   ============================================================ */

var _userTemplates    = [];   // in-memory cache of user's saved templates
var _tsTemplatesLoaded = false;

/* -- Open modal (Pro-gated) -------------------------------- */
function openTaskStarter() {
  var taskCount = document.querySelectorAll('.repair-card').length;
  var pro = _checkPro();
  if (!pro && taskCount >= 5) { openModal('upgradeModal'); return; }
  tsShowTab('presets');
  tsRenderPresets();
  if (pro) tsLoadUserTemplates();
  openModal('taskStarterModal');
}

/* -- Tab switcher ------------------------------------------ */
function tsShowTab(tab) {
  document.getElementById('tsPanelPresets').style.display = tab === 'presets' ? '' : 'none';
  document.getElementById('tsPanelMine').style.display    = tab === 'mine'    ? '' : 'none';
  document.getElementById('tsTabPresets').classList.toggle('active', tab === 'presets');
  document.getElementById('tsTabMine').classList.toggle('active',    tab === 'mine');
}

/* -- Render shared presets grid ---------------------------- */
function tsRenderPresets() {
  var grid = document.getElementById('tsPresetGrid');
  if (!grid || typeof TASK_PRESETS === 'undefined') return;

  // Group by category
  var categories = {};
  TASK_PRESETS.forEach(function(p) {
    var cat = p.category || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(p);
  });

  var html = '';
  Object.keys(categories).forEach(function(cat) {
    html += '<div class="ts-category-label">' + escHtml(cat) + '</div>';
    html += '<div class="ts-row">';
    categories[cat].forEach(function(p, i) {
      var idx = TASK_PRESETS.indexOf(p);
      html +=
        '<div class="ts-card" onclick="tsApplyPreset(' + idx + ')">' +
          '<div class="ts-card-icon">' + (p.icon || '') + '</div>' +
          '<div class="ts-card-name">' + escHtml(p.name) + '</div>' +
          '<div class="ts-card-desc">' + escHtml(p.description || '') + '</div>' +
        '</div>';
    });
    html += '</div>';
  });
  grid.innerHTML = html;
}

/* -- Apply a shared preset --------------------------------- */
function tsApplyPreset(idx) {
  var preset = (typeof TASK_PRESETS !== 'undefined') ? TASK_PRESETS[idx] : null;
  if (!preset) return;
  closeModal('taskStarterModal');
  addRepairTask(preset.name, preset.taskRows);
  mergePresetMaterials(preset);
  // Populate scope textarea with steps
  if (preset.scopeSteps && preset.scopeSteps.length) {
    var taskId = taskCounter; // addRepairTask already incremented it
    var scopeEl = document.getElementById('repairScope' + taskId);
    if (scopeEl) {
      scopeEl.value = preset.scopeSteps.map(function(s, i) {
        return (i + 1) + '. ' + s;
      }).join('\n');
      // Show the scope textarea
      var toggle = scopeEl.previousElementSibling;
      if (toggle && toggle.classList.contains('repair-scope-toggle')) {
        scopeEl.style.display = 'block';
        toggle.textContent = '- Hide scope note';
      }
    }
  }
}

/* -- Merge preset materials into existing sections -------- */
function mergePresetMaterials(preset) {
  function mergeRows(bodyId, markupId, subtotalId, sumId, items) {
    if (!items || !items.length) return;
    items.forEach(function(item) {
      // Look for an existing row with the same item name (case-insensitive)
      var existing = null;
      document.querySelectorAll('#' + bodyId + ' tr').forEach(function(tr) {
        var nameEl = tr.querySelector('.item-name-input');
        if (nameEl && nameEl.value.trim().toLowerCase() === item.name.trim().toLowerCase()) {
          existing = tr;
        }
      });
      if (existing) {
        // Add 0.5 to qty of existing row
        var qtyInput = existing.querySelector('.qty-input');
        if (qtyInput) {
          qtyInput.value = Math.round((parseFloat(qtyInput.value) || 0) * 100 + 50) / 100;
          recalcRow(qtyInput);
        }
      } else {
        // Add as a new row with preset qty
        addRow(bodyId, markupId, subtotalId, sumId, item);
      }
    });
  }
  mergeRows('materialsBody', 'materialsMarkup', 'materialsSubtotal', 'sumMaterials', preset.materialRows);
}

/* -- Blank task -------------------------------------------- */
function tsPickBlank() {
  closeModal('taskStarterModal');
  addRepairTask();
}

/* -- Load user templates from Supabase --------------------- */
async function tsLoadUserTemplates() {
  if (!_sb) return;
  var { data: { session } } = await _sb.auth.getSession();
  if (!session) { tsRenderMyTemplates(); return; }
  var { data, error } = await _sb
    .from('user_task_templates')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('Template load error:', error.message); return; }
  _userTemplates = data || [];
  _tsTemplatesLoaded = true;
  tsRenderMyTemplates();
}

/* -- Render My Templates tab ------------------------------- */
function tsRenderMyTemplates() {
  var grid  = document.getElementById('tsMyGrid');
  var empty = document.getElementById('tsMyEmpty');
  if (!grid) return;
  if (_userTemplates.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = '<div class="ts-row">' + _userTemplates.map(function(t) {
    var rows = t.task_rows ? JSON.parse(typeof t.task_rows === 'string' ? t.task_rows : JSON.stringify(t.task_rows)) : [];
    var rowCount = rows.length;
    return (
      '<div class="ts-card ts-card-mine">' +
        '<div class="ts-card-icon">&#9733;</div>' +
        '<div class="ts-card-name">' + escHtml(t.name) + '</div>' +
        '<div class="ts-card-desc">' + rowCount + ' step' + (rowCount !== 1 ? 's' : '') + '</div>' +
        '<div class="ts-card-actions">' +
          '<button class="ts-use-btn" onclick="tsApplyUserTemplate(\'' + t.id + '\')">Use</button>' +
          '<button class="ts-del-btn" onclick="tsDeleteUserTemplate(\'' + t.id + '\', event)">&#10005;</button>' +
        '</div>' +
      '</div>'
    );
  }).join('') + '</div>';
}

/* -- Apply a user template --------------------------------- */
function tsApplyUserTemplate(id) {
  var t = _userTemplates.find(function(x) { return x.id === id; });
  if (!t) return;
  closeModal('taskStarterModal');
  var rows = t.task_rows ? (typeof t.task_rows === 'string' ? JSON.parse(t.task_rows) : t.task_rows) : [];
  addRepairTask(t.name, rows);
  // Populate scope textarea with saved steps
  if (t.scope_steps) {
    var taskId = taskCounter;
    var scopeEl = document.getElementById('repairScope' + taskId);
    if (scopeEl) {
      scopeEl.value = t.scope_steps;
      var toggle = scopeEl.previousElementSibling;
      if (toggle && toggle.classList.contains('repair-scope-toggle')) {
        scopeEl.style.display = 'block';
        toggle.textContent = '- Hide scope note';
      }
    }
  }
}

/* -- Save current task card as a user template ------------- */
async function saveTaskAsTemplate(cardId) {
  if (!_checkPro()) { openModal('upgradeModal'); return; }
  if (!_sb) return;
  var { data: { session } } = await _sb.auth.getSession();
  if (!session) { openModal('loginModal'); return; }

  var card = document.getElementById('repairCard' + cardId);
  if (!card) return;

  var nameInput = card.querySelector('.repair-name-input');
  var tName = nameInput ? nameInput.value.trim() : 'My Template';
  if (!tName) tName = 'My Template';

  // Collect task rows
  var rows = [];
  card.querySelectorAll('#taskTable' + cardId + ' tbody tr').forEach(function(tr) {
    var n = tr.querySelector('input[type="text"]');
    var h = tr.querySelector('.task-hours');
    rows.push({ name: n ? n.value : '', hours: parseFloat(h ? h.value : 0) || 0 });
  });

  // Collect scope text
  var scopeEl = document.getElementById('repairScope' + cardId);
  var scopeText = scopeEl ? scopeEl.value.trim() : '';

  // Duplicate check
  var existing = _userTemplates.find(function(t) {
    return t.name.toLowerCase() === tName.toLowerCase();
  });
  if (existing) {
    if (!confirm('"' + tName + '" already exists in My Templates. Overwrite it?')) return;
    var { error: upErr } = await _sb
      .from('user_task_templates')
      .update({ task_rows: rows, scope_steps: scopeText })
      .eq('id', existing.id);
    if (upErr) { alert('Save failed: ' + upErr.message); return; }
    existing.task_rows  = rows;
    existing.scope_steps = scopeText;
  } else {
    var payload = {
      user_id:     session.user.id,
      name:        tName,
      scope_steps: scopeText || null,
      task_rows:   rows
    };
    var { data: inserted, error: insErr } = await _sb
      .from('user_task_templates')
      .insert(payload)
      .select()
      .single();
    if (insErr) { alert('Save failed: ' + insErr.message); return; }
    _userTemplates.unshift(inserted);
  }

  // Visual feedback on the button
  var btn = card.querySelector('.btn-save-template');
  if (btn) {
    var orig = btn.innerHTML;
    btn.innerHTML = '&#10003; Saved!';
    btn.style.color = '#7ed47e';
    setTimeout(function() { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
  }
}

/* -- Delete a user template -------------------------------- */
async function tsDeleteUserTemplate(id, e) {
  e.stopPropagation();
  if (!confirm('Delete this template?')) return;
  var { error } = await _sb.from('user_task_templates').delete().eq('id', id);
  if (error) { alert('Delete failed: ' + error.message); return; }
  _userTemplates = _userTemplates.filter(function(t) { return t.id !== id; });
  tsRenderMyTemplates();
}
