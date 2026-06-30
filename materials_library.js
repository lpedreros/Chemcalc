/* ============================================================
   materials_library.js
   Saved Materials Library for Pro users
   ============================================================ */

var _matLib = [];          // in-memory cache
var _matLibLoaded = false;

/* Self-contained HTML escaping so this file doesn't depend on estimate.js */
function _libEscHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Load library from Supabase ──────────────────────────── */
async function loadMaterialsLibrary() {
  if (!_sb) return;
  var { data, error } = await _sb
    .from('materials_library')
    .select('*')
    .order('name', { ascending: true });
  if (error) { console.warn('Library load error:', error.message); return; }
  _matLib.length = 0;
  (data || []).forEach(function(item) { _matLib.push(item); });
  _matLibLoaded = true;
  renderLibraryTable();
  // Re-attach typeahead on all existing rows now that _matLib is populated
  document.querySelectorAll('#materialsBody .item-name-input, #paintBody .item-name-input')
    .forEach(function(input) {
      delete input.dataset.typeaheadAttached;
      attachTypeahead(input);
    });
}

/* ── Save a new item ─────────────────────────────────────── */
async function saveLibraryItem(item) {
  var { data: { session } } = await _sb.auth.getSession();
  if (!session) return null;
  var payload = {
    user_id:   session.user.id,
    name:      item.name.trim(),
    unit:      item.unit || 'each',
    cost:      parseFloat(item.cost) || 0,
    markup:    parseFloat(item.markup) || 40,
    item_type: item.item_type || 'material',
    buy_url:   item.buy_url ? item.buy_url.trim() : null
  };
  var { data, error } = await _sb.from('materials_library').insert(payload).select().single();
  if (error) { console.warn('Library save error:', error.message); return null; }
  _matLib.push(data);
  _matLib.sort((a, b) => a.name.localeCompare(b.name));
  renderLibraryTable();
  return data;
}

/* ── Delete an item ──────────────────────────────────────── */
async function deleteLibraryItem(id) {
  var { error } = await _sb.from('materials_library').delete().eq('id', id);
  if (error) { console.warn('Library delete error:', error.message); return; }
  var idx = _matLib.findIndex(i => i.id === id);
  if (idx > -1) _matLib.splice(idx, 1);
  renderLibraryTable();
}

/* ── Update an item ──────────────────────────────────────── */
async function updateLibraryItem(id, fields) {
  var { data, error } = await _sb
    .from('materials_library')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) { console.warn('Library update error:', error.message); return; }
  var idx = _matLib.findIndex(i => i.id === id);
  if (idx > -1) _matLib[idx] = data;
  _matLib.sort((a, b) => a.name.localeCompare(b.name));
  renderLibraryTable();
}

/* ── Render the library manager table ────────────────────── */
function renderLibraryTable() {
  var tbody = document.getElementById('libTableBody');
  if (!tbody) return;
  if (_matLib.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;padding:1rem;">No saved items yet. Add your first item below.</td></tr>';
    return;
  }
  tbody.innerHTML = _matLib.map(item => `
    <tr data-lib-id="${item.id}">
      <td><input class="est-input lib-edit" data-field="name" value="${_libEscHtml(item.name)}" /></td>
      <td>
        <select class="est-input lib-edit" data-field="item_type">
          <option value="material" ${item.item_type==='material'?'selected':''}>Material</option>
          <option value="paint"    ${item.item_type==='paint'   ?'selected':''}>Paint</option>
          <option value="other"    ${item.item_type==='other'   ?'selected':''}>Other</option>
        </select>
      </td>
      <td><input class="est-input lib-edit" data-field="unit" value="${_libEscHtml(item.unit)}" style="width:70px;" /></td>
      <td><input class="est-input lib-edit" data-field="cost" type="number" min="0" step="0.01" value="${item.cost}" style="width:80px;" /></td>
      <td><input class="est-input lib-edit" data-field="markup" type="number" min="0" step="1" value="${item.markup}" style="width:60px;" /></td>
      <td><input class="est-input lib-edit" data-field="buy_url" value="${_libEscHtml(item.buy_url || '')}" placeholder="https://..." style="width:160px;" /></td>
      <td style="white-space:nowrap;">
        <button class="btn-lib-save" onclick="commitLibEdit('${item.id}')" title="Save changes">&#10003;</button>
        <button class="btn-lib-del"  onclick="confirmDeleteLib('${item.id}', '${_libEscHtml(item.name)}')" title="Delete">&#10005;</button>
      </td>
    </tr>
  `).join('');
}

