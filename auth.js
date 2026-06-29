/* ============================================================
   auth.js — ChemCalc Estimator Authentication
   Supabase email + Google OAuth, session management, profile
   ============================================================ */

const SUPABASE_URL  = 'https://rnrzjlfpwxzomupnxikt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucnpqbGZwd3h6b211cG54aWt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NTQwNDAsImV4cCI6MjA5ODMzMDA0MH0.saHft_c7A18Z4EQ0D69Zqxxcb8IS9ZC0S6rE4zwd9S0';

// Supabase client (loaded via CDN in estimate.html)
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// Current session state
let currentUser    = null;
let currentProfile = null;

/* ── Initialise on page load ─────────────────────────────── */
async function authInit() {
  const { data: { session } } = await _sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadProfile();
  }
  applyAuthUI();

  // Listen for auth state changes (login / logout / token refresh)
  _sb.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      currentUser = session.user;
      await loadProfile();
    } else {
      currentUser    = null;
      currentProfile = null;
    }
    applyAuthUI();
  });
}

/* ── Load profile from Supabase ──────────────────────────── */
async function loadProfile() {
  if (!currentUser) return;
  const { data, error } = await _sb
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();
  if (!error && data) currentProfile = data;
}

/* ── Apply UI based on auth state ────────────────────────── */
function applyAuthUI() {
  const tierLabel  = document.getElementById('tierLabel');
  const loginBtn   = document.getElementById('loginBtn');
  const logoutBtn  = document.getElementById('logoutBtn');
  const tier       = currentProfile ? currentProfile.tier : 'free';

  if (currentUser) {
    const name = currentProfile?.full_name || currentUser.email;
    if (tierLabel) {
      tierLabel.textContent = tier === 'pro'
        ? '\uD83D\uDD13 Pro — ' + name
        : '\uD83D\uDD10 Free — ' + name;
      tierLabel.className = 'tier-label' + (tier === 'pro' ? ' pro' : '');
    }
    if (loginBtn)  loginBtn.style.display  = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
  } else {
    if (tierLabel) {
      tierLabel.textContent = '\uD83D\uDD10 Free Plan';
      tierLabel.className   = 'tier-label';
    }
    if (loginBtn)  loginBtn.style.display  = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }

  // Tell estimate.js what tier we're on
  if (typeof setUserTier === 'function') setUserTier(tier);
}

/* ── Email / Password login ──────────────────────────────── */
async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  if (errEl) errEl.textContent = '';

  if (!email || !password) {
    if (errEl) errEl.textContent = 'Please enter your email and password.';
    return;
  }

  const { error } = await _sb.auth.signInWithPassword({ email, password });
  if (error) {
    if (errEl) errEl.textContent = error.message;
  } else {
    closeModal('loginModal');
  }
}

/* ── Google OAuth login ──────────────────────────────────── */
async function doGoogleLogin() {
  const { error } = await _sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.href
    }
  });
  if (error) alert('Google sign-in failed: ' + error.message);
}

/* ── Email sign-up ───────────────────────────────────────── */
async function doSignup() {
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const name     = document.getElementById('signupName').value.trim();
  const errEl    = document.getElementById('signupError');
  if (errEl) errEl.textContent = '';

  if (!email || !password || !name) {
    if (errEl) errEl.textContent = 'All fields are required.';
    return;
  }
  if (password.length < 8) {
    if (errEl) errEl.textContent = 'Password must be at least 8 characters.';
    return;
  }

  const { error } = await _sb.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } }
  });

  if (error) {
    if (errEl) errEl.textContent = error.message;
  } else {
    closeModal('loginModal');
    alert('Account created! Check your email to confirm your address, then log in.');
  }
}

/* ── Logout ──────────────────────────────────────────────── */
async function doLogout() {
  await _sb.auth.signOut();
}

/* ── Save estimate to Supabase ───────────────────────────── */
async function saveEstimateToSupabase(payload) {
  if (!currentUser) return { error: { message: 'Not logged in.' } };

  const row = {
    user_id:         currentUser.id,
    company_name:    currentProfile?.company_name || 'ChemCalc',
    estimate_number: payload.estimateNumber,
    valid_until:     payload.validUntil || null,
    customer_first:  payload.customer.firstName,
    customer_last:   payload.customer.lastName,
    customer_phone:  payload.customer.phone,
    customer_email:  payload.customer.email,
    boat_name:       payload.customer.boatName,
    boat_make:       payload.customer.boatMake,
    boat_model:      payload.customer.boatModel,
    hin:             payload.customer.hin,
    materials_total: payload.totals.materials,
    paint_total:     payload.totals.paint,
    labor_total:     payload.totals.labor,
    grand_total:     payload.totals.grand,
    hourly_rate:     payload.hourlyRate,
    estimate_data:   payload,
    status:          'draft',
    notes:           payload.notes || ''
  };

  return await _sb.from('estimates').insert(row).select().single();
}

/* ── Load saved estimates from Supabase ──────────────────── */
async function loadEstimatesFromSupabase() {
  if (!currentUser) return [];
  const { data, error } = await _sb
    .from('estimates')
    .select('id, estimate_number, customer_first, customer_last, boat_make, boat_model, grand_total, created_at, status')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

/* ── Load a single estimate by ID ────────────────────────── */
async function loadEstimateById(id) {
  if (!currentUser) return null;
  const { data, error } = await _sb
    .from('estimates')
    .select('estimate_data')
    .eq('id', id)
    .eq('user_id', currentUser.id)
    .single();
  if (error || !data) return null;
  return data.estimate_data;
}

/* ── Delete a saved estimate ─────────────────────────────── */
async function deleteEstimateById(id) {
  if (!currentUser) return;
  await _sb.from('estimates').delete().eq('id', id).eq('user_id', currentUser.id);
}

/* ── Get current profile (for estimate.js to read) ──────── */
function getProfile()  { return currentProfile; }
function getUser()     { return currentUser; }
function isLoggedIn()  { return !!currentUser; }
function isPro()       { return currentProfile?.tier === 'pro'; }
