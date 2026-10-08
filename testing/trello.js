/* ============================================================
   trello.js — ChemCalc Estimator Trello Integration
   Handles: OAuth token flow, board/list picker (all Trello calls go through the `trello` Edge Function),
            Trello card creation (with a link back to the saved estimate).
            Also holds PDF generation (jsPDF) and Supabase Storage upload
            helpers, which addToTrello() does not currently call
   ============================================================ */

/* -- State --------------------------------------------------- */
var _trelloConnected = false; // the browser never holds the Trello key or token, only whether a connection exists
var _trelloKey   = '';        // only while connecting: the key typed into the box, until the token comes back (then cleared)
var _trelloBoardId   = '';
var _trelloBoardName = '';
var _trelloListId    = '';
var _trelloListName  = '';

var _trelloAuthWindow = null;

/* -- Initialise from saved profile --------------------------
   Called by populateBizInfoModal() in estimate.js with the profile from getProfile().
   ----------------------------------------------------------- */
function trelloInit(profile) {
  if (!profile) return;
  _trelloConnected = profile.trello_connected === true; // computed by the database; the key and token are not readable here
  _trelloKey       = '';
  _trelloBoardId   = profile.trello_board_id   || '';
  _trelloBoardName = profile.trello_board_name || '';
  _trelloListId    = profile.trello_list_id    || '';
  _trelloListName  = profile.trello_list_name  || '';
  _trelloRestoreUI();
}

/* -- Restore UI state when modal opens ------------------------
   Connected shows a plain "Trello is connected" line with a Disconnect button and the board/list picker; the key and
   token are never in the page. Not connected shows the key box (left as typed). */
function _trelloRestoreUI() {
  var connected = _trelloConnected;
  var keyEl = document.getElementById('trelloApiKey');
  if (keyEl && connected) keyEl.value = '';
  _trelloShowConnectedUI(connected);

  if (connected && _trelloBoardId) {
    // Restore saved board/list selection
    _trelloSetBoardOption(_trelloBoardId, _trelloBoardName);
    if (_trelloListId) {
      _trelloSetListOption(_trelloListId, _trelloListName);
    }
  }
}