/* ── Commit inline edit ──────────────────────────────────── */
async function commitLibEdit(id) {
  var tr = document.querySelector(`[data-lib-id="${id}"]`);
  if (!tr) return;
  var fields = {};
  tr.querySelectorAll('.lib-edit').forEach(el => {
    fields[el.dataset.field] = el.tagName === 'SELECT' ? el.value : el.value;
  });
  fields.cost    = parseFloat(fields.cost)   || 0;
  fields.markup  = parseFloat(fields.markup) || 40;
  fields.buy_url = fields.buy_url ? fields.buy_url.trim() : null;
  await updateLibraryItem(id, fields);
  showLibStatus('Saved.', 'ok');
}

/* ── Confirm + delete ────────────────────────────────────── */
function confirmDeleteLib(id, name) {
  if (confirm('Delete "' + name + '" from your library?')) {
    deleteLibraryItem(id);
  }
}

/* ── Add new item from the "Add Item" form ───────────────── */
async function addLibraryItemFromForm() {
  var name   = document.getElementById('libNewName')?.value?.trim();
  var type   = document.getElementById('libNewType')?.value;
  var unit   = document.getElementById('libNewUnit')?.value?.trim() || 'each';
  var cost   = document.getElementById('libNewCost')?.value;
  var markup = document.getElementById('libNewMarkup')?.value;
  var buyUrl = document.getElementById('libNewUrl')?.value?.trim() || null;
  if (!name) { showLibStatus('Name is required.', 'error'); return; }
  var result = await saveLibraryItem({ name, item_type: type, unit, cost, markup, buy_url: buyUrl });
  if (result) {
    document.getElementById('libNewName').value   = '';
    document.getElementById('libNewCost').value   = '';
    document.getElementById('libNewUnit').value   = 'each';
    document.getElementById('libNewMarkup').value = '40';
    document.getElementById('libNewUrl').value    = '';
    showLibStatus('Item added to library.', 'ok');
  }
}

