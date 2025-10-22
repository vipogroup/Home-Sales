# FEATURE MAP: /agent and /shop in vipo-unified

Legend: ✅ present | ⚠️ partial | ❌ missing

This document enumerates all relevant pages, components and functions for the Agent area (/agent) and the Shop (/shop), including backend APIs, with file paths and purposes.

## Pages (frontend HTML)

- **/agent/login** — `public/agent/login.html` — Agent referral login page. Status: ✅
- **/agent/dashboard** — `public/agent/dashboard.html` — Agent dashboard summary, products and orders. Status: ✅

- **/shop (home)** — `public/shop/index.html` — Products grid and join modal. Status: ✅
- **/product/:id** — `public/shop/product.html` — Product details + join modal. Status: ✅
- **/shop/checkout** — `public/shop/checkout.html` — Checkout/payments selection page. Status: ✅
- **/shop/payment-success** — `public/shop/payment-success.html` — Order success details. Status: ✅
- **/shop/payment-cancel** — `public/shop/payment-cancel.html` — Payment canceled page. Status: ✅
- **/my-orders** — `public/shop/my-orders.html` — Self lookup order status by ID. Status: ✅

Friendly route handlers (server): `src/server.js`
- `GET /agent/login`, `GET /agent/dashboard` (with CSP). Status: ✅
- `GET /shop`, `GET /product/:id`, `GET /shop/checkout`, `GET /shop/payment-success`, `GET /shop/payment-cancel`, `GET /my-orders`. Status: ✅

## Frontend JS: Agent area

- `public/assets/js/agent-login.js` — Purpose: agent login by referral code.
  - **Functions**:
    - `DOMContentLoaded handler` (bind form submit). Status: ✅
- `public/assets/js/agent-dashboard.js` — Purpose: show summary, referral links, orders; ensure auth.
  - **Functions**:
    - `ensureAgent()` — redirect to login if not authenticated. Status: ✅
    - `loadSummary()` — visits/orders/amount/commissions/refcode; copy link to shop. Status: ✅
    - `loadProducts()` — render per-product referral links table; copy/open actions. Status: ✅
    - `loadOrders()` — render agent's orders table. Status: ✅
    - `bindLogout()` — logout and redirect. Status: ✅
  - UI Export sales CSV button — not in dashboard HTML. API exists (see below). Status: ⚠️ (UI missing)

## Frontend JS: Shop

- `public/assets/js/shop-index.js` — Purpose: load products grid + join flow.
  - **Functions**: `loadProducts()`, `openDetails(id)`, `openJoin(id)`, `openModal()`, `closeModal()`, `getCookie(name)`. Status: ✅
- `public/assets/js/product-page.js` — Purpose: load single product and join modal.
  - **Functions**: `getProductIdFromUrl()`, `loadProduct()`, `displayProduct(p)`, `changeMainImage(src, el)`, `openJoinModal()`, `closeJoinModal()`, `getCookie(name)`, `submitJoin(e)`. Status: ✅
- `public/assets/js/checkout.js` — Purpose: checkout, totals, simulate payments or redirect to provider.
  - **Functions**: `selectPaymentMethod(m)`, `selectInstallments(n)`, `simulatePay()`, `renderOrderItem()`, `updateInstallmentAmounts(total)`, `recalcTotals()`, `loadProduct()`. Status: ✅
- `public/assets/js/payment-success.js` — Purpose: show order details + status.
  - **Functions**: `getUrlParams()`, `applyStatus(status)`, `loadOrderDetails()`. Status: ✅
- `public/assets/js/payment-cancel.js` — Purpose: show cancel info and retry/back.
  - **Functions**: `getUrlParams()`, `applyStatus(status)`, `load()`. Status: ✅
- `public/assets/js/my-orders.js` — Purpose: self lookup order by ID.
  - **Functions**: `statusLabel(st)`, `lookup(id)`, `DOMContentLoaded handler` (auto-fill). Status: ✅
- Shared helpers
  - `public/assets/js/api.js` — Fetch wrapper: `request()`, `get()`, `post()`, `put()`, `delete()`. Status: ✅
  - `public/assets/js/design.js` — Theme loader (referenced as `loadDesignSettings()`). Status: ✅

## Backend: APIs (Express routes)

- Auth — `src/routes/auth.js`
  - `GET /api/admin/status` — Admin auth status. Status: ✅
  - `POST /api/admin/login`, `POST /api/admin/logout` — Admin session. Status: ✅
  - `POST /api/agent/login` — Agent JWT cookie by referral code. Status: ✅
  - `GET /api/agent/status` — Agent session status. Status: ✅
  - `POST /api/agent/logout` — Clear agent token. Status: ✅

