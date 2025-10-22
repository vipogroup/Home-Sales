import { loadDesignSettings } from '/assets/js/design.js';
import { api } from '/assets/js/api.js';

function getUrlParams(){ const params=new URLSearchParams(window.location.search); return { orderId: params.get('order_id'), status: params.get('status') }; }
function applyStatus(status){ const el=document.getElementById('orderStatus'); if(!el) return; const st=String(status||'').toLowerCase(); el.classList.remove('text-emerald','text-danger','muted'); let label='בוטל ❌'; if(st==='paid'){ label='שולם ✅'; el.classList.add('text-emerald'); } else if(st==='canceled'){ el.classList.add('text-danger'); } else { label='בטיפול ⏳'; el.classList.add('muted'); } el.textContent=label; }
async function load(){ const { orderId } = getUrlParams(); if(orderId){ const el=document.getElementById('orderId'); if (el) el.textContent = orderId; try{ const j = await api.get(`/orders/${encodeURIComponent(orderId)}/public`); if(j?.success && j.order){ applyStatus(j.order.status); } } catch(_){} } }

document.addEventListener('DOMContentLoaded', ()=>{
  if (window.loadDesignSettings) window.loadDesignSettings();
  load();
  const tryAgain = document.getElementById('btnTryAgain');
  if (tryAgain) {
    tryAgain.addEventListener('click', (e)=>{
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/shop';
      }
    });
  }
});
