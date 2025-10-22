// Shared utilities for VIPO frontends (agent/shop)
// Pure helpers; safe to include without side effects.

export function getCookie(name) {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}

export function setCookie(name, value, days = 30) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(String(value))}; expires=${expires}; path=/`;
  } catch {}
}

export function formatNIS(v) {
  try { return '₪' + Number(v || 0).toLocaleString(); } catch { return '₪0'; }
}

export function orderStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (['paid', 'success', 'approved', 'completed'].includes(s)) return { text: 'שולם ✅', cls: 'text-emerald' };
  if (['canceled', 'cancelled', 'void'].includes(s)) return { text: 'בוטל ❌', cls: 'text-danger' };
  if (['failed', 'error', 'declined'].includes(s)) return { text: 'נכשל ❌', cls: 'text-danger' };
  return { text: 'בטיפול ⏳', cls: 'muted' };
}

export function toggleModal(selectorOrEl, show) {
  const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
  if (!el) return;
  if (show === undefined) { el.classList.toggle('show'); return; }
  if (show) el.classList.add('show'); else el.classList.remove('show');
}

// Expose to window for non-module usage
if (typeof window !== 'undefined') {
  window.vipoUtils = window.vipoUtils || {};
  Object.assign(window.vipoUtils, { getCookie, setCookie, formatNIS, orderStatusLabel, toggleModal });
}
