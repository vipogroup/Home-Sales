import { api } from './api.js';

async function checkStatus(){
  try {
    const res = await api.get('/admin/status');
    if (res?.success) window.location.href = 'dashboard.html';
  } catch {}
}

async function onSubmit(e){
  e.preventDefault();
  const user = document.getElementById('user').value.trim();
  const password = document.getElementById('password').value.trim();
  const err = document.getElementById('err');
  err.textContent = '';
  try {
    const res = await api.post('/admin/login', { user, password });
    if (res?.success) {
      window.location.href = 'dashboard.html';
    } else {
      err.textContent = res?.error || 'שגיאה בהתחברות';
    }
  } catch (e) {
    err.textContent = e.message || 'שגיאה בהתחברות';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await checkStatus();
  document.getElementById('loginForm').addEventListener('submit', onSubmit);
});