function _trelloShowConnectedUI(connected) {
  var show = function (id, on) { var el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  show('trelloConnectRow', !connected);
  show('trelloConnectedRow', connected);
  show('trelloBoardRow', connected);
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

  _trelloSetStatus('Waiting for Trello authorization\u2026', false);
}

/* -- Step 2: Token received -------------------------------- */
async function _trelloOnTokenReceived(token) {
  // Hand the key and the new token to the server in one call. It checks them with Trello and stores them for this user;
  // from then on the browser holds neither (they are dropped below).
  _trelloSetStatus('Connecting Trello...', false);
  try {
    await _trelloCall({ action: 'connect', apiKey: _trelloKey, token: token });
  } catch (e) {
    _trelloSetStatus('Could not connect Trello: ' + e.message, true);
    return;
  }
  token = '';
  _trelloKey = '';
  _trelloConnected = true;
  var live = (typeof getProfile === 'function') ? getProfile() : null;
  if (live) live.trello_connected = true; // so reopening the modal still shows it connected
  var keyEl = document.getElementById('trelloApiKey');
  if (keyEl) keyEl.value = '';
  _trelloShowConnectedUI(true);
  _trelloSetStatus('Trello connected! Now select your board and list below.', false);
  trelloLoadBoards();
}

/* -- Server calls -----------------------------------------------
   Every Trello request goes through the `trello` Edge Function (supabase/functions/trello), which looks up the signed-in
   user's own credentials itself. Resolves with the parsed answer; rejects with an Error whose message is safe to show. */
async function _trelloCall(body) {
  if (typeof _sb === 'undefined' || !_sb) throw new Error('not signed in');
  var res = await _sb.functions.invoke('trello', { body: body });
  if (res.error) {
    var detail = null;
    try { detail = await res.error.context.json(); } catch (e) { /* no JSON body: a network or gateway failure */ }
    var err = new Error((detail && detail.error) || res.error.message || 'request failed');
    err.code = detail && detail.code;
    if (err.code === 'not_connected') { // the server says there is no connection (e.g. disconnected in another tab)
      _trelloConnected = false;
      _trelloShowConnectedUI(false);
    }
    throw err;
  }
  return res.data || {};
}

/* -- Step 3: Load boards ----------------------------------- */
function trelloLoadBoards() {
  if (!_trelloConnected) {
    _trelloSetStatus('Authorize Trello first.', true);
    return;
  }
  _trelloSetStatus('Loading your boards\u2026', false);
  _trelloCall({ action: 'boards' })
    .then(function (res) {
      var boards = res.boards || [];
      var sel = document.getElementById('trelloBoardSelect');
      if (!sel) return;
      sel.innerHTML = '<option value="">- Select a board -</option>';
      boards.forEach(function (b) {
        var opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name;
        if (b.id === _trelloBoardId) opt.selected = true;
        sel.appendChild(opt);
      });
      _trelloSetStatus('Boards loaded. Select a board.', false);
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

  _trelloCall({ action: 'lists', boardId: _trelloBoardId })
    .then(function (res) {
      var lists = res.lists || [];
      var listSel = document.getElementById('trelloListSelect');
      if (!listSel) return;
      listSel.innerHTML = '<option value="">- Select a list -</option>';
      lists.forEach(function (l) {
        var opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.name;
        if (l.id === _trelloListId) opt.selected = true;
        listSel.appendChild(opt);
      });
      _trelloSetStatus('Lists loaded. Select a list.', false);
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
  // Only the board/list choice. The key and token are written by the server when Trello is connected; the database does not
  // let the browser read or write them, so they are never part of a profile save.
  var boardSel = document.getElementById('trelloBoardSelect');
  var listSel  = document.getElementById('trelloListSelect');

  _trelloBoardId   = boardSel ? boardSel.value                              : _trelloBoardId;
  _trelloBoardName = boardSel ? ((boardSel.value && boardSel.options[boardSel.selectedIndex]) ? boardSel.options[boardSel.selectedIndex].text : '') : _trelloBoardName;
  _trelloListId    = listSel  ? listSel.value                               : _trelloListId;
  _trelloListName  = listSel  ? ((listSel.value && listSel.options[listSel.selectedIndex])  ? listSel.options[listSel.selectedIndex].text  : '') : _trelloListName;

  return {
    trello_board_id:  _trelloBoardId,
    trello_board_name: _trelloBoardName,
    trello_list_id:   _trelloListId,
    trello_list_name: _trelloListName
  };
}

/* -- Disconnect Trello ----------------------------------------
   The server clears the six Trello columns on the user's own profile row (the browser may no longer write the key and token)
   and revokes the token at Trello. Only when that succeeds is the page state cleared and the "not connected" look shown.
   A failure leaves everything as it was and says so. */
async function trelloDisconnect() {
  if (!confirm('Disconnect Trello? Your Trello key and token will be removed from your account. You can connect again at any time.')) return;
  var btn = document.getElementById('trelloDisconnectBtn');
  var cleared = { trello_connected: false, trello_board_id: null, trello_board_name: null, trello_list_id: null, trello_list_name: null };
  var revoked = null;
  var user = (typeof getUser === 'function') ? getUser() : null;

  if (user && typeof _sb !== 'undefined' && _sb) {
    _trelloSetStatus('Disconnecting\u2026', false);
    if (btn) btn.disabled = true;
    var failure = '';
    try {
      var res = await _trelloCall({ action: 'disconnect' });
      revoked = res.revoked;
    } catch (e) {
      failure = (e && e.message) || 'network error';
    }
    if (btn) btn.disabled = false;
    if (failure) {
      console.warn('Trello disconnect error:', failure);
      _trelloSetStatus('Couldn\u2019t disconnect Trello (' + failure + '). Please try again.', true);
      return;
    }
    var live = (typeof getProfile === 'function') ? getProfile() : null;
    if (live) Object.assign(live, cleared); // so reopening the modal shows the disconnected state
  }

  _trelloConnected = false;
  _trelloKey = _trelloBoardId = _trelloBoardName = _trelloListId = _trelloListName = '';
  var keyEl = document.getElementById('trelloApiKey');
  if (keyEl) keyEl.value = '';
  var boardSel = document.getElementById('trelloBoardSelect');
  if (boardSel) boardSel.innerHTML = '<option value="">- Select a board -</option>';
  var listSel = document.getElementById('trelloListSelect');
  if (listSel) listSel.innerHTML = '<option value="">- Select a list -</option>';
  _trelloShowConnectedUI(false);
  _trelloSetStatus('Trello disconnected.' + (revoked === false ? ' Trello could not be told to revoke the old access, so you may also remove "ChemCalc Estimator" in your Trello account settings.' : ''), false);
}

/* -- Auto-save the board/list choice ---------------------------
   Fires from the list picker's onchange, once a board AND a list are both chosen, and writes the four board/list columns
   straight to the user's own profile row (the browser may still write these; the key and token are server-only). Changing
   only the board does not save: the old list belongs to the old board, so saving would store a mismatched pair. The board
   change just loads that board's lists ("Select a list."), and the pair is saved when a list is picked. Business > Save
   Business Info still merges trelloCollectSettings() and does the same write, so the two never disagree. */
async function trelloSaveBoardList() {
  var boardSel = document.getElementById('trelloBoardSelect');
  var listSel  = document.getElementById('trelloListSelect');
  var settings = trelloCollectSettings();
  if (!settings.trello_board_id || !settings.trello_list_id) return; // wait for both
  var user = (typeof getUser === 'function') ? getUser() : null;
  if (!(user && typeof _sb !== 'undefined' && _sb)) {
    _trelloSetStatus('Sign in to save your board and list.', true);
    return;
  }

  _trelloSetStatus('Saving board and list\u2026', false);
  if (boardSel) boardSel.disabled = true;
  if (listSel)  listSel.disabled  = true;
  var failure = '';
  try {
    var res = await _sb.from('profiles').update(settings).eq('id', user.id);
    if (res && res.error) failure = res.error.message || 'save failed';
  } catch (e) {
    failure = (e && e.message) || 'network error';
  }
  if (boardSel) boardSel.disabled = false;
  if (listSel)  listSel.disabled  = false;
  var live = (typeof getProfile === 'function') ? getProfile() : null;
  if (failure) {
    console.warn('Trello board/list save error:', failure);
    // Nothing was saved, so fall back to what is saved: Add to Trello reads these four values, and it must not use a choice that
    // never reached the account. The list picker goes back to its placeholder because choosing the same list again fires no
    // change event, so "try again" would otherwise do nothing; picking the list again saves it.
    _trelloBoardId   = (live && live.trello_board_id)   || '';
    _trelloBoardName = (live && live.trello_board_name) || '';
    _trelloListId    = (live && live.trello_list_id)    || '';
    _trelloListName  = (live && live.trello_list_name)  || '';
    if (listSel) listSel.value = '';
    _trelloSetStatus('Couldn\u2019t save board and list (' + failure + '). Choose the list again to retry.', true);
    return;
  }
  if (live) Object.assign(live, settings); // so reopening the modal still shows the saved choice
  _trelloSetStatus('Board and list saved.', false);
}

/* -- Main: Add to Trello ----------------------------------- */
async function addToTrello() {
  if (!_trelloConnected) {
    alert('Please set up your Trello connection in My Business Info first.');
    return;
  }
  if (!_trelloListId) {
    alert('Please select a Trello board and list in My Business Info first.');
    return;
  }

  var statusEl = document.getElementById('trelloSendStatus');
  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }

  setStatus('Saving estimate\u2026');

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

  // 2. Build card content
  var data = (typeof collectEstimateData === 'function') ? collectEstimateData() : {};
  var clientName = ((data.clientFirst || '') + ' ' + (data.clientLast || '')).trim() || 'Unknown Client';
  var vessel = [data.boatYear, data.boatMake, data.boatModel].filter(Boolean).join(' ') || 'Unknown Vessel';
  var cardName = (data.estimateNumber || 'EST') + ' - ' + clientName + ' | ' + vessel;

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
  descLines.push('[View Estimate on ChemCalc](' + estimateLink + ')');

  var desc = descLines.join('\n');

  // 3. Create Trello card
  setStatus('Creating Trello card\u2026');
  try {
    var cardRes = await _trelloCall({ action: 'card', idList: _trelloListId, name: cardName, desc: desc });
    var card = cardRes.card;

    // Save the new card's id back onto the estimate row, so history.html can show its "in Trello" badge.
    // The card already exists at this point, so a failed write here only logs a warning and never
    // changes the alert below. (Supabase returns errors instead of throwing, hence the .error check.)
    if (estimateUUID && card && card.id) {
      try {
        var linkResult = await _sb.from('estimates').update({
          trello_card_id: card.id,
          trello_synced_at: new Date().toISOString()
        }).eq('id', estimateUUID);
        if (linkResult && linkResult.error) console.warn('Failed to save Trello card id back to estimate:', linkResult.error);
      } catch (e) {
        console.warn('Failed to save Trello card id back to estimate:', e);
      }
    }

    setStatus('');
    alert('Card added to Trello: "' + _trelloListName + '" on "' + _trelloBoardName + '"');
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
  // One line at a time, with a page check before each: a single pdf.text(lines) call cannot break across
  // pages, so any block taller than the space left drew its tail off the bottom edge and lost it.
  function drawParagraph(lines, lineHeight) {
    lines.forEach(function (line) {
      checkPage(lineHeight);
      pdf.text(line, ML, y);
      y += lineHeight;
    });
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
  pdf.text(d.estimateNumber   || '-', ML,             y);
  pdf.text(d.estimateDate     || '-', ML + cols4,     y);
  pdf.text(d.estimateValidUntil || '-', ML + cols4*2, y);
  pdf.text('$' + (d.hourlyRate || '0') + '/hr', ML + cols4*3, y);
  y += 12;

  // -- CLIENT INFO -------------------------------------------
  sectionTitle('Client Information');
  var clientName = ((d.clientFirst || '') + ' ' + (d.clientLast || '')).trim() || '-';
  var cols2 = CW / 2;
  // Company Name first, as on the page (optional: no company, no line). Wrapped, so a long name stays inside the margins.
  if ((d.clientCompany || '').trim()) {
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136);
    pdf.text('Company Name', ML, y);
    y += 9;
    pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17);
    drawParagraph(pdf.splitTextToSize(d.clientCompany.trim(), CW), 9);
  }
  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136);
  pdf.text('Name',  ML,         y);
  pdf.text('Phone', ML + cols2, y);
  y += 9;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17);
  pdf.text(clientName,         ML,         y);
  pdf.text(d.clientPhone || '-', ML + cols2, y);
  y += 9;
  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136);
  pdf.text('Email', ML, y);
  y += 9;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17);
  drawParagraph(pdf.splitTextToSize(d.clientEmail || '-', CW), 9);
  y += 3;

  // -- VESSEL INFO -------------------------------------------
  sectionTitle('Vessel Information');
  var vessel = [d.boatYear, d.boatMake, d.boatModel].filter(Boolean).join(' ') || '-';
  var cols3 = CW / 3;
  pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(136, 136, 136);
  pdf.text('Vessel',     ML,          y);
  pdf.text('Boat Name',  ML + cols3,  y);
  pdf.text('HIN',        ML + cols3*2, y);
  y += 9;
  pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(17, 17, 17);
  pdf.text(vessel,              ML,           y);
  pdf.text(d.boatName  || '-',  ML + cols3,   y);
  pdf.text(d.boatHIN   || '-',  ML + cols3*2, y);
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
        pdf.text(totalHrs.toFixed(1) + ' hrs  x  $' + rate2 + '/hr  =  ' + fmt(totalHrs * rate2), ML, y);
        y += 14;
      }

      // Per-task scope note
      if (task.scope) {
        checkPage(16);
        pdf.setFontSize(8); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(85, 85, 85);
        var scopeLines = pdf.splitTextToSize(task.scope, CW);
        drawParagraph(scopeLines, 10);
        y += 4;
      }
      y += 4;
    });
  }

  // -- SCOPE OF WORK -----------------------------------------
  if (isPro && d.scopeNotes) { // scope always shown for pro regardless of print style
    checkPage(51); // the title and at least three lines stay together
    sectionTitle('Scope of Work / Notes');
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'italic'); pdf.setTextColor(51, 51, 51);
    var scopeLines2 = pdf.splitTextToSize(d.scopeNotes, CW);
    drawParagraph(scopeLines2, 11);
    y += 8;
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
  var legalText = (isPro && biz && biz.customTerms) ? biz.customTerms : 'THIS PROPOSAL INCLUDES THE CONDITIONS NOTED BELOW. Perfect color match is not guaranteed on repairs. This estimate is valid for 10 days from the date of issue. Actual costs may vary based on conditions discovered during the repair process. Any changes to the scope of work require written approval before proceeding. Client is responsible for material costs, which may be billed separately and upfront. A signed estimate constitutes authorization to proceed with the described work. Think & Engage, LLC is not liable for pre-existing damage, hidden defects, or conditions not visible at the time of estimate. For contracts exceeding $1,000, a 50% deposit is required prior to commencement of work (material costs are separate and billed at cost). The remaining balance is due upon completion of work.';
  var legalLines = pdf.splitTextToSize(legalText, CW);
  // Short terms stay on one page with the signature lines; long ones (a business's own text) flow, drawParagraph pages them
  checkPage((legalLines.length <= 12 ? legalLines.length : 4) * 8 + 50);
  drawParagraph(legalLines, 8);
  y += 10;

  // -- SIGNATURE LINES ---------------------------------------
  checkPage(40);
  var sigW = (CW - 40) / 3;
  var sigLabels = ['Client Signature', 'Date', (isPro && biz && biz.name) ? ('Authorized Representative, ' + biz.name) : 'Authorized Representative, Think & Engage LLC'];
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
  pdf.text('Generated by ChemCalc Marine Repair Estimator  |  chemcalc.co', ML + CW / 2 - 90, PH - 18);

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
