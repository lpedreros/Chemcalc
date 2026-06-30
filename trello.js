/* ============================================================
   trello.js — ChemCalc Estimator Trello Integration
   Handles: OAuth token flow, board/list picker,
            PDF generation (jsPDF), Supabase Storage upload,
            Trello card creation with PDF attachment
   ============================================================ */

/* -- State --------------------------------------------------- */
var _trelloKey   = '';
var _trelloToken = '';
var _trelloBoardId   = '';
var _trelloBoardName = '';
var _trelloListId    = '';
var _trelloListName  = '';

var _trelloAuthWindow = null;

/* -- Initialise from saved profile --------------------------
   Called by auth.js after loadProfile() sets currentProfile.
   ----------------------------------------------------------- */
function trelloInit(profile) {
  if (!profile) return;
  _trelloKey       = profile.trello_api_key   || '';
  _trelloToken     = profile.trello_token      || '';
  _trelloBoardId   = profile.trello_board_id   || '';
  _trelloBoardName = profile.trello_board_name || '';
  _trelloListId    = profile.trello_list_id    || '';
  _trelloListName  = profile.trello_list_name  || '';
  _trelloRestoreUI();
}

/* -- Restore UI state when modal opens ------------------------ */
function _trelloRestoreUI() {
  var keyEl   = document.getElementById('trelloApiKey');
  var tokenEl = document.getElementById('trelloToken');
  if (keyEl)   keyEl.value   = _trelloKey;
  if (tokenEl) tokenEl.value = _trelloToken;

  if (_trelloKey && _trelloToken) {
    _trelloShowBoardRow();
    // Restore saved board/list selection
    if (_trelloBoardId) {
      _trelloSetBoardOption(_trelloBoardId, _trelloBoardName);
      if (_trelloListId) {
        _trelloSetListOption(_trelloListId, _trelloListName);
      }
    }
  }
}

function _trelloShowTokenRow() {
  var r = document.getElementById('trelloTokenRow');
  if (r) r.style.display = '';
}

function _trelloShowBoardRow() {
  var r = document.getElementById('trelloTokenRow');
  var b = document.getElementById('trelloBoardRow');
  if (r) r.style.display = '';
  if (b) b.style.display = '';
}

function _trelloSetStatus(msg, isError) {
  var el = document.getElementById('trelloStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'trello-status' + (isError ? ' trello-error' : ' trello-ok');
}

/* -- Step 1: Open Trello authorization popup --------------- */
function trelloAuthorize() {
  var keyEl = document.getElementById('trelloApiKey');
  var key = keyEl ? keyEl.value.trim() : '';
  if (!key) {
    _trelloSetStatus('Please enter your Trello API key first.', true);
    return;
  }
  _trelloKey = key;

  var returnUrl = encodeURIComponent(window.location.origin + window.location.pathname);
  var authUrl = 'https://trello.com/1/authorize' +
    '?expiration=never' +
    '&scope=read,write' +
    '&response_type=token' +
    '&key=' + encodeURIComponent(key) +
    '&name=' + encodeURIComponent('ChemCalc Estimator') +
    '&callback_method=fragment' +
    '&return_url=' + returnUrl;

  // Open popup — token will arrive via URL hash on the return page
  var w = 600, h = 700;
  var left = Math.round((screen.width  - w) / 2);
  var top  = Math.round((screen.height - h) / 2);
  _trelloAuthWindow = window.open(
    authUrl,
    'TrelloAuth',
    'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top
  );

  // Poll until the popup navigates back to our domain with #token=...
  var poll = setInterval(function () {
    try {
      var hash = _trelloAuthWindow.location.hash;
      if (hash && hash.indexOf('token=') !== -1) {
        clearInterval(poll);
        var token = hash.replace('#token=', '').split('&')[0];
        _trelloAuthWindow.close();
        _trelloOnTokenReceived(token);
      }
    } catch (e) {
      // Cross-origin — popup is still on trello.com, keep polling
    }
    if (_trelloAuthWindow && _trelloAuthWindow.closed) {
      clearInterval(poll);
    }
  }, 500);

  _trelloSetStatus('Waiting for Trello authorization…', false);
}

/* -- Step 2: Token received -------------------------------- */
function _trelloOnTokenReceived(token) {
  _trelloToken = token;
  var tokenEl = document.getElementById('trelloToken');
  if (tokenEl) tokenEl.value = token;
  _trelloShowBoardRow();
  _trelloSetStatus('? Trello authorized! Now select your board and list below.', false);
  trelloLoadBoards();
}

/* -- Step 3: Load boards ----------------------------------- */
function trelloLoadBoards() {
  if (!_trelloKey || !_trelloToken) {
    _trelloSetStatus('Authorize Trello first.', true);
    return;
  }
  _trelloSetStatus('Loading your boards…', false);
  var url = 'https://api.trello.com/1/members/me/boards' +
    '?fields=id,name,closed' +
    '&filter=open' +
    '&key=' + encodeURIComponent(_trelloKey) +
    '&token=' + encodeURIComponent(_trelloToken);

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (boards) {
      var sel = document.getElementById('trelloBoardSelect');
      if (!sel) return;
      sel.innerHTML = '<option value="">— Select a board —</option>';
      boards.forEach(function (b) {
        var opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        if (b.id === _trelloBoardId) opt.selected = true;
        sel.appendChild(opt);
      });
      _trelloSetStatus('? Boards loaded. Select a board.', false);
      if (_trelloBoardId) trelloLoadLists();
    })
    .catch(function (err) {
      _trelloSetStatus('Could not load boards: ' + err.message, true);
    });
}

