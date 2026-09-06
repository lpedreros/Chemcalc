// calc-tracker.js
// Shared analytics module for all ChemCalc calculator pages.
//
// WHAT IT DOES:
//   - Logs one row to the `calculator_events` Supabase table every time
//     a calculation fires on any calculator page.
//   - Attaches user_id if the visitor is logged in.
//   - Attaches a session_id (random, per browser session, no login needed).
//   - Attaches approximate country + city via IP geolocation (one call per session).
//   - Exposes markEmailCaptured() so email-results.js can flip the flag.
//
// HOW TO USE (in each calculator's script):
//   logCalculation('awlgrip', { product: 'awlgrip', method: 'spray', ... }, { paint: '12 oz', ... });
//
// DEPENDENCIES:
//   - Requires _sb (supabase-client.js) to already be loaded in <head>.
//   - Must be loaded BEFORE the calculator's own script.
// ============================================================

// ── Session ID ──────────────────────────────────────────────
// One random ID per browser session. Stored in sessionStorage so it
// survives page refreshes but clears when the browser tab closes.
function getSessionId() {
  let sid = sessionStorage.getItem('cc_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('cc_session_id', sid);
  }
  return sid;
}

// ── IP Geolocation ───────────────────────────────────────────
// Fetches country + city once per session, then caches in sessionStorage.
// Uses ipapi.co free tier (1,000 req/day — more than enough for this site).
// If the call fails, we simply log null for location — no crash.
async function getLocation() {
  const cached = sessionStorage.getItem('cc_location');
  if (cached) {
    try { return JSON.parse(cached); } catch(e) { /* fall through */ }
  }
  try {
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (!res.ok) throw new Error('geo fetch failed');
    const data = await res.json();
    const loc = { country: data.country_name || null, city: data.city || null };
    sessionStorage.setItem('cc_location', JSON.stringify(loc));
    return loc;
  } catch (e) {
    console.warn('[calc-tracker] Geolocation unavailable:', e.message);
    return { country: null, city: null };
  }
}

// ── Debounce timer ──────────────────────────────────────────
// Prevents logging on every keystroke. Only logs after user stops
// typing/changing inputs for 2 seconds.
let _logTimer = null;

// ── Main log function ────────────────────────────────────────
// Called by each calculator script after every calculation.
// DEBOUNCED: waits 2 seconds of inactivity before actually inserting.
//
// @param {string} calculator  - Identifier: 'awlgrip' | 'mekp' | 'clothcalc' | 'epifanes'
// @param {object} inputs      - Plain object of all input values at time of calculation
// @param {object} results     - Plain object of all output values shown to the user
//
// This is fire-and-forget: a failure here never breaks the calculator.
function logCalculation(calculator, inputs, results) {
  // Cancel any pending log — only the final value gets recorded
  if (_logTimer) clearTimeout(_logTimer);

  _logTimer = setTimeout(async function () {
    try {
      if (typeof _sb === 'undefined' || !_sb) {
        console.warn('[calc-tracker] Supabase client (_sb) not available. Skipping log.');
        return;
      }

      const sessionId = getSessionId();
      const location  = await getLocation();

      // Get logged-in user ID if available (null for anonymous)
      let userId = null;
      try {
        const { data: { user } } = await _sb.auth.getUser();
        userId = user ? user.id : null;
      } catch (e) { /* anonymous — that's fine */ }

      const { error } = await _sb
        .from('calculator_events')
        .insert({
          calculator:     calculator,
          inputs:         inputs,
          results:        results,
          user_id:        userId,
          session_id:     sessionId,
          country:        location.country,
          city:           location.city,
          email_captured: false
        });

      if (error) {
        console.warn('[calc-tracker] Insert failed:', error.message);
      }

    } catch (err) {
      // Never let a tracking error surface to the user
      console.warn('[calc-tracker] Unexpected error:', err.message);
    }
  }, 2000); // 2-second debounce
}

// ── Mark email captured ──────────────────────────────────────
// Called by email-results.js after a successful email send.
// Updates the most recent event row for this session to flip email_captured = true.
async function markEmailCaptured() {
  try {
    if (typeof _sb === 'undefined' || !_sb) return;

    const sessionId = getSessionId();

    // Find the most recent row for this session and update it
    const { error } = await _sb
      .from('calculator_events')
      .update({ email_captured: true })
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[calc-tracker] markEmailCaptured failed:', error.message);
    }
  } catch (err) {
    console.warn('[calc-tracker] markEmailCaptured unexpected error:', err.message);
  }
}
