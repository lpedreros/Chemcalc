// global-auth.js
// Adds a site-wide login indicator to the nav on every page.
// Shows "Hi, [Name]" when logged in, or "Log In / Sign Up" when not.
// Load this AFTER supabase-client.js on every page.
// It does not depend on auth.js or estimate.js, but it does read the shared auth
// state that global-account-modal.js publishes (getAuthState(), chemcalc:authchange).
//
// Usage: <script src="/global-auth.js"></script>
//        (place after supabase-client.js; Library/head-common.lbi loads both in <head>)

(function () {
  'use strict';

  // ── 1. Inject the nav indicator element ──────────────────────────────────
  // We insert a small pill into the nav. If the nav doesn't exist yet,
  // we wait for DOMContentLoaded.

  function injectIndicator() {
    var nav = document.getElementById('mainNav');
    if (!nav) return; // nav not found on this page — do nothing

    // Avoid double-injection if script runs twice
    if (document.getElementById('navAuthIndicator')) return;

    var el = document.createElement('span');
    el.id = 'navAuthIndicator';
    el.className = 'nav-auth-indicator';
    el.innerHTML = ''; // empty until auth resolves
    nav.appendChild(el);
  }

  // ── 2. Update the indicator based on auth state ──────────────────────────
  function updateIndicator(user, profile) {
    var el = document.getElementById('navAuthIndicator');
    if (!el) return;

    if (user) {
      // Prefer full_name from profile, fall back to email prefix
      var displayName = (profile && profile.full_name)
        ? profile.full_name.split(' ')[0]   // first name only
        : user.email.split('@')[0];

      el.innerHTML =
        '<a href="#" class="nav-auth-name" onclick="openAccountModal(); return false;">Hi, ' + escHtml(displayName) + '</a>';
    } else {
      el.innerHTML =
        '<a href="#" class="nav-auth-login" onclick="openModal(\'loginModal\'); return false;">Log In / Sign Up</a>';
    }
  }

  // ── 3. Escape helper (no XSS from display names) ─────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── 4. Apply a resolved (user, profile) pair sitewide ────────────────────
  // Shared by the initial getAuthState() read and every later
  // chemcalc:authchange event, so both paths stay identical. autofillEmailFields
  // is only called when there's a real user -- the original logged-out
  // branch never called it either; calling it with a null email would set
  // matching inputs' .value to the literal string "null" (the DOM coerces
  // el.value = null via ToString, it doesn't clear the field).
  function applyAuthState(user, profile) {
    updateIndicator(user, profile);
    if (user) {
      sessionStorage.setItem('chemcalc_user_tier', (profile && (profile.tier === 'pro' || profile.subscription_status === 'active')) ? 'pro' : 'free');
      autofillEmailFields(user.email);
    } else {
      sessionStorage.setItem('chemcalc_user_tier', 'guest');
    }
  }

  // ── 5. Init: read the shared auth state, then listen for changes ─────────
  // 2026-10-02 consolidation: this file used to run its own independent
  // getSession() + profile fetch and its own onAuthStateChange listener --
  // one of four places on the page doing that independently, which is what
  // the login-indicator bug (no SIGNED_IN event ever reaching this file's
  // own listener, per commit 4b6f080's diagnostic logging) traced back to.
  // Now reads from global-account-modal.js's shared getAuthState()/
  // chemcalc:authchange instead -- that script loads before this one on
  // 15 of the 20 pages (estimate.html, cookie.html, privacy.html, terms.html
  // and trello-setup.html load it after), which is fine because init() below
  // waits for DOMContentLoaded. estimate.html is the exception in a different
  // way: global-account-modal.js skips its own session check there (auth.js
  // does the session work, see isEstimatorPage), so nothing from that script
  // ever fires chemcalc:authchange, and getAuthState() is read here before
  // auth.js has resolved. estimate.js's setUserTier() therefore publishes the
  // event itself after every session change; the load order has no effect.
  async function init() {
    injectIndicator();

    // Guard: _sb must be available (supabase-client.js loaded first)
    if (typeof _sb === 'undefined') {
      console.warn('global-auth.js: _sb not found. Load supabase-client.js first.');
      return;
    }

    var initialState = (typeof window.getAuthState === 'function') ? window.getAuthState() : { user: null, profile: null };
    applyAuthState(initialState.user, initialState.profile);

    // Live updates (login/logout without a page nav) arrive via this event
    // instead of a page-local onAuthStateChange subscription.
    window.addEventListener('chemcalc:authchange', function (e) {
      applyAuthState(e.detail.user, e.detail.profile);
    });
  }

  // ── 6. Autofill email fields for logged-in users ─────────────────────────
  // Fills any input with id="emailInput" (no element has that id now; the "Email Me"
  // box in email-results.js is id="captureEmailInput") and id="clientEmail" (the
  // estimator client email field).
  function autofillEmailFields(email) {
    var fields = ['emailInput', 'clientEmail'];
    fields.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.value) {
        el.value = email;
      }
    });
  }

  // ── 7. Run on DOMContentLoaded ────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