function showLibStatus(msg, type) {
  var el = document.getElementById('libStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'lib-status ' + (type === 'ok' ? 'lib-ok' : 'lib-error');
  setTimeout(() => { el.textContent = ''; el.className = 'lib-status'; }, 3000);
}

/* ── Save row item to library (from estimator row) ───────── */
async function saveRowToLibrary(btn) {
  if (!window.isPro || !window.isPro()) { openModal('upgradeModal'); return; }
  var tr = btn.closest('tr');
  if (!tr) return;
  var name   = tr.querySelector('.item-name-input')?.value?.trim();
  var cost   = tr.querySelector('.cost-input')?.value;
  var markup = tr.querySelector('.markup-row-input')?.value;
  var buyUrl = tr.querySelector('.buy-link')?.href || null;
  var tbody  = tr.closest('tbody');
  var type   = tbody?.id === 'paintBody' ? 'paint' : 'material';
  if (!name) { alert('Enter an item name before saving to library.'); return; }
  var existing = _matLib.find(i => i.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (!confirm('"' + name + '" is already in your library. Update it?')) return;
    await updateLibraryItem(existing.id, { cost: parseFloat(cost)||0, markup: parseFloat(markup)||40, buy_url: buyUrl });
    btn.title = 'Updated in library!';
  } else {
    await saveLibraryItem({ name, item_type: type, cost, markup, unit: 'each', buy_url: buyUrl });
    btn.title = 'Saved to library!';
  }
  btn.style.color = '#7ed47e';
  setTimeout(() => { btn.style.color = ''; btn.title = 'Save to My Library'; }, 2000);
}

/* ── Typeahead: attach to a name input ───────────────────── */
function attachTypeahead(input) {
  if (!input || input.dataset.typeaheadAttached) return;
  input.dataset.typeaheadAttached = '1';

  var dropdown = document.createElement('ul');
  dropdown.className = 'lib-typeahead-dropdown';
  input.parentNode.style.position = 'relative';
  input.parentNode.appendChild(dropdown);

  function showSuggestions(query) {
    dropdown.innerHTML = '';
    if (!query || query.length < 1) {
      dropdown.style.display = 'none';
      return;
    }

    var q = query.toLowerCase();
    var matches = _matLib.filter(i => i.name.toLowerCase().includes(q)).slice(0, 8);
    if (matches.length === 0) { dropdown.style.display = 'none'; return; }
    matches.forEach(item => {
      var li = document.createElement('li');
      li.className = 'lib-typeahead-item';
      li.innerHTML =
        '<span class="lib-ta-name">' + _libEscHtml(item.name) + '</span>' +
        '<span class="lib-ta-meta">' + _libEscHtml(item.item_type) + ' &bull; ' + _libEscHtml(item.unit) + ' &bull; $' + item.cost.toFixed(2) + '</span>';
      li.addEventListener('mousedown', function(e) {
        e.preventDefault();
        fillRowFromLibrary(input, item);
        dropdown.style.display = 'none';
      });
      dropdown.appendChild(li);
    });
    dropdown.style.display = 'block';
  }

  input.addEventListener('input', () => showSuggestions(input.value));
  input.addEventListener('focus', () => showSuggestions(input.value));
  input.addEventListener('blur',  () => setTimeout(() => { dropdown.style.display = 'none'; }, 150));
  input.addEventListener('keydown', function(e) {
    if (dropdown.style.display === 'none') return;
    var items = dropdown.querySelectorAll('.lib-typeahead-item');
    var active = dropdown.querySelector('.lib-typeahead-item.active');
    var idx = Array.from(items).indexOf(active);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      var next = items[idx + 1] || items[0];
      if (next) next.classList.add('active');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (active) active.classList.remove('active');
      var prev = items[idx - 1] || items[items.length - 1];
      if (prev) prev.classList.add('active');
    } else if (e.key === 'Enter' && active) {
      e.preventDefault();
      active.dispatchEvent(new MouseEvent('mousedown'));
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });
}

/* ── Fill row fields from a library item ─────────────────── */
function fillRowFromLibrary(nameInput, item) {
  var tr = nameInput.closest('tr');
  if (!tr) return;
  nameInput.value = item.name;
  var costInput   = tr.querySelector('.cost-input');
  var markupInput = tr.querySelector('.markup-row-input');
  var buyCell     = tr.querySelector('td:has(.buy-link, .buy-link-none)') ||
                    tr.querySelector('.buy-link')?.closest('td') ||
                    tr.querySelector('.buy-link-none')?.closest('td');
  if (costInput)   costInput.value   = item.cost;
  if (markupInput) markupInput.value = item.markup;
  // Populate Buy Here link if the item has a URL
  if (buyCell) {
    if (item.buy_url) {
      buyCell.innerHTML = '<a href="' + _libEscHtml(item.buy_url) + '" target="_blank" rel="noopener" class="buy-link">Buy Here</a>';
    } else {
      buyCell.innerHTML = '<span class="buy-link-none">&mdash;</span>';
    }
  }
  // Trigger recalc
  if (costInput) costInput.dispatchEvent(new Event('input'));
}

/* ── Attach typeahead to all existing rows + observe new ones */
function initTypeaheadObserver() {
  function attachAll() {
    document.querySelectorAll('#materialsBody .item-name-input, #paintBody .item-name-input')
      .forEach(attachTypeahead);
  }
  attachAll();
  var observer = new MutationObserver(attachAll);
  ['materialsBody', 'paintBody'].forEach(id => {
    var el = document.getElementById(id);
    if (el) observer.observe(el, { childList: true });
  });
}