/* -- Step 4: Load lists for selected board ----------------- */
function trelloLoadLists() {
  var sel = document.getElementById('trelloBoardSelect');
  if (!sel || !sel.value) return;
  _trelloBoardId   = sel.value;
  _trelloBoardName = sel.options[sel.selectedIndex].text;

  var url = 'https://api.trello.com/1/boards/' + _trelloBoardId + '/lists' +
    '?filter=open' +
    '&fields=id,name' +
    '&key=' + encodeURIComponent(_trelloKey) +
    '&token=' + encodeURIComponent(_trelloToken);

  fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (lists) {
      var listSel = document.getElementById('trelloListSelect');
      if (!listSel) return;
      listSel.innerHTML = '<option value="">— Select a list —</option>';
      lists.forEach(function (l) {
        var opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.name;
        if (l.id === _trelloListId) opt.selected = true;
        listSel.appendChild(opt);
      });
      _trelloSetStatus('? Lists loaded. Select a list.', false);
    })
    .catch(function (err) {
      _trelloSetStatus('Could not load lists: ' + err.message, true);
    });
}

/* -- Helper: set a single board option (restore from profile) */
function _trelloSetBoardOption(id, name) {
  var sel = document.getElementById('trelloBoardSelect');
  if (!sel) return;
  // Check if option already exists (from trelloLoadBoards)
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === id) { sel.selectedIndex = i; return; }
  }
  // Otherwise add a placeholder option
  var opt = document.createElement('option');
  opt.value = id; opt.textContent = name; opt.selected = true;
  sel.appendChild(opt);
}

function _trelloSetListOption(id, name) {
  var sel = document.getElementById('trelloListSelect');
  if (!sel) return;
  for (var i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value === id) { sel.selectedIndex = i; return; }
  }
  var opt = document.createElement('option');
  opt.value = id; opt.textContent = name; opt.selected = true;
  sel.appendChild(opt);
}

