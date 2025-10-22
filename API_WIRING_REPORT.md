# API Wiring Report

Date: 2025-03-21
Scope: `vipo-unified/public/`

## Summary
- Goal: All pages should route HTTP calls through the centralized client `public/assets/js/api.js` (no inline `fetch`).
- Finding: Admin pages are mostly compliant. Agent and Shop pages still include inline `fetch` calls. Cross-cutting modules `app.js` and `design.js` also perform inline `fetch`.

## Pages → Scripts → API usage

- **/admin/login** (`public/admin/login.html`)
  - Scripts: `/assets/js/login.js`
  - API wiring: uses `import { api } from '/assets/js/api.js'`
  - Status: OK

- **/admin/dashboard** (`public/admin/dashboard.html`)
  - Scripts: `/assets/js/app.js`, `/assets/js/admin.js`
  - API wiring:
    - `admin.js`: uses `api` only (no inline fetch) → OK
    - `app.js`: inline `fetch('/api/referrals/visit', { ... })` → MISSING
  - Status: PARTIAL (remove inline fetch in `app.js`)

- **/agent/login** (`public/agent/login.html`)
  - Scripts: `/assets/js/design.js`, `/assets/js/agent-login.js`
  - API wiring:
    - `design.js`: inline `fetch('/api/design')` → MISSING (cross-cutting)
    - `agent-login.js`: inline `fetch('/api/agent/login')` (no `api.js` import) → MISSING
  - Status: MISSING

- **/agent/dashboard** (`public/agent/dashboard.html`)
  - Scripts: `/assets/js/design.js`, `/assets/js/agent-dashboard.js`
  - API wiring:
    - `design.js`: inline `fetch('/api/design')` → MISSING (cross-cutting)
    - `agent-dashboard.js`: imports `api` for most calls, BUT uses inline `fetch('/api/agent/status')` in `ensureAgent()` → PARTIAL
  - Status: PARTIAL

- **/shop/index** (`public/shop/index.html`)
  - Scripts: `/assets/js/app.js`, `/assets/js/design.js`, `/assets/js/shop-index.js`
  - API wiring:
    - `app.js`: inline `fetch('/api/referrals/visit')` → MISSING (cross-cutting)
    - `design.js`: inline `fetch('/api/design')` → MISSING (cross-cutting)
    - `shop-index.js`: inline `fetch('/api/products')` and `fetch('/api/products/:id/join')` → MISSING
  - Status: MISSING

- **/shop/product** (`public/shop/product.html`)
  - Scripts: `/assets/js/app.js`, `/assets/js/design.js`, `/assets/js/product-page.js`
  - API wiring:
    - `app.js`: inline `fetch('/api/referrals/visit')` → MISSING (cross-cutting)
    - `design.js`: inline `fetch('/api/design')` → MISSING (cross-cutting)
    - `product-page.js`: inline `fetch('/api/products/:id')` and `fetch('/api/products/:id/join')` → MISSING
  - Status: MISSING

- **/shop/checkout** (`public/shop/checkout.html`)
  - Scripts: `/assets/js/design.js`, `/assets/js/checkout.js`
  - API wiring:
    - `design.js`: inline `fetch('/api/design')` → MISSING (cross-cutting)
    - `checkout.js`: inline `fetch('/api/orders/confirm')`, `fetch('/api/payments/create')`, `fetch('/api/products/:id')` → MISSING
  - Status: MISSING

- **/shop/my-orders** (`public/shop/my-orders.html`)
  - Scripts: `/assets/js/design.js`, `/assets/js/my-orders.js`
  - API wiring:
    - `design.js`: inline `fetch('/api/design')` → MISSING (cross-cutting)
    - `my-orders.js`: inline `fetch('/api/orders/:id/public')` → MISSING
  - Status: MISSING

