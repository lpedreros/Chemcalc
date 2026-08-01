// global-account-modal.js
// Injects the Login modal and the tabbed Account modal on every page.
// Depends on: supabase-client.js (_sb), auth.js (doLogin, doSignup, doGoogleLogin, doLogout, getUser, getProfile, isPro)
// On estimate.html, additional tabs (Biz Info, Trello, Materials Library) are shown
// because estimate.js and materials_library.js provide the required functions.
//
// Usage: <script src="/global-account-modal.js"></script>
//        (load AFTER auth.js, BEFORE page-specific scripts)
(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Modal open/close (global, replaces estimate.js versions) ─────────────
  window.openModal = function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  };
  window.closeModal = function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  };
  window.overlayClose = function (event, id) {
    if (event.target === document.getElementById(id)) closeModal(id);
  };
  window.switchAuthTab = function (tab) {
    var login  = document.getElementById('authPanelLogin');
    var signup = document.getElementById('authPanelSignup');
    var tabL   = document.getElementById('tabLogin');
    var tabS   = document.getElementById('tabSignup');
    if (login)  login.style.display  = tab === 'login'  ? '' : 'none';
    if (signup) signup.style.display = tab === 'signup' ? '' : 'none';
    if (tabL) tabL.classList.toggle('active', tab === 'login');
    if (tabS) tabS.classList.toggle('active', tab === 'signup');
  };

  // ── Detect if we're on the estimator page ────────────────────────────────
  var isEstimatorPage = /estimate\.html/i.test(window.location.pathname);

  // ── Login Modal HTML ─────────────────────────────────────────────────────
  var loginModalHTML = '' +
    '<div class="modal-overlay" id="loginModal" style="display:none;" onclick="overlayClose(event,\'loginModal\')">' +
    '  <div class="modal-box" onclick="event.stopPropagation()">' +
    '    <button class="modal-close" onclick="closeModal(\'loginModal\')">&#10005;</button>' +
    '    <div class="auth-tabs">' +
    '      <button class="auth-tab active" id="tabLogin" onclick="switchAuthTab(\'login\')">Log In</button>' +
    '      <button class="auth-tab" id="tabSignup" onclick="switchAuthTab(\'signup\')">Sign Up</button>' +
    '    </div>' +
    '    <div id="authPanelLogin">' +
    '      <p class="modal-sub">Access your saved estimates and contractor pricing.</p>' +
    '      <label class="est-label">Email</label>' +
    '      <input type="email" id="loginEmail" class="est-input" placeholder="email@example.com" />' +
    '      <label class="est-label mt-3">Password</label>' +
    '      <input type="password" id="loginPassword" class="est-input" placeholder="Password" />' +
    '      <p class="auth-error" id="loginError"></p>' +
    '      <button class="btn-modal-primary mt-3" onclick="doLogin()">Log In</button>' +
    '      <div class="auth-divider"><span>or</span></div>' +
    '      <button class="btn-google" onclick="doGoogleLogin()">' +
    '        <svg width="18" height="18" viewBox="0 0 48 48" style="vertical-align:middle;margin-right:8px;"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>' +
    '        Continue with Google' +
    '      </button>' +
    '    </div>' +
    '    <div id="authPanelSignup" style="display:none;">' +
    '      <p class="modal-sub">Create a free account to save your estimates.</p>' +
    '      <label class="est-label">Full Name</label>' +
    '      <input type="text" id="signupName" class="est-input" placeholder="Your name" />' +
    '      <label class="est-label mt-3">Email</label>' +
    '      <input type="email" id="signupEmail" class="est-input" placeholder="email@example.com" />' +
    '      <label class="est-label mt-3">Password</label>' +
    '      <input type="password" id="signupPassword" class="est-input" placeholder="Min. 8 characters" />' +
    '      <p class="auth-error" id="signupError"></p>' +
    '      <button class="btn-modal-primary mt-3" onclick="doSignup()">Create Account</button>' +
    '      <div class="auth-divider"><span>or</span></div>' +
    '      <button class="btn-google" onclick="doGoogleLogin()">' +
    '        <svg width="18" height="18" viewBox="0 0 48 48" style="vertical-align:middle;margin-right:8px;"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>' +
    '        Continue with Google' +
    '      </button>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  // ── Account Modal Tab HTML Builders ──────────────────────────────────────

  function buildProfileTab() {
    return '' +
      '<div class="acct-tab-panel" id="acctPanelProfile">' +
      '  <h4 class="acct-section-title">My Profile</h4>' +
      '  <div class="row g-3">' +
      '    <div class="col-md-6">' +
      '      <label class="est-label">Full Name</label>' +
      '      <input type="text" id="profileFullName" class="est-input" placeholder="Your name" />' +
      '    </div>' +
      '    <div class="col-md-6">' +
      '      <label class="est-label">Email</label>' +
      '      <input type="email" id="profileEmail" class="est-input" readonly />' +
      '    </div>' +
      '  </div>' +
      '  <div id="profilePasswordSection" class="mt-4">' +
      '    <h5 class="acct-subsection-title">Change Password</h5>' +
      '    <p class="scope-hint" id="profileGoogleNote" style="display:none;">You signed in with Google. Password is managed by Google.</p>' +
      '    <div class="row g-3" id="profilePasswordFields">' +
      '      <div class="col-md-6">' +
      '        <label class="est-label">New Password</label>' +
      '        <input type="password" id="profileNewPassword" class="est-input" placeholder="Min. 8 characters" />' +
      '      </div>' +
      '      <div class="col-md-6">' +
      '        <label class="est-label">Confirm New Password</label>' +
      '        <input type="password" id="profileConfirmPassword" class="est-input" placeholder="Confirm password" />' +
      '      </div>' +
      '    </div>' +
      '  </div>' +
      '  <button class="btn-modal-primary mt-4" onclick="saveProfile()">Save Profile</button>' +
      '  <p class="modal-footer-link" id="profileSaveStatus"></p>' +
      '  <hr class="trello-divider" />' +
      '  <button class="btn-logout-sm" onclick="doLogout()">Log Out</button>' +
      '</div>';
  }

  function buildSubscriptionTab() {
    return '' +
      '<div class="acct-tab-panel" id="acctPanelSubscription" style="display:none;">' +
      '  <h4 class="acct-section-title">Subscription</h4>' +
      '  <div id="subInfoBlock">' +
      '    <p class="sub-tier-display">Current Plan: <strong id="subTierName">Free</strong></p>' +
      '    <div id="subUpgradeBlock">' +
      '      <p class="modal-sub">Upgrade to Pro for cloud saving, materials library, Trello integration, and more.</p>' +
      '      <div class="plan-toggle-row">' +
      '        <button class="btn-plan-toggle active" id="planToggleMonthly" onclick="setUpgradePlan(\'monthly\')">Monthly — $15/mo</button>' +
      '        <button class="btn-plan-toggle" id="planToggleAnnual" onclick="setUpgradePlan(\'annual\')">Annual — $99/yr</button>' +
      '      </div>' +
      '      <button class="btn-modal-primary mt-3" id="stripeCheckoutBtn" onclick="launchStripeCheckout()">Upgrade to Pro</button>' +
      '    </div>' +
      '    <div id="subManageBlock" style="display:none;">' +
      '      <p class="modal-sub">You are on the <strong>Pro</strong> plan. Manage your billing and subscription below.</p>' +
      '      <button class="btn-modal-secondary" onclick="window.open(\'https://billing.stripe.com/p/login/7sY8wPehIbUY6Wn6xE6wE00\',\'_blank\')">Manage Subscription</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
  }

  function buildBizInfoTab() {
    return '' +
      '<div class="acct-tab-panel" id="acctPanelBizInfo" style="display:none;">' +
      '  <h4 class="acct-section-title">Business Info</h4>' +
      '  <div class="row g-3">' +
      '    <div class="col-md-6"><label class="est-label">Company Name</label><input type="text" id="bizName" class="est-input" placeholder="Your Business Name" /></div>' +
      '    <div class="col-md-6"><label class="est-label">Tagline</label><input type="text" id="bizTagline" class="est-input" placeholder="e.g. Marine Repair Specialists" /></div>' +
      '    <div class="col-md-6"><label class="est-label">Phone</label><input type="tel" id="bizPhone" class="est-input" placeholder="(555) 123-4567" /></div>' +
      '    <div class="col-md-6"><label class="est-label">Email</label><input type="email" id="bizEmail" class="est-input" placeholder="you@company.com" /></div>' +
      '    <div class="col-md-6"><label class="est-label">Website</label><input type="url" id="bizWebsite" class="est-input" placeholder="https://yoursite.com" /></div>' +
      '    <div class="col-md-6"><label class="est-label">Address</label><input type="text" id="bizAddress" class="est-input" placeholder="123 Marina Blvd, Daytona Beach, FL" /></div>' +
      '    <div class="col-md-6"><label class="est-label">Estimate # Prefix</label><input type="text" id="bizPrefix" class="est-input" placeholder="e.g. DMG or TE" maxlength="6" /><p class="scope-hint">Estimates will be numbered DMG-20260629-1234</p></div>' +
      '    <div class="col-md-6"><label class="est-label">Logo URL <span class="scope-hint">(link to your logo image)</span></label><input type="url" id="bizLogoUrl" class="est-input" placeholder="https://yoursite.com/logo.png" /></div>' +
      '  </div>' +
      '  <button class="btn-modal-primary mt-4" onclick="saveBusinessInfo()">Save Business Info</button>' +
      '  <p class="modal-footer-link" id="bizSaveStatus"></p>' +
      '</div>';
  }

  function buildTrelloTab() {
    return '' +
      '<div class="acct-tab-panel" id="acctPanelTrello" style="display:none;">' +
      '  <h4 class="acct-section-title">Trello Integration <span class="pro-badge-inline">Pro</span></h4>' +
      '  <p class="modal-sub">Connect your Trello account to send estimates directly to your board.</p>' +
      '  <div class="row g-3">' +
      '    <div class="col-12">' +
      '      <label class="est-label">Trello API Key</label>' +
      '      <div class="trello-key-row">' +
      '        <input type="text" id="trelloApiKey" class="est-input" placeholder="Paste your Trello API key here" />' +
      '        <button class="btn-trello-auth" id="trelloAuthBtn" onclick="trelloAuthorize()">Authorize Trello &#8599;</button>' +
      '      </div>' +
      '      <p class="scope-hint">Get your API key at <a href="https://trello.com/power-ups/admin" target="_blank">trello.com/power-ups/admin</a></p>' +
      '    </div>' +
      '    <div class="col-12" id="trelloTokenRow" style="display:none;">' +
      '      <label class="est-label">Trello Token <span class="scope-hint">(auto-filled after authorization)</span></label>' +
      '      <input type="text" id="trelloToken" class="est-input" placeholder="Token will appear here after you authorize" readonly />' +
      '    </div>' +
      '    <div class="col-12" id="trelloBoardRow" style="display:none;">' +
      '      <label class="est-label">Default Board &amp; List</label>' +
      '      <div class="trello-picker-row">' +
      '        <select id="trelloBoardSelect" class="est-input" onchange="trelloLoadLists()"><option value="">- Select a board -</option></select>' +
      '        <select id="trelloListSelect" class="est-input"><option value="">- Select a list -</option></select>' +
      '      </div>' +
      '      <button class="btn-trello-load" onclick="trelloLoadBoards()">&#8635; Refresh Boards</button>' +
      '    </div>' +
      '    <div class="col-12"><p class="trello-status" id="trelloStatus"></p></div>' +
      '  </div>' +
      '</div>';
  }

  function buildLibraryTab() {
    return '' +
      '<div class="acct-tab-panel" id="acctPanelLibrary" style="display:none;">' +
      '  <h4 class="acct-section-title">Materials Library <span class="pro-badge-inline">Pro</span></h4>' +
      '  <p class="modal-sub">Save your go-to materials and paint products. Start typing in any item name field to search your library.</p>' +
      '  <div class="lib-add-form row g-2 mb-3">' +
      '    <div class="col-12 col-md-4"><input type="text" id="libNewName" class="est-input" placeholder="Item name (required)" /></div>' +
      '    <div class="col-6 col-md-2"><select id="libNewType" class="est-input"><option value="material">Material</option><option value="paint">Paint</option><option value="other">Other</option></select></div>' +
      '    <div class="col-6 col-md-1"><input type="text" id="libNewUnit" class="est-input" placeholder="Unit" value="each" /></div>' +
      '    <div class="col-6 col-md-2"><input type="number" id="libNewCost" class="est-input" placeholder="Cost $" min="0" step="0.01" /></div>' +
      '    <div class="col-6 col-md-1"><input type="number" id="libNewMarkup" class="est-input" placeholder="Markup %" value="40" min="0" step="1" /></div>' +
      '    <div class="col-12 col-md-3"><input type="url" id="libNewUrl" class="est-input" placeholder="Buy URL (optional)" /></div>' +
      '    <div class="col-12 col-md-2"><button class="btn-modal-secondary w-100" onclick="addLibraryItemFromForm()">+ Add Item</button></div>' +
      '  </div>' +
      '  <p class="lib-status" id="libStatus"></p>' +
      '  <div class="lib-table-wrap">' +
      '    <table class="est-table lib-table">' +
      '      <colgroup><col style="width:28%"/><col style="width:15%"/><col style="width:10%"/><col style="width:10%"/><col/><col style="width:60px"/></colgroup>' +
      '      <thead><tr><th>Name</th><th>Type</th><th>Cost</th><th>Markup %</th><th>Buy URL</th><th></th></tr></thead>' +
      '      <tbody id="libTableBody"><tr><td colspan="6" style="text-align:center;color:#888;padding:1rem;">Loading...</td></tr></tbody>' +
      '    </table>' +
      '  </div>' +
      '</div>';
  }

  // ── Account Modal (tabbed) ───────────────────────────────────────────────
  function buildAccountModal() {
    // Tab buttons — always show Profile + Subscription; conditionally show Biz/Trello/Library on estimator
    var tabs = '' +
      '<button class="acct-tab active" data-panel="acctPanelProfile" onclick="switchAcctTab(this)">Profile</button>';
    if (isEstimatorPage) {
      tabs += '<button class="acct-tab" data-panel="acctPanelBizInfo" onclick="switchAcctTab(this)">Business</button>';
      tabs += '<button class="acct-tab" data-panel="acctPanelTrello" onclick="switchAcctTab(this)">Trello</button>';
      tabs += '<button class="acct-tab" data-panel="acctPanelLibrary" onclick="switchAcctTab(this)">Library</button>';
    }
    tabs += '<button class="acct-tab" data-panel="acctPanelSubscription" onclick="switchAcctTab(this)">Subscription</button>';

    var panels = buildProfileTab() + buildSubscriptionTab();
    if (isEstimatorPage) {
      panels = buildProfileTab() + buildBizInfoTab() + buildTrelloTab() + buildLibraryTab() + buildSubscriptionTab();
    }

    return '' +
      '<div class="modal-overlay" id="accountModal" style="display:none;" onclick="overlayClose(event,\'accountModal\')">' +
      '  <div class="modal-box modal-wide" onclick="event.stopPropagation()">' +
      '    <button class="modal-close" onclick="closeModal(\'accountModal\')">&#10005;</button>' +
      '    <h3 class="modal-title">My Account</h3>' +
      '    <div class="acct-tabs-row">' + tabs + '</div>' +
      '    <div class="acct-panels">' + panels + '</div>' +
      '  </div>' +
      '</div>';
  }

  // ── Tab switching for account modal ──────────────────────────────────────
  window.switchAcctTab = function (btn) {
    var panelId = btn.getAttribute('data-panel');
    // Deactivate all tabs
    var allTabs = document.querySelectorAll('#accountModal .acct-tab');
    allTabs.forEach(function (t) { t.classList.remove('active'); });
    btn.classList.add('active');
    // Hide all panels
    var allPanels = document.querySelectorAll('#accountModal .acct-tab-panel');
    allPanels.forEach(function (p) { p.style.display = 'none'; });
    // Show target panel
    var target = document.getElementById(panelId);
    if (target) target.style.display = '';
  };

  // ── Open account modal (called by global-auth.js) ────────────────────────
  window.openAccountModal = function () {
    populateAccountModal();
    openModal('accountModal');
  };

  // ── Populate account modal with current user data ────────────────────────
  function populateAccountModal() {
    var user = (typeof getUser === 'function') ? getUser() : null;
    var profile = (typeof getProfile === 'function') ? getProfile() : null;
    if (!user) return;

    // Profile tab
    var nameEl = document.getElementById('profileFullName');
    var emailEl = document.getElementById('profileEmail');
    if (nameEl) nameEl.value = (profile && profile.full_name) ? profile.full_name : '';
    if (emailEl) emailEl.value = user.email || '';

    // Detect Google provider — gray out password fields
    var isGoogle = user.app_metadata && user.app_metadata.provider === 'google';
    var googleNote = document.getElementById('profileGoogleNote');
    var pwFields = document.getElementById('profilePasswordFields');
    if (isGoogle) {
      if (googleNote) googleNote.style.display = '';
      if (pwFields) {
        pwFields.style.opacity = '0.4';
        pwFields.style.pointerEvents = 'none';
      }
    } else {
      if (googleNote) googleNote.style.display = 'none';
      if (pwFields) {
        pwFields.style.opacity = '';
        pwFields.style.pointerEvents = '';
      }
    }

    // Subscription tab
    var proActive = (typeof isPro === 'function') ? isPro() : false;
    var tierEl = document.getElementById('subTierName');
    var upgradeBlock = document.getElementById('subUpgradeBlock');
    var manageBlock = document.getElementById('subManageBlock');
    if (tierEl) tierEl.textContent = proActive ? 'Pro' : 'Free';
    if (upgradeBlock) upgradeBlock.style.display = proActive ? 'none' : '';
    if (manageBlock) manageBlock.style.display = proActive ? '' : 'none';

    // Biz Info tab (only on estimator — loadBusinessInfo already populates fields)
    if (isEstimatorPage && typeof loadBusinessInfo === 'function') {
      loadBusinessInfo();
    }
  }

  // ── Save Profile function ────────────────────────────────────────────────
  window.saveProfile = async function () {
    var user = (typeof getUser === 'function') ? getUser() : null;
    if (!user) return;

    var newName = document.getElementById('profileFullName').value.trim();
    var newPw = document.getElementById('profileNewPassword').value;
    var confirmPw = document.getElementById('profileConfirmPassword').value;
    var statusEl = document.getElementById('profileSaveStatus');

    // Update name in profiles table
    if (newName) {
      await _sb.from('profiles').update({ full_name: newName }).eq('id', user.id);
    }

    // Update password if provided
    if (newPw) {
      if (newPw.length < 8) {
        if (statusEl) { statusEl.textContent = 'Password must be at least 8 characters.'; statusEl.style.color = '#ff6b6b'; }
        return;
      }
      if (newPw !== confirmPw) {
        if (statusEl) { statusEl.textContent = 'Passwords do not match.'; statusEl.style.color = '#ff6b6b'; }
        return;
      }
      var { error } = await _sb.auth.updateUser({ password: newPw });
      if (error) {
        if (statusEl) { statusEl.textContent = 'Password update failed: ' + error.message; statusEl.style.color = '#ff6b6b'; }
        return;
      }
    }

    if (statusEl) {
      statusEl.textContent = '\u2713 Saved!';
      statusEl.style.color = '#7ed47e';
      setTimeout(function () { statusEl.textContent = ''; }, 2500);
    }

    // Refresh the nav indicator name
    if (typeof globalAuthRefresh === 'function') globalAuthRefresh();
  };

  // ── Inject modals into the page ──────────────────────────────────────────
  function inject() {
    // Only inject if not already present
    if (document.getElementById('loginModal') || document.getElementById('accountModal')) return;

    var container = document.createElement('div');
    container.id = 'globalModalsContainer';
    container.innerHTML = loginModalHTML + buildAccountModal();
    document.body.appendChild(container);
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