- Agent self service — `src/routes/agents.js`
  - `GET /api/agent/me/summary` — visits/orders/amount/commissions/referralCode. Status: ✅
  - `GET /api/agent/me/products` — per-product referral links. Status: ✅
  - `GET /api/agent/me/orders` — agent orders. Status: ✅
  - `GET /api/agent/me/sales.csv` — sales export. Status: ✅ (UI to trigger: ⚠️ not wired)
  - Dev and admin endpoints (all agents list, per-agent lookups, toggle, etc.). Status: ✅

- Products & orders — `src/routes/products.js`
  - `GET /api/products` — products list (DB; memory fallback). Status: ✅
  - `GET /api/products/:id` — single product. Status: ✅
  - `POST /api/products/:id/join` — join group-buy (creates participant + WhatsApp link). Status: ✅
  - `GET /api/orders/:id/public` — public order info for success/cancel. Status: ✅
  - Admin: `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` — Status: ✅
  - Admin: `GET /api/orders` (+ summary/csv) — Status: ✅

- Payments — `src/routes/payments.js`
  - `POST /api/payments/create` — compute total, create pending order; redirect URL (PayPlus template or local success). Status: ✅
  - `POST /api/payments/webhook/payplus` — webhook placeholder with HMAC check if configured. Status: ⚠️ (provider mapping minimal)
  - `POST /api/payments/dev/mark` — dev-only mark order paid/canceled. Status: ✅

- Admin — `src/routes/admin.js` — Admin features (outside scope of /agent,/shop). Status: ✅

## Cross-cutting middleware & server

- **Security/CSP** — `src/middleware/security.js`, `src/server.js` (Helmet CSP for admin/agent routes). Status: ✅
- **Referral handling** — Cookie `ref` from `?ref=CODE`, increments visits if DB. `src/server.js`. Status: ✅
- **Short referral routes** — `/r/:code` and `/r/:code/p/:id` (alias that sets cookie then redirects). Status: ❌ (API not present)
- **Theme CSS** — `GET /assets/theme.css` (dynamic variables), used by shop/admin. `src/server.js`. Status: ✅
- **Static serving** — `express.static(publicDir)` after referral middleware. `src/server.js`. Status: ✅
- **Health** — `GET /api/health`. `src/server.js`. Status: ✅

## Styling (CSS)

- Shop styles — `public/assets/css/shop.css` — Uses dynamic CSS variables (`--vipo-*`) for colors, radii, grid. Status: ✅
- Theme variables output — `src/server.js` under `/assets/theme.css`. Status: ✅

## Known gaps and partials

- **Agent dashboard: export CSV button** — API exists (`GET /api/agent/me/sales.csv`), no UI action in `public/agent/dashboard.html`. Status: ⚠️ (add button + onclick)
- **Short referral links** — `/r/:code` and `/r/:code/p/:id` convenient redirects are missing. Status: ❌ (requires adding routes in `src/server.js`)
- **Payments provider webhook** — `POST /api/payments/webhook/payplus` is a placeholder; needs full mapping of provider payload + status transitions. Status: ⚠️
- **Shop discovery features** — Search, filters, sorting, category pages, wishlist/favorites. Status: ❌ (not implemented)
- **Cart** — No multi-item cart; flow is product -> join/checkout. Status: ❌
- **Agent analytics (charts)** — Not present on agent dashboard (admin has charts). Status: ❌

## Server route map (friendly pages)

- `src/server.js`
  - `GET /shop` → `public/shop/index.html`
  - `GET /product/:id` → `public/shop/product.html`
  - `GET /shop/checkout` → `public/shop/checkout.html`
  - `GET /shop/payment-success` → `public/shop/payment-success.html`
  - `GET /shop/payment-cancel` → `public/shop/payment-cancel.html`
  - `GET /my-orders` → `public/shop/my-orders.html`
  - `GET /agent/login` → `public/agent/login.html` (CSP)
  - `GET /agent/dashboard` → `public/agent/dashboard.html` (CSP)

## Summary

- **Agent**: Core login, dashboard summary, referral links, and orders — ✅. CSV export is available via API — UI hook is ⚠️.
- **Shop**: Product list/detail, join flow, checkout, success/cancel, my-orders — ✅. Payments integration is working in demo/redirect mode, webhook is ⚠️.
- **Cross-cutting**: Referral cookie, dynamic theme CSS, CSP — ✅. Short referral routes — ❌.
