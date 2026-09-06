// global-auth.js
// Adds a site-wide login indicator to the nav on every page.
// Shows "Hi, [Name]" when logged in, or "Log In / Sign Up" when not.
// Load this AFTER supabase-client.js on every page.
// It is self-contained — it does not depend on auth.js or estimate.js.
//
// Usage: <script src="/global-auth.js"></script>
//        (place after supabase-client.js, before closing </body>)

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

  // ── 4. Fetch profile from Supabase (same pattern as auth.js) ─────────────
  async function fetchProfile(userId) {
    try {
      var result = await _sb
        .from('profiles')
        .select('full_name, tier, subscription_status')
        .eq('id', userId)
        .single();
      return result.data || null;
    } catch (e) {
      return null;
    }
  }

  // ── 5. Init: check current session, then listen for changes ──────────────
  async function init() {
    injectIndicator();

    // Guard: _sb must be available (supabase-client.js loaded first)
    if (typeof _sb === 'undefined') {
      console.warn('global-auth.js: _sb not found. Load supabase-client.js first.');
      return;
    }

    // Check existing session
    var sessionResult = await _sb.auth.getSession();
    var session = sessionResult.data && sessionResult.data.session;

    if (session && session.user) {
      var profile = await fetchProfile(session.user.id);
      updateIndicator(session.user, profile);
      // Store tier in sessionStorage for chatbot and other scripts to read
      sessionStorage.setItem('chemcalc_user_tier', (profile && (profile.tier === 'pro' || profile.subscription_status === 'active')) ? 'pro' : 'free');
      // Autofill email fields on calculator pages (e.g. "Email Me" box)
      autofillEmailFields(session.user.email);
    } else {
      updateIndicator(null, null);
      sessionStorage.setItem('chemcalc_user_tier', 'free');
    }

    // Listen for login / logout events
    _sb.auth.onAuthStateChange(async function (event, newSession) {
      if (newSession && newSession.user) {
        var profile = await fetchProfile(newSession.user.id);
        updateIndicator(newSession.user, profile);
        autofillEmailFields(newSession.user.email);
        sessionStorage.setItem('chemcalc_user_tier', (profile && (profile.tier === 'pro' || profile.subscription_status === 'active')) ? 'pro' : 'free');
      } else {
        updateIndicator(null, null);
        sessionStorage.setItem('chemcalc_user_tier', 'free');
      }
    });
  }

  // ── 6. Autofill email fields for logged-in users ─────────────────────────
  // Fills any input with id="emailInput" (the "Email Me" box in email-results.js)
  // and id="clientEmail" (the estimator client email field).
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
