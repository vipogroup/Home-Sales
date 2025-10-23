import { loadDesignSettings } from './design.js';
import { api } from './api.js';
import { formatNIS } from './utils.js';

function fmtCurrency(v){ return formatNIS(v); }
function el(id){ return document.getElementById(id); }

// Compute API base for static hosting (GitHub Pages) to support CSV links
function computeApiBase(){
  let base = '/api';
  try {
    if (typeof window !== 'undefined' && window.API_BASE) base = String(window.API_BASE);
    else {
      const meta = typeof document !== 'undefined' ? document.querySelector('meta[name="api-base"]') : null;
      if (meta && meta.content) base = meta.content;
      else if (typeof localStorage !== 'undefined') {
        try { const ls = localStorage.getItem('API_BASE'); if (ls) base = ls; } catch {}
      }
    }
  } catch {}
  return base.replace(/\/$/, '');
}

let gRefLink = '';
let gRefCode = '';
let chVisitsBySource = null, chSalesBySource = null;
let gProducts = [];

async function ensureAgent(){
  try {
    const j = await api.get('/agent/status');
    if (!j?.success) throw new Error('unauth');
    const name = j.name || 'Agent';
    const nm = el('agentName'); if (nm) nm.textContent = name;
  } catch {
    window.location.href = 'login.html';
  }
}

async function loadSummary(){
  try {
    const j = await api.get('/agent/me/summary');
    const s = j.summary || {};
    const set = (id, val)=>{ const e=el(id); if (e) e.textContent = val; };
    set('sm_visits', Number(s.visits||0));
    set('sm_orders', Number(s.orders||0));
    set('sm_amount', fmtCurrency(s.amount||0));
    set('sm_commissions', fmtCurrency(s.totalCommissions||0));
    set('sm_refcode', s.referralCode||'—');
    gRefCode = s.referralCode||'';
    const btnCopyRefHome = el('btnCopyRefHome');
    if (btnCopyRefHome) {
      const link = new URL(`../shop/index.html?ref=${encodeURIComponent(s.referralCode||'')}`, location.href).toString();
      gRefLink = link;
      btnCopyRefHome.addEventListener('click', async ()=>{
        try { await navigator.clipboard.writeText(link); btnCopyRefHome.textContent='הועתק!'; setTimeout(()=> btnCopyRefHome.innerHTML='<i class="fas fa-copy"></i> העתק לינק לחנות', 1200); } catch {}
      });
    }
  } catch (e) {
    // minimal fallback
  }
}