/* -- Collect Trello settings from modal (called by saveBusinessInfo) */
function trelloCollectSettings() {
  var keyEl    = document.getElementById('trelloApiKey');
  var tokenEl  = document.getElementById('trelloToken');
  var boardSel = document.getElementById('trelloBoardSelect');
  var listSel  = document.getElementById('trelloListSelect');

  _trelloKey       = keyEl    ? keyEl.value.trim()                          : _trelloKey;
  _trelloToken     = tokenEl  ? tokenEl.value.trim()                        : _trelloToken;
  _trelloBoardId   = boardSel ? boardSel.value                              : _trelloBoardId;
  _trelloBoardName = boardSel ? (boardSel.options[boardSel.selectedIndex] ? boardSel.options[boardSel.selectedIndex].text : '') : _trelloBoardName;
  _trelloListId    = listSel  ? listSel.value                               : _trelloListId;
  _trelloListName  = listSel  ? (listSel.options[listSel.selectedIndex]  ? listSel.options[listSel.selectedIndex].text  : '') : _trelloListName;

  return {
    trello_api_key:   _trelloKey,
    trello_token:     _trelloToken,
    trello_board_id:  _trelloBoardId,
    trello_board_name: _trelloBoardName,
    trello_list_id:   _trelloListId,
    trello_list_name: _trelloListName
  };
}

/* -- Main: Add to Trello ----------------------------------- */
async function addToTrello() {
  if (!_trelloKey || !_trelloToken) {
    alert('Please set up your Trello connection in My Business Info first.');
    return;
  }
  if (!_trelloListId) {
    alert('Please select a Trello board and list in My Business Info first.');
    return;
  }

  var statusEl = document.getElementById('trelloSendStatus');
  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  setStatus('Saving estimate…');

  // 0. Auto-save estimate to Supabase to get a shareable UUID
  var estimateUUID = null;
  try {
    if (typeof saveEstimateToSupabase === 'function') {
      var saveResult = await saveEstimateToSupabase((typeof collectEstimateData === 'function') ? collectEstimateData() : {});
      if (saveResult && saveResult.data && saveResult.data.id) {
        estimateUUID = saveResult.data.id;
      }
    }
  } catch (e) {
    console.warn('Auto-save for Trello link failed:', e);
  }

  setStatus('Generating PDF…');

  // 1. Generate PDF blob (respects current print style toggle)
  var printStyle = (typeof currentPrintStyle !== 'undefined') ? currentPrintStyle : 'summary';
  var pdfBlob = null;
  try {
    pdfBlob = await _generateEstimatePDF(printStyle);
  } catch (e) {
    console.error('PDF generation failed:', e);
    // Continue without PDF attachment
  }

  // 2. Upload PDF to Supabase Storage (if blob generated)
  var pdfUrl = null;
  if (pdfBlob) {
    setStatus('Uploading PDF…');
    try {
      pdfUrl = await _uploadPDFToSupabase(pdfBlob, printStyle);
    } catch (e) {
      console.error('PDF upload failed:', e);
    }
  }

  // 3. Build card content
  var data = (typeof collectEstimateData === 'function') ? collectEstimateData() : {};
  var clientName = ((data.clientFirst || '') + ' ' + (data.clientLast || '')).trim() || 'Unknown Client';
  var vessel = [data.boatYear, data.boatMake, data.boatModel].filter(Boolean).join(' ') || 'Unknown Vessel';
  var cardName = (data.estimateNumber || 'EST') + ' — ' + clientName + ' | ' + vessel;

  var descLines = [
    '**Estimate:** ' + (data.estimateNumber || ''),
    '**Date:** ' + (data.estimateDate || ''),
    '**Valid Until:** ' + (data.estimateValidUntil || ''),
    '',
    '**Client:** ' + clientName,
    '**Phone:** ' + (data.clientPhone || ''),
    '**Email:** ' + (data.clientEmail || ''),
    '',
    '**Vessel:** ' + vessel,
    '**HIN:** ' + (data.boatHIN || ''),
    '',
    '**Total:** ' + (typeof fmtCurrency === 'function' ? fmtCurrency(data.grandTotal) : '$' + (data.grandTotal || 0)),
    '',
    '**Scope of Work:**',
    data.scopeNotes || ''
  ];

  // Add task summaries
  if (data.tasks && data.tasks.length) {
    data.tasks.forEach(function (t) {
      if (t.name) {
        var hrs = (t.rows || []).reduce(function (s, r) { return s + (r.hours || 0); }, 0);
        descLines.push('- ' + t.name + ' (' + hrs.toFixed(1) + ' hrs)');
      }
    });
  }

  // Add ChemCalc estimate link (with UUID if available)
  var estimateLink = estimateUUID
    ? 'https://chemcalc.co/estimate.html?draft=' + estimateUUID
    : 'https://chemcalc.co/estimate.html';
  descLines.push('');
  descLines.push('[\ud83d\udd17 View Estimate on ChemCalc](' + estimateLink + ')');

  if (pdfUrl) {
    var pdfLabel = (printStyle === 'itemized') ? '\ud83d\udcce PDF Estimate (Itemized)' : '\ud83d\udcce PDF Estimate (Summary)';
    descLines.push('[' + pdfLabel + '](' + pdfUrl + ')');
  }

  var desc = descLines.join('\n');

  // 4. Create Trello card
  setStatus('Creating Trello card…');
  try {
    var cardUrl = 'https://api.trello.com/1/cards' +
      '?key=' + encodeURIComponent(_trelloKey) +
      '&token=' + encodeURIComponent(_trelloToken);

    var cardBody = new URLSearchParams({
      idList: _trelloListId,
      name:   cardName,
      desc:   desc
    });

    var cardResp = await fetch(cardUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cardBody.toString()
    });

    if (!cardResp.ok) {
      var errText = await cardResp.text();
      throw new Error('Trello API error: ' + errText);
    }

    var card = await cardResp.json();

    // 5. Attach PDF URL as a Trello attachment (if we have one)
    if (pdfUrl && card.id) {
      var attUrl = 'https://api.trello.com/1/cards/' + card.id + '/attachments' +
        '?key=' + encodeURIComponent(_trelloKey) +
        '&token=' + encodeURIComponent(_trelloToken);
      var attSuffix = (printStyle === 'itemized') ? '_itemized' : '';
      await fetch(attUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          url:  pdfUrl,
          name: (data.estimateNumber || 'estimate') + attSuffix + '.pdf'
        }).toString()
      });
    }

    setStatus('');
    alert('? Card added to Trello: "' + _trelloListName + '" on "' + _trelloBoardName + '"');
  } catch (e) {
    setStatus('');
    alert('Failed to create Trello card: ' + e.message);
  }
}