- **/shop/payment-success** (`public/shop/payment-success.html`)
  - Scripts: `/assets/js/design.js`, `/assets/js/payment-success.js`
  - API wiring:
    - `design.js`: inline `fetch('/api/design')` → MISSING (cross-cutting)
    - `payment-success.js`: inline `fetch('/api/orders/:id/public')` → MISSING
  - Status: MISSING

- **/shop/payment-cancel** (`public/shop/payment-cancel.html`)
  - Scripts: `/assets/js/design.js`, `/assets/js/payment-cancel.js`
  - API wiring:
    - `design.js`: inline `fetch('/api/design')` → MISSING (cross-cutting)
    - `payment-cancel.js`: inline `fetch('/api/orders/:id/public')` → MISSING
  - Status: MISSING

## Inline fetch inventory (non-api.js)
Files and occurrences of inline `fetch(` detected:
- `/public/assets/js/checkout.js` → 3
- `/public/assets/js/product-page.js` → 2
- `/public/assets/js/shop-index.js` → 2
- `/public/assets/js/agent-dashboard.js` → 1
- `/public/assets/js/agent-login.js` → 1
- `/public/assets/js/app.js` → 1
- `/public/assets/js/design.js` → 1
- `/public/assets/js/my-orders.js` → 1
- `/public/assets/js/payment-cancel.js` → 1
- `/public/assets/js/payment-success.js` → 1

Note: `/public/assets/js/api.js` contains `fetch` by design (centralized client). This is OK.

## Recommended fixes (per file)
- **`/public/assets/js/app.js`**
  - Import `api`: `import { api } from '/assets/js/api.js'`
  - Replace `fetch('/api/referrals/visit', { method:'POST', ... })` → `api.post('/referrals/visit', { referralCode: ref, page: window.location.pathname })`

- **`/public/assets/js/design.js`**
  - Import `api` and replace `fetch('/api/design')` → `api.get('/design')`

- **`/public/assets/js/agent-dashboard.js`**
  - In `ensureAgent()`, replace `fetch('/api/agent/status')` → `api.get('/agent/status')`

- **`/public/assets/js/agent-login.js`**
  - Import `api` and replace login POST `fetch('/api/agent/login')` → `api.post('/agent/login', { referralCode })`

- **`/public/assets/js/shop-index.js`**
  - Replace `fetch('/api/products')` → `api.get('/products')`
  - Replace `fetch('/api/products/:id/join')` → `api.post('/products/:id/join', payload)`

- **`/public/assets/js/checkout.js`**
  - Replace `fetch('/api/orders/confirm')` → `api.post('/orders/confirm', payload)`
  - Replace `fetch('/api/payments/create')` → `api.post('/payments/create', payload)`
  - Replace `fetch('/api/products/:id')` → `api.get('/products/:id')`

- **`/public/assets/js/my-orders.js`**
  - Replace `fetch('/api/orders/:id/public')` → `api.get('/orders/:id/public')`

- **`/public/assets/js/payment-cancel.js`**
  - Replace `fetch('/api/orders/:id/public')` → `api.get('/orders/:id/public')`

- **`/public/assets/js/payment-success.js`**
  - Replace `fetch('/api/orders/:id/public')` → `api.get('/orders/:id/public')`

- **`/public/assets/js/product-page.js`**
  - Replace `fetch('/api/products/:id')` → `api.get('/products/:id')`
  - Replace `fetch('/api/products/:id/join')` → `api.post('/products/:id/join', payload)`

## Acceptance criteria for "no inline fetch"
- Every page script that performs HTTP calls imports and uses `api.js`.
- Cross-cutting helpers (`app.js`, `design.js`) also route calls via `api.js`.
- `grep -R "fetch(" public/assets/js` returns only matches inside `api.js`.

## Notes
- Central client `api.js` (`public/assets/js/api.js`) already sets `credentials: 'include'` and JSON headers. Ensure any non-JSON endpoints are handled (if needed) by extending `api.js` safely.
- No HTML page needs to include `api.js` directly; keep imports at the top of each ES module.
