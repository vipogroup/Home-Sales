import { loadDesignSettings } from './design.js';
import { api } from './api.js';
import { demoProducts } from './demo-products.js';

const API_BASE = window.location.origin;

async function loadProducts() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const grid = document.getElementById('productsGrid');
  loadingEl?.classList.remove('hidden');
  errorEl?.classList.add('hidden');
  grid.innerHTML = '';

  let products = [];
  let usedFallback = false;

  try {
    const data = await api.get('/products');
    if (!data?.success) throw new Error('API error');
    products = Array.isArray(data.data) ? data.data : [];
  } catch (e) {
    console.warn('Failed to load products from API, using demo data:', e);
    products = demoProducts;
    usedFallback = true;
  }

  if (!products.length) {
    products = demoProducts;
    usedFallback = true;
  }

  if (!products.length) {
    grid.innerHTML = '<div class="error">אין מוצרים להצגה</div>';
  } else {
    grid.innerHTML = products.map(p => {
      const pct = Math.max(0, Math.min(100, Number(p.progress||0)));
      const band = Math.round(pct/10)*10; // 0..100 step of 10
      const widthClass = `w-${band}`;
      return `<article class="product-card${usedFallback ? ' product-card-demo' : ''}">
          <img src="${(p.details && p.details.images && p.details.images[0]) || p.image}" alt="${p.name}" class="product-image"/>
          <div class="product-info">
              <h3 class="product-title">${p.name}</h3>
              <div class="product-category">${p.category || ''}</div>
              <div class="price-container">
                  <span class="current-price">₪${(p.price||0).toLocaleString()}</span>
                  <span class="original-price">₪${(p.originalPrice||0).toLocaleString()}</span>
                  <span class="discount-badge">${p.discount || 0}%</span>
              </div>
              <div class="progress-container">
                  <div class="progress-bar"><div class="progress-fill ${widthClass}"></div></div>
                  <div class="progress-text">${(p.groupBuy?.currentParticipants||0)} מתוך ${(p.groupBuy?.maxParticipants||0)} משתתפים</div>
              </div>
              <div class="product-meta"><span class="days-left"><i class="fas fa-clock"></i> ${p.daysLeft||0} ימים</span></div>
              <div class="product-buttons">
                  <button class="join-btn" data-id="${p.id}" data-action="openJoin">הצטרף</button>
                  <button class="details-btn" data-id="${p.id}" data-action="openDetails">פרטים</button>
              </div>
          </div>
      </article>`;
    }).join('');

    // wire buttons
    grid.querySelectorAll('button[data-action="openDetails"]').forEach(btn =>
      btn.addEventListener('click', () => openDetails(btn.getAttribute('data-id')))
    );
    grid.querySelectorAll('button[data-action="openJoin"]').forEach(btn =>
      btn.addEventListener('click', () => openJoin(btn.getAttribute('data-id')))
    );
  }

  loadingEl?.classList.add('hidden');
  if (usedFallback) {
    errorEl?.classList.remove('hidden');
    errorEl.innerHTML = '<i class="fas fa-info-circle"></i><h3>מציג מוצרים לדוגמה</h3><p>לא הצלחנו להתחבר לשרת, מוצגים נתוני הדגמה.</p>';
  }
}

function openDetails(id){
  // Support static GitHub Pages (no server rewrite): use product.html?id=ID
  const base = window.location.pathname.replace(/\/[^/]*$/, '/');
  window.location.href = `${base}product.html?id=${encodeURIComponent(id)}`;
}
function openJoin(id){ document.getElementById('productId').value = id; openModal(); }
function openModal(){ const m=document.getElementById('joinModal'); if (m) m.classList.add('show'); }
function closeModal(){ const m=document.getElementById('joinModal'); if (m) m.classList.remove('show'); }

function getCookie(name){ const m = document.cookie.match(new RegExp('(?:^|; )'+name+'=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }

document.addEventListener('DOMContentLoaded', ()=>{
  loadDesignSettings();
  loadProducts();
  const retry = document.getElementById('btnRetryLoad');
  if (retry) retry.addEventListener('click', loadProducts);
  const joinForm = document.getElementById('joinForm');
  if (joinForm) {
    joinForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const id = document.getElementById('productId').value;
      const name = document.getElementById('userName').value.trim();
      const email = document.getElementById('userEmail').value.trim();
      const phone = document.getElementById('userPhone').value.trim();
      const referralCode = getCookie('ref');
      try {
        const data = await api.post(`/products/${id}/join`, { name, email, phone, referralCode });
        if(!data?.success) throw new Error(data?.message||'Join failed');
        alert('🎉 הצטרפת בהצלחה! נפתח וואטסאפ עם הודעה מוכנה');
        if (data.data?.whatsappUrl) window.open(data.data.whatsappUrl, '_blank');
        closeModal();
      } catch(err){ alert('שגיאה בהצטרפות: '+ err.message); }
    });
  }
  const btnClose = document.getElementById('btnCloseJoin');
  if (btnClose) btnClose.addEventListener('click', closeModal);
});