async function loadProducts(){
  const box = el('agentProducts');
  if (!box) return;
  box.textContent = 'טוען...';
  try {
    const j = await api.get('/agent/me/products');
    const items = j.products || [];
    gProducts = items;
    // fill UTM target selector
    const sel = el('utm_target');
    if (sel) {
      const baseOpt = '<option value="shop">חנות מלאה (ברירת מחדל)</option>';
      const opts = items.map(p=>`<option value="product:${p.id}">${p.name||''} (#${p.id})</option>`).join('');
      sel.innerHTML = baseOpt + opts;
    }
    if (!items.length) { box.textContent = 'אין מוצרים'; return; }
    const rows = items.map(p=>`<tr>
      <td>${p.id}</td>
      <td>${p.name||''}</td>
      <td class="wrap"><input class="input" value="${p.link}" readonly /></td>
      <td>
        <button class="btn btn-outline btn-copy" data-link="${p.link}"><i class="fas fa-copy"></i> העתק</button>
        <a class="btn btn-outline-primary" href="${p.link}" target="_blank"><i class="fas fa-share"></i> פתח</a>
      </td>
    </tr>`).join('');
    box.innerHTML = `<table class="table">
      <thead><tr><th>ID</th><th>שם מוצר</th><th>לינק רפרל</th><th>פעולות</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
    box.querySelectorAll('.btn-copy').forEach(btn=> btn.addEventListener('click', async (e)=>{
      const link = e.currentTarget.getAttribute('data-link');
      try { await navigator.clipboard.writeText(link); e.currentTarget.textContent='הועתק!'; setTimeout(()=>{ e.currentTarget.innerHTML='<i class="fas fa-copy"></i> העתק'; }, 1200); } catch {}
    }));
  } catch (e) {
    box.textContent = 'שגיאה בטעינת מוצרים';
  }
}

async function loadOrders(){
  const box = el('agentOrders');
  if (!box) return;
  box.textContent = 'טוען...';
  try {
    const j = await api.get('/agent/me/orders');
    const list = j.orders || [];
    if (!list.length) { box.textContent = 'אין הזמנות'; return; }
    const rows = list.map(o=>{
      const st = String(o.status||'pending').toLowerCase();
      const stCls = st==='paid' ? 'text-success' : (st==='canceled' ? 'text-danger' : 'muted');
      return `<tr>
        <td>${o.id}</td>
        <td>${o.productId}</td>
        <td>${fmtCurrency(o.totalAmount)}</td>
        <td><span class="${stCls}">${st}</span></td>
        <td>${o.createdAt ? new Date(o.createdAt).toLocaleString('he-IL') : ''}</td>
      </tr>`;
    }).join('');
    box.innerHTML = `<table class="table">
      <thead><tr><th>ID</th><th>מוצר#</th><th>סכום</th><th>סטטוס</th><th>נוצר</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  } catch (e) {
    box.textContent = 'שגיאה בטעינת הזמנות';
  }
}

async function loadSales(){
  const box = el('agentSales');
  if (!box) return;
  box.textContent = 'טוען...';
  try {
    const j = await api.get('/agent/me/sales');
    const list = j.sales || [];
    if (!list.length) { box.textContent = 'אין מכירות'; return; }
    const rows = list.map(s=>`<tr>
      <td>${new Date(s.date).toLocaleString('he-IL')}</td>
      <td>${s.productId}</td>
      <td>₪${Number(s.amount||0).toLocaleString()}</td>
      <td>₪${Number(s.commission||0).toLocaleString()}</td>
    </tr>`).join('');
    box.innerHTML = `<table class="table">
      <thead><tr><th>תאריך</th><th>מוצר#</th><th>סכום עסקה</th><th>עמלה (10%)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  } catch (e) {
    box.textContent = 'שגיאה בטעינת מכירות';
  }
}

function bindLogout(){
  const btn = el('agentLogoutBtn');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    try { await api.post('/agent/logout', {}); } catch {}
    window.location.href = 'login.html';
  });
}

function baseLinkForTarget(target){
  if (!target || target === 'shop') return new URL('../shop/index.html', location.href).toString();
  if (String(target).startsWith('product:')){
    const id = String(target).split(':')[1];
    return new URL(`../shop/product.html?id=${id}`, location.href).toString();
  }
  return new URL('../shop/index.html', location.href).toString();
}

function buildUtmLink(refCode, source, medium, campaign, target='shop'){
  const base = baseLinkForTarget(target);
  const params = new URLSearchParams();
  if (refCode) params.set('ref', refCode);
  if (source) params.set('utm_source', source);
  if (medium) params.set('utm_medium', medium);
  if (campaign) params.set('utm_campaign', campaign);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function bindUTMTools(){
  const form = el('utmForm'); if (!form) return;
  const src = el('utm_source'); const med = el('utm_medium'); const cmp = el('utm_campaign');
  const tgt = el('utm_target');
  const out = el('utmLink'); const copy = el('btnCopyUTM');
  const shareWA = el('btnShareUTMWA'); const shareEmail = el('btnShareUTMEmail');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const link = buildUtmLink(gRefCode, src?.value.trim(), med?.value.trim(), cmp?.value.trim(), tgt?.value||'shop');
    if (out) out.value = link;
  });
  if (tgt) tgt.addEventListener('change', ()=>{
    const link = buildUtmLink(gRefCode, src?.value.trim(), med?.value.trim(), cmp?.value.trim(), tgt?.value||'shop');
    if (out) out.value = link;
  });
  if (copy) copy.addEventListener('click', async ()=>{ try{ if(out?.value){ await navigator.clipboard.writeText(out.value); copy.textContent='הועתק!'; setTimeout(()=>{ copy.innerHTML='<i class="fas fa-copy"></i> העתק'; },1200);} }catch{} });
  if (shareWA) shareWA.addEventListener('click', () =>{
    const link = (out?.value && out.value.trim()) || buildUtmLink(gRefCode, src?.value.trim(), med?.value.trim(), cmp?.value.trim(), tgt?.value||'shop');
    window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, '_blank');
  });
  if (shareEmail) shareEmail.addEventListener('click', () =>{
    const link = (out?.value && out.value.trim()) || buildUtmLink(gRefCode, src?.value.trim(), med?.value.trim(), cmp?.value.trim(), tgt?.value||'shop');
    const subj = 'קישור UTM לשיתוף';
    const body = `שלום,%0D%0Aהנה קישור השיתוף:%0D%0A${encodeURIComponent(link)}%0D%0A`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subj)}&body=${body}`;
  });
}

