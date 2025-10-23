import { api } from './api.js';

function qs(id){ return document.getElementById(id); }

async function onSubmit(e){
  e.preventDefault();
  const full_name = qs('rg_fullname').value.trim();
  const email = qs('rg_email').value.trim();
  const phone = qs('rg_phone').value.trim();
  const err = qs('rg_err'); err.textContent='';
  if (!full_name || !email || !phone){ err.textContent = 'נא למלא את כל השדות'; return; }
  try {
    const res = await api.post('/agent/register', { full_name, email, phone });
    if (!res?.success) throw new Error(res?.error||'Registration failed');
    // redirect to dashboard where the agent can copy links per product
    window.location.href = 'dashboard.html';
  } catch(e){ err.textContent = e.message || 'שגיאה בהרשמה'; }
}

document.addEventListener('DOMContentLoaded', ()=>{
  const form = qs('agentRegisterForm');
  if (form) form.addEventListener('submit', onSubmit);
});
