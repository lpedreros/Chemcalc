# ChemCalc System Architecture

## 1. Data Layer (Supabase)
- **`affiliate_materials`**: Primary source for products and affiliate links.
- **`custom_materials`**: User-defined materials for the estimator.
- **`calculator_events`**: Analytics and input tracking for optimization.
- **`estimate_list`**: View for user estimates, secured by RLS.

## 2. Logic Layer
- **`main.js`**: Orchestrates UI and Supabase interaction.
- **`logic/calculators.js`**: Core mathematical engines for marine repair.
- **`calc-tracker.js`**: Event listener for analytics.

## 3. Frontend Layer
- **`css/style.css`**: Global styles and responsive grid.
- **`kits.html`**: Dynamic product catalog.
- **Calculator Pages**: `awlgrip.html`, `mekp.html`, etc.

## 4. Integrations
- **Stripe**: Handles $5/mo and $39/yr Pro subscriptions.
- **Trello**: Handoff for estimator tasks.
- **Amazon**: Affiliate link generation.
