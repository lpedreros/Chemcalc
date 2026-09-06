// affiliate-click-tracker.js
// Standalone module that logs affiliate link clicks to the Supabase
// `affiliate_clicks` table. Works on kits.html and all calculator pages.
//
// WHAT IT DOES:
//   - Listens for clicks on affiliate links (anchors with target="_blank"
//     pointing to an external URL).
//   - Inserts one row per click into `affiliate_clicks`.
//   - Attaches a browser-session ID shared with calc-tracker.js when present.
//   - Does NOT block navigation — uses a fire-and-forget Supabase insert.
//   - Works alongside the existing gtag tracking in main.js.
//
// DEPENDENCIES:
//   - Requires _sb (supabase-client.js) to already be loaded in <head>.
//   - Should be loaded AFTER the Supabase CDN + supabase-client.js.
//   - Safe to load before or after affiliate_links.js / main.js.
// ============================================================

(function () {
  'use strict';

  // ── Helpers ─────────────────────────────────────────────────

  /**
   * Returns the current page identifier (e.g. "kits.html", "mekpcalc.html").
   */
  function getPageSource() {
    var path = window.location.pathname;
    // Strip leading slash and any directory prefix
    var filename = path.split('/').pop() || 'unknown';
    return filename;
  }

  /**
   * Returns one random ID per browser session. Reuses calc-tracker.js's
   * cc_session_id when that tracker is also loaded on the page.
   */
  function getSessionId() {
    var sessionId = sessionStorage.getItem('cc_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('cc_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Determines if a URL is external (different origin) or an affiliate link.
   * Affiliate links on this site use target="_blank" and point off-site.
   */
  function isExternalUrl(url) {
    try {
      var linkHost = new URL(url, window.location.origin).hostname;
      return linkHost !== window.location.hostname;
    } catch (e) {
      return false;
    }
  }

  /**
   * Gets the logged-in user ID, or null for anonymous visitors.
   */
  async function getUserId() {
    try {
      if (typeof _sb === 'undefined' || !_sb) return null;
      var result = await _sb.auth.getUser();
      var user = result.data && result.data.user;
      return user ? user.id : null;
    } catch (e) {
      return null;
    }
  }

  // ── Core insert ─────────────────────────────────────────────

  /**
   * Inserts a click event row into the `affiliate_clicks` table.
   * Fire-and-forget: errors are logged to console, never surface to the user.
   */
  async function trackClick(url, linkText, pageSource) {
    try {
      if (typeof _sb === 'undefined' || !_sb) {
        console.warn('[affiliate-click-tracker] Supabase client (_sb) not available. Skipping.');
        return;
      }

      var userId = await getUserId();
      var sessionId = getSessionId();

      var row = {
        product_url:  url,
        product_name: linkText || null,
        page:         pageSource,
        user_id:      userId,
        session_id:   sessionId
        // created_at / id handled by Supabase defaults
      };

      var result = await _sb
        .from('affiliate_clicks')
        .insert(row);

      if (result.error) {
        console.warn('[affiliate-click-tracker] Insert failed:', result.error.message);
      }
    } catch (err) {
      console.warn('[affiliate-click-tracker] Unexpected error:', err.message);
    }
  }

  // ── Event listener ──────────────────────────────────────────

  /**
   * Attaches a single delegated click listener to the document body.
   * Catches clicks on any <a target="_blank"> pointing to an external URL.
   * Does NOT call preventDefault — navigation proceeds normally.
   */
  function init() {
    document.addEventListener('click', function (event) {
      // Walk up from the click target to find the nearest anchor
      var anchor = event.target.closest('a[target="_blank"]');
      if (!anchor) return;

      var href = anchor.href;
      if (!href || !isExternalUrl(href)) return;

      var linkText = (anchor.textContent || '').trim().substring(0, 255);
      var pageSource = getPageSource();

      // Fire-and-forget — do not await, do not block navigation
      trackClick(href, linkText, pageSource);
    });
  }

  // ── Bootstrap ───────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
