/* ============================================================
   trello.js — ChemCalc Estimator Trello Integration
   Handles: OAuth token flow, board/list picker,
            PDF generation (jsPDF), Supabase Storage upload,
            Trello card creation with PDF attachment
   ============================================================ */

/* ── State ─────────────────────────────────────────────────── */
var _trelloKey   = '';
var _trelloToken = '';
var _trelloBoardId   = '';
var _trelloBoardName = '';
var _trelloListId    = '';
var _trelloListName  = '';

var _trelloAuthWindow = null;

/* ── Initialise from saved profile ──────────────────────────
   Called by auth.js after loadProfile() sets currentProfile.
   ─────────────────────────────────────────────────────────── */
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

/* ── Restore UI state when modal opens ──────────────────────── */
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

/* ── Step 1: Open Trello authorization popup ─────────────── */
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

/* ── Step 2: Token received ──────────────────────────────── */
function _trelloOnTokenReceived(token) {
  _trelloToken = token;
  var tokenEl = document.getElementById('trelloToken');
  if (tokenEl) tokenEl.value = token;
  _trelloShowBoardRow();
  _trelloSetStatus('✓ Trello authorized! Now select your board and list below.', false);
  trelloLoadBoards();
}

/* ── Step 3: Load boards ─────────────────────────────────── */
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
      _trelloSetStatus('✓ Boards loaded. Select a board.', false);
      if (_trelloBoardId) trelloLoadLists();
    })
    .catch(function (err) {
      _trelloSetStatus('Could not load boards: ' + err.message, true);
    });
}

/* ── Step 4: Load lists for selected board ───────────────── */
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
      _trelloSetStatus('✓ Lists loaded. Select a list.', false);
    })
    .catch(function (err) {
      _trelloSetStatus('Could not load lists: ' + err.message, true);
    });
}

/* ── Helper: set a single board option (restore from profile) */
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

/* ── Collect Trello settings from modal (called by saveBusinessInfo) */
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

/* ── Main: Add to Trello ─────────────────────────────────── */
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

  setStatus('Generating PDF…');

  // 1. Generate PDF blob
  var pdfBlob = null;
  try {
    pdfBlob = await _generateEstimatePDF();
  } catch (e) {
    console.error('PDF generation failed:', e);
    // Continue without PDF attachment
  }

  // 2. Upload PDF to Supabase Storage (if blob generated)
  var pdfUrl = null;
  if (pdfBlob) {
    setStatus('Uploading PDF…');
    try {
      pdfUrl = await _uploadPDFToSupabase(pdfBlob);
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

  if (pdfUrl) {
    descLines.push('');
    descLines.push('[📎 View PDF Estimate](' + pdfUrl + ')');
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
      await fetch(attUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          url:  pdfUrl,
          name: (data.estimateNumber || 'estimate') + '.pdf'
        }).toString()
      });
    }

    setStatus('');
    alert('✓ Card added to Trello: "' + _trelloListName + '" on "' + _trelloBoardName + '"');
  } catch (e) {
    setStatus('');
    alert('Failed to create Trello card: ' + e.message);
  }
}

/* ── Generate PDF blob using print-to-blob via iframe ────── */
async function _generateEstimatePDF() {
  // Use jsPDF + html2canvas if available, otherwise return null
  // and let the caller handle gracefully
  if (typeof window.jspdf === 'undefined' && typeof window.jsPDF === 'undefined') {
    return null;
  }

  var jsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;

  // Capture the visible estimate area
  var el = document.querySelector('.container') || document.body;
  var canvas = await html2canvas(el, {
    scale: 1.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  var imgData = canvas.toDataURL('image/jpeg', 0.85);
  var pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  var pageW = pdf.internal.pageSize.getWidth();
  var pageH = pdf.internal.pageSize.getHeight();
  var imgW  = pageW;
  var imgH  = (canvas.height * pageW) / canvas.width;
  var y = 0;

  // Multi-page support
  while (y < imgH) {
    if (y > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, -y, imgW, imgH);
    y += pageH;
  }

  return pdf.output('blob');
}

/* ── Upload PDF blob to Supabase Storage ─────────────────── */
async function _uploadPDFToSupabase(blob) {
  if (!blob) return null;
  var user = (typeof getUser === 'function') ? getUser() : null;
  if (!user) return null;

  var data = (typeof collectEstimateData === 'function') ? collectEstimateData() : {};
  var fileName = (data.estimateNumber || 'estimate').replace(/[^a-zA-Z0-9\-_]/g, '_') + '_' + Date.now() + '.pdf';
  var path = user.id + '/' + fileName;

  var result = await _sb.storage
    .from('estimates')
    .upload(path, blob, { contentType: 'application/pdf', upsert: true });

  if (result.error) throw new Error(result.error.message);

  var publicUrl = _sb.storage.from('estimates').getPublicUrl(path);
  return publicUrl.data.publicUrl;
}