function bindQuickActions(){
  const refresh = el('btnRefresh'); const shareWA = el('btnShareWA'); const shareEmail = el('btnShareEmail');
  if (refresh) refresh.addEventListener('click', async ()=>{ await loadSummary(); await loadProducts(); await loadOrders(); await loadSales(); });
  if (shareWA) shareWA.addEventListener('click', ()=>{
    const link = el('utmLink')?.value?.trim() || gRefLink || buildUtmLink(gRefCode);
    window.open(`https://wa.me/?text=${encodeURIComponent(link)}`, '_blank');
  });
  if (shareEmail) shareEmail.addEventListener('click', () =>{
    const tgtVal = el('utm_target')?.value || 'shop';
    const link = el('utmLink')?.value?.trim() || buildUtmLink(gRefCode, el('utm_source')?.value?.trim(), el('utm_medium')?.value?.trim(), el('utm_campaign')?.value?.trim(), tgtVal);
    const subj = 'קישור לשיתוף';
    const body = `שלום,%0D%0Aהנה קישור השיתוף:%0D%0A${encodeURIComponent(link)}%0D%0A`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subj)}&body=${body}`;
  });
}

function renderSourceChartsPlaceholder(){
  if (!(window.Chart)) return;
  const visitsCtx = el('chartVisitsBySource')?.getContext('2d');
  const salesCtx = el('chartSalesBySource')?.getContext('2d');
  const labels = ['facebook','instagram','tiktok'];
  const visits = [0,0,0];
  const sales = [0,0,0];
  if (visitsCtx){ if (chVisitsBySource) chVisitsBySource.destroy(); chVisitsBySource = new Chart(visitsCtx,{ type:'bar', data:{ labels, datasets:[{ label:'ביקורים', data:visits, backgroundColor:'#667eea' }] }, options:{ plugins:{ legend:{ display:false } }, indexAxis:'y', scales:{ x:{ beginAtZero:true } } } }); }
  if (salesCtx){ if (chSalesBySource) chSalesBySource.destroy(); chSalesBySource = new Chart(salesCtx,{ type:'bar', data:{ labels, datasets:[{ label:'₪ מכירות', data:sales, backgroundColor:'#28a745' }] }, options:{ plugins:{ legend:{ display:false } }, indexAxis:'y', scales:{ x:{ beginAtZero:true } } } }); }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  if (window.loadDesignSettings) window.loadDesignSettings();
  await ensureAgent();
  bindLogout();
  bindQuickActions();
  bindUTMTools();
  await loadSummary();
  await loadProducts();
  await loadOrders();
  await loadSales();
  renderSourceChartsPlaceholder();
  // Adjust export CSV link for static hosting
  const exp = el('btnExportCsv'); if (exp) exp.href = computeApiBase() + '/agent/me/sales.csv';
});
