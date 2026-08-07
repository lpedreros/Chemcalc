/* ============================================================
   stripe-checkout.js — ChemCalc Stripe Checkout Integration
   Handles upgrade flow: monthly/annual toggle → Checkout session
   → Stripe hosted page → return to estimate.html
   ============================================================ */

/* ── Config ──────────────────────────────────────────────── */
const STRIPE_CONFIG = {
  publishableKey:  'pk_live_51TyyPdFiIkcVqHXIWI8Mbd3vG07BDnPrDBxHZYX4wqyVI98erkuantwRmUb851MxRv4fpMUSZguKIgcPuppmGCUZ00WYRLDBcT',
  prices: {
    monthly: 'price_1U1b72FiIkcVqHXIn9kpkCPQ',
    annual:  'price_1U1b8jFiIkcVqHXINIsKENRB'
  },
  // Supabase Edge Function URL — update after deploying
  checkoutFunctionUrl: 'https://rnrzjlfpwxzomupnxikt.supabase.co/functions/v1/create-checkout',
  successUrl: 'https://chemcalc.co/estimate.html?upgrade=success',
  cancelUrl:  'https://chemcalc.co/estimate.html?upgrade=cancelled'
};

/* ── State ───────────────────────────────────────────────── */
let _selectedPlan = 'monthly'; // 'monthly' | 'annual'

/* ── Set selected plan (called by toggle buttons in modal) ── */
function setUpgradePlan(plan) {
  _selectedPlan = plan;
  const monthlyBtn = document.getElementById('planToggleMonthly');
  const annualBtn  = document.getElementById('planToggleAnnual');
  if (monthlyBtn) monthlyBtn.classList.toggle('active', plan === 'monthly');
  if (annualBtn)  annualBtn.classList.toggle('active',  plan === 'annual');
  const priceEl = document.getElementById('selectedPlanPrice');
  if (priceEl) priceEl.textContent = plan === 'monthly' ? '$5/month' : '$39/year';
}

/* ── Launch Stripe Checkout ──────────────────────────────── */
async function launchStripeCheckout() {
  const user = typeof getUser === 'function' ? getUser() : null;
  if (!user) {
    closeModal('upgradeModal');
    openModal('authModal');
    return;
  }

  const btn = document.getElementById('stripeCheckoutBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Redirecting to checkout…';
  }

  try {
    // Get the current session token for Supabase Edge Function auth
    const { data: { session } } = await _sb.auth.getSession();
    const authHeader = session?.access_token
      ? { 'Authorization': `Bearer ${session.access_token}` }
      : {};

    const res = await fetch(STRIPE_CONFIG.checkoutFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({
        priceId:    STRIPE_CONFIG.prices[_selectedPlan],
        email:      user.email,
        userId:     user.id,
        successUrl: STRIPE_CONFIG.successUrl,
        cancelUrl:  STRIPE_CONFIG.cancelUrl
      })
    });

    if (!res.ok) throw new Error('Checkout session creation failed.');
    const { url } = await res.json();
    if (!url) throw new Error('No checkout URL returned.');
    window.location.href = url;

  } catch (err) {
    console.error('Stripe checkout error:', err);
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Upgrade to Pro';
    }
    alert('Could not start checkout. Please try again or contact support.');
  }
}

/* ── Handle return from Stripe (success / cancelled) ──────── */
function handleStripeReturn() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('upgrade');
  if (!status) return;

  // Clean the URL
  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, '', cleanUrl);

  if (status === 'success') {
    // Profile will be updated by webhook — reload to pick up new tier
    setTimeout(async () => {
      if (typeof loadProfile === 'function') await loadProfile();
      if (typeof applyAuthUI === 'function') applyAuthUI();
      alert('Welcome to ChemCalc Pro! Your account has been upgraded.');
    }, 2000);
  } else if (status === 'cancelled') {
    // Silent — user cancelled, no action needed
  }
}

/* ── Init: run on page load ──────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  setUpgradePlan('monthly'); // default to monthly
  handleStripeReturn();
});
