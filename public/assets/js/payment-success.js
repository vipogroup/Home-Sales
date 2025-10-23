import { loadDesignSettings } from './design.js';
import { api } from './api.js';

function getUrlParams(){ const params=new URLSearchParams(window.location.search); return { orderId: params.get('order_id'), status: params.get('status') }; }
function applyStatus(status){ const el=document.getElementById('orderStatus'); if(!el) return; const st=String(status||'').toLowerCase(); el.classList.remove('text-emerald','text-danger','muted'); let label='שולם בהצלחה ✅'; if(st==='canceled'){ label='בוטל ❌'; el.classList.add('text-danger'); } else if(st==='paid'){ el.classList.add('text-emerald'); } else { label='בטיפול ⏳'; el.classList.add('muted'); } el.textContent=label; }
async function loadOrderDetails(){
  const { orderId } = getUrlParams();
  if(orderId){
    const el=document.getElementById('orderId'); if (el) el.textContent = orderId;
    const link=document.getElementById('linkMyOrders'); if (link) { link.setAttribute('data-order-id', orderId); link.href = `my-orders.html?id=${encodeURIComponent(orderId)}`; }
    try { localStorage.setItem('lastOrderId', orderId); } catch {}
    const copy=document.getElementById('btnCopyOrderId'); if (copy) copy.addEventListener('click', async ()=>{ try{ await navigator.clipboard.writeText(orderId); copy.textContent='הועתק!'; setTimeout(()=>{ copy.innerHTML='<i class="fas fa-copy"></i> העתק מזהה'; },1200); }catch{} });
    try{
      const j=await api.get(`/orders/${encodeURIComponent(orderId)}/public`);
      if(j){
        if(j?.success && j.order){
          applyStatus(j.order.status);
          const t=document.getElementById('orderTotal'); if (t) t.textContent = '₪'+Number(j.order.totalAmount||0).toLocaleString();
          const q=document.getElementById('orderQty'); if (q) q.textContent = Number(j.order.quantity||1).toString();
        }
      }
    } catch(_){ /* keep defaults */ }
  }
}

document.addEventListener('DOMContentLoaded', ()=>{ if (window.loadDesignSettings) window.loadDesignSettings(); loadOrderDetails(); });
