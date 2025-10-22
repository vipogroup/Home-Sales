import { loadDesignSettings } from '/assets/js/design.js';
import { api } from '/assets/js/api.js';

function statusLabel(st){
  const s = String(st||'').toLowerCase();
  if (s==='paid') return { text:'שולם ✅', cls:'text-emerald' };
  if (s==='canceled') return { text:'בוטל ❌', cls:'text-danger' };
  return { text:'בטיפול ⏳', cls:'muted' };
}

async function lookup(id){
  const box = document.getElementById('resultBox');
  box.textContent = 'טוען...';
  try {
    const j = await api.get(`/orders/${encodeURIComponent(id)}/public`);
    if (!j?.success || !j.order) throw new Error('לא נמצאה הזמנה');
    const o = j.order;
    const st = statusLabel(o.status);
    box.innerHTML = `
      <div class="card">
        <div class="flex items-center gap-8 mb-8"><strong>מזהה:</strong><span>${o.id}</span></div>
        <div class="grid-2 gap-8">
          <div><div class="muted">סכום</div><div>₪${Number(o.totalAmount||0).toLocaleString()}</div></div>
          <div><div class="muted">כמות</div><div>${Number(o.quantity||1)}</div></div>
          <div><div class="muted">סטטוס</div><div class="${st.cls}">${st.text}</div></div>
          <div><div class="muted">נוצר ב</div><div>${o.createdAt? new Date(o.createdAt).toLocaleString('he-IL') : ''}</div></div>
        </div>
      </div>
    `;
  } catch (e) {
    box.textContent = e.message || 'שגיאה בבדיקה';
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (window.loadDesignSettings) window.loadDesignSettings();
  const form = document.getElementById('lookupForm');
  const input = document.getElementById('orderInput');
  if (form && input) {
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const id = input.value.trim();
      if (id) lookup(id);
    });
    // Auto-fill and auto-lookup by URL param or last saved order id
    const params = new URLSearchParams(location.search);
    const idFromUrl = params.get('id');
    let candidate = idFromUrl && idFromUrl.trim();
    if (!candidate) {
      try { candidate = localStorage.getItem('lastOrderId') || ''; } catch {}
    }
    if (candidate) {
      input.value = candidate;
      lookup(candidate);
    }
  }
});
