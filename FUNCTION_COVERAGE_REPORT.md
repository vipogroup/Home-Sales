# FUNCTION COVERAGE REPORT: /agent and /shop vs public/assets/js

Legend: Found = present in repo; Missing = not implemented; Renamed = logic exists under different name/file. Each item includes file path and purpose. For Missing, we note where to port/centralize.

## Scope
- Pages under `/agent/` and `/shop/` and their JS modules in `public/assets/js/`.
- Shared helpers in `public/assets/js/` used by these pages.

---

## /agent area

- **agent-login.js** — `public/assets/js/agent-login.js`
  - **DOMContentLoaded handler** — Found. Binds form submit, loads design. Purpose: initialize page and attach login handler.
  - **Form submit handler (inline)** — Found. Posts to `/api/agent/login` with `referralCode`; on success redirects to `/agent/dashboard`.

- **agent-dashboard.js** — `public/assets/js/agent-dashboard.js`
  - **fmtCurrency(v)** — Found. Purpose: format NIS currency.
  - **el(id)** — Found. Purpose: short `getElementById`.
  - **ensureAgent()** — Found. Purpose: verify JWT cookie via `/api/agent/status`, else redirect to `/agent/login`.
  - **loadSummary()** — Found. Purpose: GET `/api/agent/me/summary`, render KPIs, and set copy-link button to `/shop?ref=...`.
  - **loadProducts()** — Found. Purpose: GET `/api/agent/me/products`, render referral links table with copy/open.
  - **loadOrders()** — Found. Purpose: GET `/api/agent/me/orders`, render orders table.
  - **bindLogout()** — Found. Purpose: POST `/api/agent/logout` and redirect to login.
  - **DOMContentLoaded handler** — Found. Initializes design, auth, summary, products, orders.
  - UI link for CSV export — Found in `public/agent/dashboard.html` (`#btnExportCsv` → `/api/agent/me/sales.csv`).

- Shared used by /agent
  - **loadDesignSettings()** — Found in `public/assets/js/design.js`. Purpose: load/apply theme.
  - **api.request/get/post...** — Found in `public/assets/js/api.js`. Purpose: fetch wrapper.

---

## /shop area

- **shop-index.js** — `public/assets/js/shop-index.js`
  - **loadProducts()** — Found. Purpose: GET `/api/products` and render grid + join modal.
  - **openDetails(id)** — Found. Purpose: `window.location.href = /product/:id`.
  - **openJoin(id)** — Found. Purpose: set hidden productId and open modal.
  - **openModal()/closeModal()** — Found. Purpose: toggle join modal visibility.
  - **getCookie(name)** — Found. Purpose: read `ref` cookie for join.
  - **Join form submit (inline)** — Found. Purpose: POST `/api/products/:id/join`, open WhatsApp link.
  - **DOMContentLoaded handler** — Found. Purpose: init design, loadProducts, bind handlers.

- **product-page.js** — `public/assets/js/product-page.js`
  - **getProductIdFromUrl()** — Found. Purpose: parse `:id` from path.
  - **loadProduct()** — Found. Purpose: GET `/api/products/:id`, then `displayProduct()`.
  - **showError()** — Found. Purpose: toggle error UI.
  - **displayProduct(p)** — Found. Purpose: build DOM, progress banding, shipping info, join button.
  - **changeMainImage(src, el)** — Found. Purpose: gallery thumbnails.
  - **openJoinModal()/closeJoinModal()** — Found.
  - **getCookie(name)** — Found.
  - **submitJoin(e)** — Found. Purpose: POST join and open WhatsApp link; close modal.
  - **DOMContentLoaded handler** — Found.

- **checkout.js** — `public/assets/js/checkout.js`
  - **goBack()** — Found. Purpose: back to `/shop`.
  - **selectPaymentMethod(m)** — Found. Purpose: switch method and UI sections.
  - **selectInstallments(n)** — Found. Purpose: highlight and show calculation summary.
  - **getCookie(name)** — Found.
  - **getParams()** — Found. Purpose: read `product` and `qty` from query string.
  - **simulatePay()** — Found. Purpose: for delivery-on-delivery flows: POST `/api/orders/confirm`; for online/installments: POST `/api/payments/create` and redirect.
  - **renderOrderItem()** — Found. Purpose: render chosen product row.
  - **updateInstallmentAmounts(total)** — Found.
  - **recalcTotals()** — Found. Purpose: subtotal + shipping + VAT + delivery fee.
  - **loadProduct()** — Found. Purpose: GET `/api/products/:id` and set `currentProduct`.
  - **DOMContentLoaded handler** — Found.

