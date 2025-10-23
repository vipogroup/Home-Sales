import { loadDesignSettings } from './design.js';
import { api } from './api.js';

document.addEventListener('DOMContentLoaded', ()=>{
  if (window.loadDesignSettings) window.loadDesignSettings();
  const form = document.getElementById('agentLoginForm');
  const input = document.getElementById('refCode');
  const err = document.getElementById('err');
  if (!form || !input) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault(); err.textContent='';
    const referralCode = input.value.trim();
    if (!referralCode) { err.textContent = 'נא להזין קוד רפרל'; return; }
    try {
      const j = await api.post('/agent/login', { referralCode });
      if (!j?.success) throw new Error(j?.error||'שגיאה בהתחברות');
      window.location.href = 'dashboard.html';
    } catch (e) {
      err.textContent = e.message || 'שגיאה בהתחברות';
    }
  });
});
