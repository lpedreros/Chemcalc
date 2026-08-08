// meta-pixel.js
// Meta (Facebook) Pixel integration for ChemCalc.
//
// WHAT IT DOES:
// - Loads the Meta Pixel base code (standard fbevents.js)
// - Fires 'PageView' on every page load
// - Fires a custom 'CalculatorUsed' event when a calculation completes
// - Detects which calculator page it's on automatically
//
// HOW IT WORKS WITH calc-tracker.js:
// - This file does NOT modify calc-tracker.js in any way
// - It wraps the global logCalculation() function with a thin layer
//   that also fires a Meta Pixel event whenever logCalculation is called
// - If logCalculation doesn't exist (non-calculator page), it just fires PageView
//
// WHERE TO LOAD:
// - In <head>, AFTER supabase-client.js, BEFORE any calculator scripts
// - Or at the bottom with the other scripts — order doesn't matter for the
//   wrapper since it uses DOMContentLoaded to set up
//
// DEPENDENCIES: None. This is fully standalone.
// DOES NOT REQUIRE: calc-tracker.js (gracefully skips custom events if absent)
//
// ============================================================

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  var PIXEL_ID = '1053079290978201';

  // ── Meta Pixel Base Code ───────────────────────────────────
  // Standard Meta snippet (minified). Loads fbevents.js async.
  // This is the official code from Meta, just wrapped in our IIFE.
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  // ── Calculator Detection ───────────────────────────────────
  // Maps pathname to a friendly calculator name for event parameters.
  var CALCULATOR_MAP = {
    '/mekpcalc.html': 'MEKP',
    '/clothcalc.html': 'Fiberglass Cloth',
    '/awlgrip.html': 'Awlgrip',
    '/epifanespoly.html': 'Epifanes'
  };

  function getCurrentCalculator() {
    var path = window.location.pathname;
    return CALCULATOR_MAP[path] || null;
  }

  // ── Custom Event: CalculatorUsed ───────────────────────────
  // Wraps the existing logCalculation() from calc-tracker.js.
  // When logCalculation fires, we ALSO fire a Meta custom event.
  // This is non-destructive: if logCalculation doesn't exist, nothing breaks.
  //
  // The wrapper preserves the original function's behavior completely.
  function setupCalculatorTracking() {
    var calculatorName = getCurrentCalculator();

    // Only set up on calculator pages
    if (!calculatorName) return;

    // Wait for logCalculation to be defined (it's in calc-tracker.js)
    // Use a simple interval check — calc-tracker.js loads synchronously
    // so it should be available almost immediately.
    var attempts = 0;
    var maxAttempts = 20; // 2 seconds max wait (20 x 100ms)

    var checkInterval = setInterval(function () {
      attempts++;

      if (typeof window.logCalculation === 'function') {
        clearInterval(checkInterval);
        wrapLogCalculation(calculatorName);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        // calc-tracker.js not found — that's OK, pixel still fires PageView
        console.info('[meta-pixel] logCalculation not found. Custom events disabled.');
      }
    }, 100);
  }

  function wrapLogCalculation(calculatorName) {
    var originalLogCalculation = window.logCalculation;

    window.logCalculation = function (calculator, inputs, results) {
      // 1. Call the original function — never interfere with its behavior
      originalLogCalculation.call(this, calculator, inputs, results);

      // 2. Fire Meta Pixel custom event
      try {
        fbq('trackCustom', 'CalculatorUsed', {
          calculator_name: calculatorName,
          calculator_id: calculator
        });
      } catch (e) {
        // Never let pixel errors affect the user experience
        console.warn('[meta-pixel] Custom event failed:', e.message);
      }
    };

    console.info('[meta-pixel] Tracking active for:', calculatorName);
  }

  // ── Initialize ─────────────────────────────────────────────
  // Set up the wrapper after DOM is ready (ensures calc-tracker.js has loaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCalculatorTracking);
  } else {
    // DOM already ready (script loaded late)
    setupCalculatorTracking();
  }

})();
