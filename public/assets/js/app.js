import { api } from '/assets/js/api.js';
// Capture referral code from URL and store in cookie (30 days)
(function () {
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (ref) {
      const days = 30;
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `ref=${encodeURIComponent(ref)}; expires=${expires}; path=/`;
      console.log('Referral code captured:', ref);

      // Also report visit to API for attribution (non-blocking)
      api.post('/referrals/visit', { referralCode: ref, page: window.location.pathname }).catch(() => {});
    }
  } catch (e) {
    console.warn('Referral capture failed:', e);
  }
})();
