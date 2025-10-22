# DUPLICATE_REPORT

Legend: ✅ OK (expected duplicate) • ⚠️ Review (possible confusion/outdated) • ❌ Unused (not referenced)

---

## 1) Duplicate basenames (same filename in different folders)

- dashboard.html — ⚠️ Review
  - `public/admin/dashboard.html`
  - `public/agent/dashboard.html`
  - Note: Different roles (Admin vs Agent). Keep both; ensure clear routing and links.

- login.html — ⚠️ Review
  - `public/admin/login.html`
  - `public/agent/login.html`
  - Note: Different roles (Admin vs Agent). Keep both; name collision only by basename.

- admin.js — ⚠️ Review
  - `public/assets/js/admin.js` (Frontend admin dashboard)
  - `src/routes/admin.js` (Express routes for admin)
  - Note: Different runtimes (browser vs server). Consider renaming one for clarity, e.g. `admin.routes.js`.

- auth.js — ⚠️ Review
  - `src/routes/auth.js` (Express auth API)
  - `src/middleware/auth.js` (Express middleware)
  - Note: Different purposes. Consider `auth.routes.js` vs `auth.middleware.js` to reduce confusion.

---

## 2) Potentially unused or outdated assets

Checked all HTML pages for stylesheet/script references.

- public/assets/css/admin.css — ❌ Unused
  - Not referenced by any HTML.

- public/assets/css/base.css — ❌ Unused
  - Not referenced by any HTML.

- public/assets/css/shop.css — ❌ Unused
  - Not referenced by any HTML.

- public/assets/css/style-base.css — ✅ Used
  - Referenced by multiple pages (admin/agent/shop).

- public/assets/css/style-agent.css — ✅ Used
  - Referenced by `public/agent/login.html`, `public/agent/dashboard.html`, `public/agent/register.html`.

- public/assets/css/style-shop.css — ✅ Used
  - Referenced by `public/shop/*.html`.

- public/assets/css/theme.css (static) — ✅ Used
  - Referenced widely as static fallback.

- /assets/theme.css (dynamic endpoint) — ✅ Used
  - Loaded by shop (and supported by server route in `src/server.js`).

---

## 3) Frontend JS usage map (to check for unused scripts)

- public/assets/js/admin.js — ✅ Used by `public/admin/dashboard.html`
- public/assets/js/login.js — ✅ Used by `public/admin/login.html`
- public/assets/js/agent-dashboard.js — ✅ Used by `public/agent/dashboard.html`
- public/assets/js/agent-login.js — ✅ Used by `public/agent/login.html`
- public/assets/js/agent-register.js — ✅ Used by `public/agent/register.html`
- public/assets/js/shop-index.js — ✅ Used by `public/shop/index.html`
- public/assets/js/product-page.js — ✅ Used by `public/shop/product.html`
- public/assets/js/checkout.js — ✅ Used by `public/shop/checkout.html`
- public/assets/js/payment-success.js — ✅ Used by `public/shop/payment-success.html`
- public/assets/js/payment-cancel.js — ✅ Used by `public/shop/payment-cancel.html`
- public/assets/js/my-orders.js — ✅ Used by `public/shop/my-orders.html`
- public/assets/js/design.js — ✅ Used by multiple pages
- public/assets/js/api.js — ✅ Imported by multiple modules
- public/assets/js/app.js — ✅ Used by admin dashboard and shop index (referral tracking)
- public/assets/js/utils.js — ✅ Imported (e.g., `agent-dashboard.js`)

Result: No unused JS detected in `public/assets/js/`.

---

## 4) Backend JS duplicate basenames (expected)

- admin.js (routes) vs admin.js (frontend) — see above.
- auth.js (routes) vs auth.js (middleware) — see above.

Result: These are expected in a full-stack project but worth naming clarification.

---

## 5) Suggested actions (no changes made)

- **Rename for clarity (optional)** — `src/routes/admin.js` → `admin.routes.js`, `src/routes/auth.js` → `auth.routes.js`, `src/middleware/auth.js` → `auth.middleware.js`.
- **Remove or archive unused CSS** — `admin.css`, `base.css`, `shop.css` (confirm with you before deletion).
- **Document duplicate basenames** — Add a short note in README to explain the admin vs agent dashboards and login pages to avoid confusion.

---

## 6) Scan details

- HTML scanned: 11 files under `public/`
- JS scanned: 26 files (frontend + backend, excluding `node_modules/`)
- CSS scanned: 7 files under `public/assets/css/`
- Grep checks: Verified stylesheet/script references across HTML; confirmed unused CSS via absence of references.