- **payment-success.js** — `public/assets/js/payment-success.js`
  - **getUrlParams()** — Found.
  - **applyStatus(status)** — Found.
  - **loadOrderDetails()** — Found. Purpose: read `order_id` param, show status and totals; stores `lastOrderId`.

- **payment-cancel.js** — `public/assets/js/payment-cancel.js`
  - **getUrlParams()** — Found.
  - **applyStatus(status)** — Found.
  - **load()** — Found. Purpose: read `order_id` and show cancel status; back/try again handler.

- **my-orders.js** — `public/assets/js/my-orders.js`
  - **statusLabel(st)** — Found.
  - **lookup(id)** — Found. Purpose: GET `/api/orders/:id/public` and render card.
  - **DOMContentLoaded handler** — Found. Purpose: bind form, auto-fill from URL or `lastOrderId`.

- Shared used by /shop
  - **loadDesignSettings(), applyDesignToPage()** — Found in `public/assets/js/design.js`.
  - **Referral capture IIFE** — Found in `public/assets/js/app.js` (sets `ref` cookie and posts `/api/referrals/visit`).
  - **api.request/get/post...** — Found in `public/assets/js/api.js`.

---

## Duplicated or Renamed Logic (candidates to centralize)

- **getCookie(name)** — Duplicated in `shop-index.js`, `product-page.js`, `checkout.js`.
  - Status: Renamed/Duplicated.
  - Recommendation: Port to a shared util (e.g., add to `public/assets/js/app.js` as `export function getCookie(name)`), import where needed.

- **Modal open/close (join)** — `openModal/closeModal` in `shop-index.js` vs `openJoinModal/closeJoinModal` in `product-page.js`.
  - Status: Renamed (same intent).
  - Recommendation: Port to shared util (e.g., `toggleModal(id, show)` in `app.js`), or unify function names across files.

- **Order status label** — `payment-success.js` uses `applyStatus`, `my-orders.js` uses `statusLabel` logic.
  - Status: Renamed/Duplicated.
  - Recommendation: Centralize to `orderStatusLabel(status)` in a shared util module and reuse.

- **Currency formatting** — `fmtCurrency` in `agent-dashboard.js`, manual `toLocaleString` elsewhere.
  - Status: Missing (as shared helper)/Duplicated.
  - Recommendation: Add `formatNIS(amount)` in a shared util and adopt across files.

- **Product image selection** — Only in `product-page.js` (thumbnails). No duplication currently. Status: Found.

- **Referral link builder for agents** — Implemented in `agent-dashboard.js` as inline; no shared builder.
  - Status: Found (local), could be centralized.
  - Recommendation: Add `buildReferralLink(origin, productId, refCode)` helper if to be reused elsewhere.

---

## Missing Functions (nice-to-have) and Where to Port

- **Short referral redirects in frontend** — N/A (server-side feature). Covered in FEATURE_MAP as missing routes.

- **Shared cookie/util module** — Missing.
  - Where to port: Create `public/assets/js/utils.js` (or extend `app.js`) exporting:
    - `getCookie(name)`, `setCookie(name, value, days)`, `formatNIS(v)`, `orderStatusLabel(status)`, `toggleModal(selector, show)`.
  - Update imports in `/shop` and `/agent` modules accordingly.

- **Error toast/notification helper** — Missing.
  - Where to port: `utils.js` with `notify(type, text)`; replace `alert()` calls in `shop-index.js` and `product-page.js` (non-blocking UX).

- **Central HTTP error handling** — Missing (each file handles separately).
  - Where to port: Wrap `api.request()` to include uniform error mapping and optional retry.

---

## Coverage Summary

- **/agent**: All required functions Found. Minor duplication (currency formatting). CSV export available via direct link.
- **/shop**: All required functions Found. Several small duplications (cookie, modal, status labels) can be centralized.
- **Shared**: Theme loader and API wrapper Found. Utilities module recommended to consolidate duplicated logic.

---

## Next Steps (suggested)

1. **Create utils module** `public/assets/js/utils.js` with the helpers listed above; refactor imports in `shop-index.js`, `product-page.js`, `checkout.js`, `agent-dashboard.js`.
2. **Unify modal functions** across product and index pages (use `toggleModal`).
3. **Unify status labels** across `payment-success.js` and `my-orders.js`.
4. **Adopt currency formatter** everywhere (NIS helper).