/* -- Generate formatted PDF blob using jsPDF --------------- */
async function _generateEstimatePDF(printStyle) {
  if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
    return null;
  }

  var jsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
  var d = (typeof collectEstimateData === 'function') ? collectEstimateData() : {};
  var biz = (typeof loadBusinessInfo === 'function') ? loadBusinessInfo() : null;
  var isPro = (typeof window.isPro === 'function') ? window.isPro() : false;
  var isItemized = isPro && (printStyle === 'itemized');

  var pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  var PW = pdf.internal.pageSize.getWidth();   // 612
  var PH = pdf.internal.pageSize.getHeight();  // 792
  var ML = 36, MR = 36, MT = 36;               // margins
  var CW = PW - ML - MR;                       // content width = 540
  var y = MT;

  // -- Helpers -----------------------------------------------
  function fmt(v) {
    var n = parseFloat(v) || 0;
    return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function checkPage(needed) {
    if (y + needed > PH - 36) { pdf.addPage(); y = MT; }
  }
  function hline(lw, color) {
    pdf.setLineWidth(lw || 0.5);
    pdf.setDrawColor(color || '#cccccc');
    pdf.line(ML, y, ML + CW, y);
  }
  function sectionTitle(title) {
    checkPage(18);
    pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(85, 85, 85);
    pdf.text(title.toUpperCase(), ML, y);
    y += 2;
    hline(0.5, '#dddddd');
    y += 5;
    pdf.setTextColor(17, 17, 17);
  }

  // -- HEADER ------------------------------------------------
  // Left: company name (pro) or ChemCalc brand (free)
  var headerY = y;
  if (isPro && biz && biz.name) {
    pdf.setFontSize(13); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 17, 17);
    pdf.text(biz.name, ML, headerY + 12);
    var infoY = headerY + 24;
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(68, 68, 68);
    if (biz.tagline)  { pdf.text(biz.tagline,  ML, infoY); infoY += 10; }
    if (biz.phone)    { pdf.text(biz.phone,    ML, infoY); infoY += 10; }
    if (biz.email)    { pdf.text(biz.email,    ML, infoY); infoY += 10; }
    if (biz.website)  { pdf.text(biz.website,  ML, infoY); infoY += 10; }
    if (biz.address)  { pdf.text(biz.address,  ML, infoY); infoY += 10; }
  } else {
    pdf.setFontSize(18); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 17, 17);
    pdf.text('ChemCalc', ML, headerY + 14);
    pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(85, 85, 85);
    pdf.text('MARINE REPAIR ESTIMATOR', ML, headerY + 26);
  }

  // Center: REPAIR ESTIMATE title
  pdf.setFontSize(20); pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 17, 17);
  var titleText = 'REPAIR ESTIMATE';
  var titleW = pdf.getTextWidth(titleText);
  pdf.text(titleText, ML + CW / 2 - titleW / 2, headerY + 14);
  pdf.setFontSize(8); pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(68, 68, 68);
  var metaX = ML + CW / 2;
  var metaY = headerY + 26;
  if (d.estimateNumber) {
    var mw = pdf.getTextWidth('Est #: ' + d.estimateNumber);
    pdf.text('Est #: ' + d.estimateNumber, metaX - mw / 2, metaY); metaY += 10;
  }
  if (d.estimateDate) {
    var mw2 = pdf.getTextWidth('Date: ' + d.estimateDate);
    pdf.text('Date: ' + d.estimateDate, metaX - mw2 / 2, metaY); metaY += 10;
  }
  if (d.estimateValidUntil) {
    var mw3 = pdf.getTextWidth('Valid Until: ' + d.estimateValidUntil);
    pdf.text('Valid Until: ' + d.estimateValidUntil, metaX - mw3 / 2, metaY);
  }

  // Right: chemcalc.co (free) — pro side already done on left
  if (!isPro || !biz || !biz.name) {
    pdf.setFontSize(9); pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(85, 85, 85);
    var urlW = pdf.getTextWidth('chemcalc.co');
    pdf.text('chemcalc.co', ML + CW - urlW, headerY + 14);
  }

  y = Math.max(infoY || (headerY + 50), metaY + 10, headerY + 54);
  pdf.setLineWidth(2); pdf.setDrawColor('#111111');
  pdf.line(ML, y, ML + CW, y);
  y += 10;
  pdf.setTextColor(17, 17, 17);

  // -- ESTIMATE INFO -----------------------------------------
  sectionTitle('Estimate Information');
  var cols4 = CW / 4;
  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136);
  pdf.text('Estimate #',  ML,              y);
  pdf.text('Date',        ML + cols4,      y);
  pdf.text('Valid Until', ML + cols4 * 2,  y);
  pdf.text('Hourly Rate', ML + cols4 * 3,  y);
  y += 9;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17);
  pdf.text(d.estimateNumber   || '—', ML,             y);
  pdf.text(d.estimateDate     || '—', ML + cols4,     y);
  pdf.text(d.estimateValidUntil || '—', ML + cols4*2, y);
  pdf.text('$' + (d.hourlyRate || '0') + '/hr', ML + cols4*3, y);
  y += 12;

  // -- CLIENT INFO -------------------------------------------
  sectionTitle('Client Information');
  var clientName = ((d.clientFirst || '') + ' ' + (d.clientLast || '')).trim() || '—';
  var cols2 = CW / 2;
  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136);
  pdf.text('Name',  ML,         y);
  pdf.text('Phone', ML + cols2, y);
  y += 9;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17);
  pdf.text(clientName,         ML,         y);
  pdf.text(d.clientPhone || '—', ML + cols2, y);
  y += 9;
  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136);
  pdf.text('Email', ML, y);
  y += 9;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17);
  pdf.text(d.clientEmail || '—', ML, y);
  y += 12;

  // -- VESSEL INFO -------------------------------------------
  sectionTitle('Vessel Information');
  var vessel = [d.boatYear, d.boatMake, d.boatModel].filter(Boolean).join(' ') || '—';
  var cols3 = CW / 3;
  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136);
  pdf.text('Vessel',     ML,          y);
  pdf.text('Boat Name',  ML + cols3,  y);
  pdf.text('HIN',        ML + cols3*2, y);
  y += 9;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17);
  pdf.text(vessel,              ML,           y);
  pdf.text(d.boatName  || '—',  ML + cols3,   y);
  pdf.text(d.boatHIN   || '—',  ML + cols3*2, y);
  y += 14;

  // -- TABLE HELPER ------------------------------------------
  function drawTable(headers, colWidths, rows, subtotalLabel, subtotalVal) {
    checkPage(30);
    // Header row
    var rowH = 14;
    pdf.setFillColor(244, 244, 244);
    pdf.rect(ML, y, CW, rowH, 'F');
    pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(51, 51, 51);
    var cx = ML + 4;
    headers.forEach(function (h, i) {
      pdf.text(h.toUpperCase(), cx, y + 9);
      cx += colWidths[i];
    });
    pdf.setLineWidth(0.5); pdf.setDrawColor('#cccccc');
    pdf.line(ML, y + rowH, ML + CW, y + rowH);
    y += rowH;

    // Data rows
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
    pdf.setTextColor(17, 17, 17);
    rows.forEach(function (row) {
      checkPage(14);
      cx = ML + 4;
      row.forEach(function (cell, i) {
        var txt = String(cell || '');
        // Truncate if too wide
        var maxW = colWidths[i] - 6;
        while (pdf.getTextWidth(txt) > maxW && txt.length > 1) txt = txt.slice(0, -1);
        pdf.text(txt, cx, y + 9);
        cx += colWidths[i];
      });
      pdf.setLineWidth(0.3); pdf.setDrawColor('#eeeeee');
      pdf.line(ML, y + 13, ML + CW, y + 13);
      y += 13;
    });

    // Subtotal row
    if (subtotalLabel) {
      checkPage(16);
      pdf.setLineWidth(0.8); pdf.setDrawColor('#cccccc');
      pdf.line(ML, y + 2, ML + CW, y + 2);
      y += 6;
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(51, 51, 51);
      pdf.text(subtotalLabel, ML + 4, y + 8);
      pdf.setTextColor(17, 17, 17);
      var svW = pdf.getTextWidth(subtotalVal);
      pdf.text(subtotalVal, ML + CW - svW - 4, y + 8);
      y += 16;
    }
  }

  // -- MATERIALS TABLE ---------------------------------------
  if (isItemized && d.materials && d.materials.some(function(r){ return r.name; })) {
    sectionTitle('Hard Materials & Chemicals');
    var matRows = d.materials
      .filter(function(r){ return r.name; })
      .map(function(r){
        var retail = r.cost * (1 + (r.markup || 0) / 100);
        var total  = retail * (r.qty || 1);
        return [r.name, fmt(r.cost), r.markup + '%', fmt(retail), String(r.qty || 1), fmt(total)];
      });
    var matSubtotal = d.materials.reduce(function(s, r){
      return s + (r.cost * (1 + (r.markup||0)/100) * (r.qty||1));
    }, 0);
    drawTable(
      ['Item', 'Cost', 'Markup', 'Retail', 'Qty', 'Total'],
      [180, 60, 55, 70, 40, 75],
      matRows,
      'Materials Subtotal', fmt(matSubtotal)
    );
  }

  // -- PAINT TABLE -------------------------------------------
  if (isItemized && d.paint && d.paint.some(function(r){ return r.name; })) {
    sectionTitle('Paint Materials');
    var paintRows = d.paint
      .filter(function(r){ return r.name; })
      .map(function(r){
        var retail = r.cost * (1 + (r.markup || 0) / 100);
        var total  = retail * (r.qty || 1);
        return [r.name, fmt(r.cost), r.markup + '%', fmt(retail), String(r.qty || 1), fmt(total)];
      });
    var paintSubtotal = d.paint.reduce(function(s, r){
      return s + (r.cost * (1 + (r.markup||0)/100) * (r.qty||1));
    }, 0);
    drawTable(
      ['Item', 'Cost', 'Markup', 'Retail', 'Qty', 'Total'],
      [180, 60, 55, 70, 40, 75],
      paintRows,
      'Paint Subtotal', fmt(paintSubtotal)
    );
  }

  // -- REPAIR TASKS ------------------------------------------
  if (d.tasks && d.tasks.length) {
    d.tasks.forEach(function (task) {
      if (!task.name && (!task.rows || !task.rows.some(function(r){ return r.name; }))) return;
      checkPage(30);
      // Task name as mini-header
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 17, 17);
      pdf.text(task.name || 'Repair Task', ML, y);
      y += 4;
      hline(0.5, '#dddddd');
      y += 5;

      if (isItemized && task.rows && task.rows.some(function(r){ return r.name; })) {
        var rate = parseFloat(d.hourlyRate) || 100;
        var taskRows = task.rows
          .filter(function(r){ return r.name; })
          .map(function(r){
            return [r.name, r.hours.toFixed(1) + ' hrs', fmt(r.hours * rate)];
          });
        var taskTotal = task.rows.reduce(function(s, r){ return s + (r.hours * rate); }, 0);
        drawTable(
          ['Task', 'Hours', 'Total'],
          [340, 90, 110],
          taskRows,
          'Labor Subtotal', fmt(taskTotal)
        );
      } else {
        // Summary: just show total hours and cost
        var rate2 = parseFloat(d.hourlyRate) || 100;
        var totalHrs = (task.rows || []).reduce(function(s, r){ return s + (r.hours || 0); }, 0);
        pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(68, 68, 68);
        pdf.text(totalHrs.toFixed(1) + ' hrs  ×  $' + rate2 + '/hr  =  ' + fmt(totalHrs * rate2), ML, y);
        y += 14;
      }

      // Per-task scope note
      if (task.scope) {
        checkPage(16);
        pdf.setFontSize(8); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(85, 85, 85);
        var scopeLines = pdf.splitTextToSize(task.scope, CW);
        pdf.text(scopeLines, ML, y);
        y += scopeLines.length * 10 + 4;
      }
      y += 4;
    });
  }

  // -- SCOPE OF WORK -----------------------------------------
  if (isPro && d.scopeNotes) { // scope always shown for pro regardless of print style
    sectionTitle('Scope of Work / Notes');
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(51, 51, 51);
    var scopeLines2 = pdf.splitTextToSize(d.scopeNotes, CW);
    checkPage(scopeLines2.length * 11 + 10);
    pdf.text(scopeLines2, ML, y);
    y += scopeLines2.length * 11 + 8;
  }

  // -- SUMMARY -----------------------------------------------
  checkPage(80);
  pdf.setLineWidth(1.5); pdf.setDrawColor('#111111');
  pdf.line(ML, y, ML + CW, y);
  y += 8;
  pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(17, 17, 17);

  function summaryRow(label, val) {
    checkPage(14);
    pdf.text(label, ML, y);
    var vw = pdf.getTextWidth(val);
    pdf.setFont('helvetica', 'bold');
    pdf.text(val, ML + CW - vw, y);
    pdf.setFont('helvetica', 'normal');
    y += 12;
  }

  if (isItemized) {
    var matTotal  = (d.materials || []).reduce(function(s,r){ return s + r.cost*(1+(r.markup||0)/100)*(r.qty||1); }, 0);
    var paintTotal = (d.paint || []).reduce(function(s,r){ return s + r.cost*(1+(r.markup||0)/100)*(r.qty||1); }, 0);
    var laborTotal = (d.tasks || []).reduce(function(s, task){
      var rate = parseFloat(d.hourlyRate) || 100;
      return s + (task.rows || []).reduce(function(ts, r){ return ts + (r.hours || 0) * rate; }, 0);
    }, 0);
    if (matTotal  > 0) summaryRow('Materials',      fmt(matTotal));
    if (paintTotal > 0) summaryRow('Paint Materials', fmt(paintTotal));
    if (laborTotal > 0) summaryRow('Labor',           fmt(laborTotal));
    pdf.setLineWidth(0.5); pdf.setDrawColor('#bbbbbb');
    pdf.line(ML, y, ML + CW, y); y += 6;
  } else {
    // Customer summary: per-task lines
    (d.tasks || []).forEach(function(task){
      if (!task.name) return;
      var rate = parseFloat(d.hourlyRate) || 100;
      var total = (task.rows || []).reduce(function(s,r){ return s + (r.hours||0)*rate; }, 0);
      summaryRow(task.name, fmt(total));
    });
    pdf.setLineWidth(0.5); pdf.setDrawColor('#bbbbbb');
    pdf.line(ML, y, ML + CW, y); y += 6;
  }

  // Grand total
  pdf.setFontSize(13); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17);
  pdf.text('ESTIMATE TOTAL', ML, y + 10);
  var gtW = pdf.getTextWidth(fmt(d.grandTotal));
  pdf.setFontSize(14);
  pdf.text(fmt(d.grandTotal), ML + CW - gtW, y + 10);
  y += 22;

  // -- LEGAL -------------------------------------------------
  checkPage(80);
  y += 6;
  pdf.setLineWidth(0.5); pdf.setDrawColor('#dddddd');
  pdf.line(ML, y, ML + CW, y); y += 6;
  pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(102, 102, 102);
  var legalText = 'THIS PROPOSAL INCLUDES THE CONDITIONS NOTED BELOW. Perfect color match is not guaranteed on repairs. This estimate is valid for 10 days from the date of issue. Actual costs may vary based on conditions discovered during the repair process. Any changes to the scope of work require written approval before proceeding. Client is responsible for material costs, which may be billed separately and upfront. A signed estimate constitutes authorization to proceed with the described work. Think & Engage, LLC is not liable for pre-existing damage, hidden defects, or conditions not visible at the time of estimate. For contracts exceeding $1,000, a 50% deposit is required prior to commencement of work (material costs are separate and billed at cost). The remaining balance is due upon completion of work.';
  var legalLines = pdf.splitTextToSize(legalText, CW);
  checkPage(legalLines.length * 8 + 50);
  pdf.text(legalLines, ML, y);
  y += legalLines.length * 8 + 10;

  // -- SIGNATURE LINES ---------------------------------------
  checkPage(40);
  var sigW = (CW - 40) / 3;
  var sigLabels = ['Client Signature', 'Date', 'Authorized Representative, Think & Engage LLC'];
  var sigX = ML;
  pdf.setLineWidth(0.8); pdf.setDrawColor('#333333');
  sigLabels.forEach(function (lbl, i) {
    var sw = i === 1 ? sigW * 0.6 : sigW;
    pdf.line(sigX, y + 18, sigX + sw - 10, y + 18);
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(102, 102, 102);
    pdf.text(lbl, sigX, y + 26);
    sigX += sw + (i === 1 ? sigW * 0.4 + 10 : 20);
  });
  y += 36;

  // -- FOOTER ------------------------------------------------
  pdf.setFontSize(7); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(170, 170, 170);
  pdf.text('Generated by ChemCalc Marine Repair Estimator  ·  chemcalc.co', ML + CW / 2 - 90, PH - 18);

  return pdf.output('blob');
}

/* -- Upload PDF blob to Supabase Storage ------------------- */
async function _uploadPDFToSupabase(blob, printStyle) {
  if (!blob) return null;
  var user = (typeof getUser === 'function') ? getUser() : null;
  if (!user) return null;

  var data = (typeof collectEstimateData === 'function') ? collectEstimateData() : {};
  var baseName = (data.estimateNumber || 'estimate').replace(/[^a-zA-Z0-9\-_]/g, '_');
  var suffix = (printStyle === 'itemized') ? '_itemized' : '';
  var fileName = baseName + suffix + '_' + Date.now() + '.pdf';
  var path = user.id + '/' + fileName;

  var result = await _sb.storage
    .from('estimates')
    .upload(path, blob, { contentType: 'application/pdf', upsert: true });

  if (result.error) throw new Error(result.error.message);

  var publicUrl = _sb.storage.from('estimates').getPublicUrl(path);
  return publicUrl.data.publicUrl;
}
