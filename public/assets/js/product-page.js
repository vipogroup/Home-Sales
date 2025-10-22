import { loadDesignSettings } from '/assets/js/design.js';
import { api } from '/assets/js/api.js';

const API_BASE = window.location.origin;
let currentProduct = null;

function getProductIdFromUrl() {
  const path = window.location.pathname;
  const m = path.match(/\/product\/(\d+)/);
  return m ? parseInt(m[1]) : null;
}

async function loadProduct(){
  const productId = getProductIdFromUrl();
  if(!productId){ showError(); return; }
  try {
    const data = await api.get(`/products/${productId}`);
    if(!data.success){ showError(); return; }
    currentProduct = data.data;
    displayProduct(currentProduct);
  } catch(e){ showError(); }
}

function showError(){
  const el = document.getElementById('loading');
  if (el) el.classList.add('hidden');
  const err = document.getElementById('error');
  if (err) err.classList.remove('hidden');
}

function displayProduct(p){
  const loading = document.getElementById('loading');
  if (loading) loading.classList.add('hidden');
  const containerEl = document.getElementById('productContainer');
  if (containerEl) containerEl.classList.remove('hidden');
  document.title = `${p.name} - VIPO Group Buy`;
  const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
  const progress = Math.round((p.groupBuy.currentParticipants / p.groupBuy.maxParticipants) * 100);
  const band = Math.max(0, Math.min(100, Math.round(progress/10)*10));
  const widthClass = `w-${band}`;
  const daysLeft = Math.ceil((new Date(p.groupBuy.endDate) - new Date()) / (1000*60*60*24));
  const desc = (p.description||'').trim();
  const warranty = (p.details?.warranty||'').trim();
  const boxItems = Array.isArray(p.details?.inBox) ? p.details.inBox : [];
  const videoUrl = (p.details?.video||'').trim();
  let videoEmbed = '';
  if (videoUrl) {
    const m = videoUrl.match(/(?:youtu.be\/(?:[\w-]{11})|v=([\w-]{11})|embed\/([\w-]{11}))/);
    let vid = null;
    if (m) {
      // capture group 1 or 2 depending on pattern
      vid = m[1] || m[2] || (videoUrl.includes('youtu.be/') ? videoUrl.split('youtu.be/')[1].slice(0,11) : null);
    }
    if (vid) {
      videoEmbed = `<div class="info-card"><h3 class="m-0 mb-12"><i class="fas fa-play-circle"></i> וידאו</h3><div class="ratio" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;">
        <iframe src="https://www.youtube.com/embed/${vid}" title="YouTube video" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"></iframe>
      </div></div>`;
    } else if (/\.mp4(\?.*)?$/i.test(videoUrl)) {
      videoEmbed = `<div class="info-card"><h3 class="m-0 mb-12"><i class="fas fa-play-circle"></i> וידאו</h3><video controls style="width:100%;border-radius:12px;"><source src="${videoUrl}" type="video/mp4">הדפדפן שלך לא תומך בוידאו.</video></div>`;
    }
  }
  const html = `
    <div class="mobile-product-view">
      <!-- Main Product Image -->
      <div class="main-product-image">
        ${discount > 0 ? `<div class="sale-tag">-${discount}%</div>` : ''}
        <img src="${p.details?.images?.[0] || p.image}" alt="${p.name}" class="main-image" id="mainImage">
      </div>
      
      <!-- Thumbnails Gallery -->
      ${p.details?.images ? `<div class="product-thumbnails">${p.details.images.map((img,i)=>`<img src="${img}" alt="${p.name} ${i+1}" class="thumbnail ${i===0?'active':''}" data-img="${img}">`).join('')}</div>`:''}
      
      <!-- Product Details -->
      <div class="product-details">
        <!-- Product Title and Rating -->
        <h1 class="product-title">${p.name}</h1>
        <div class="product-meta">
          <div class="rating-stars">
            <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
            <span class="rating-text">4.7</span>
          </div>
          <div class="review-count">(124 דירוגים)</div>
          <div class="stock-status ${p.stock > 0 ? 'available' : 'unavailable'}"><i class="fas fa-${p.stock > 0 ? 'check-circle' : 'times-circle'}"></i> ${p.stock > 0 ? 'במלאי' : 'אזל'}</div>
        </div>
        <!-- Price Information -->
        <div class="price-box">
          <div class="current-price">₪${p.price.toLocaleString()}</div>
          <div class="price-details">
            <span class="original-price">₪${p.originalPrice.toLocaleString()}</span>
            <span class="discount-amount">חסכון ${(p.originalPrice - p.price).toLocaleString()}₪</span>
          </div>
        </div>
        ${p.purchaseType === 'immediate' ? `
          <div class="group-buy-status status-immediate">
            <div class="status-title status-title-green"><i class="fas fa-shopping-cart"></i> רכישה מידית - זמין במלאי</div>
            <div class="flex justify-between mt-16">
              <span><i class="fas fa-shipping-fast status-title-green"></i> משלוח מיידי</span>
              <span><i class="fas fa-box"></i> ${p.stock} יחידות במלאי</span>
            </div>
          </div>` : `
          <div class="group-buy-status">
            <div class="status-title"><i class="fas fa-users"></i> סטטוס רכישה קבוצתית</div>
            <div class="progress-container">
              <div class="progress-bar"><div class="progress-fill ${widthClass}"></div></div>
              <div class="progress-text">${p.groupBuy.currentParticipants} מתוך ${p.groupBuy.maxParticipants} משתתפים (${progress}%)</div>
            </div>
            <div class="flex justify-between mt-16">
              <span><i class="fas fa-clock"></i> ${daysLeft} ימים נותרו</span>
              <span><i class="fas fa-box"></i> ${p.stock} יחידות במלאי</span>
            </div>
          </div>`}
        <!-- Main Action Button -->  
        ${p.purchaseType === 'immediate' 
          ? `<div class="buy-button-container"><a class="buy-now-button" href="/shop/checkout.html?product=${p.id}&qty=1">הוספה לסל</a></div>`
          : `<div class="buy-button-container"><button class="buy-now-button" id="btnOpenJoin">הצטרף עכשיו</button></div>`}
        
        <!-- Shipping & Returns Info -->
        <div class="shipping-info-box">
          <div class="shipping-item">
            <i class="fas fa-truck"></i>
            <div class="shipping-text">${p.shipping?.cost>0? `משלוח: ${p.shipping.cost}₪` : 'משלוח חינם'}</div>
          </div>
          <div class="shipping-item">
            <i class="fas fa-undo"></i>
            <div class="shipping-text">החזרה: 14 ימים</div>
          </div>
        </div>
        
        ${''}
        ${''}
        ${''}
        ${''}
        ${''}
        ${videoEmbed}
      </div>
      
      <!-- Product Specifications -->
      <div class="specs-preview">
        <div class="specs-title">מפרט מקוצר</div>
        <div class="specs-list">
          ${p.details?.specifications ? Object.entries(p.details.specifications).slice(0, 4).map(([key, value]) => 
            `<div class="spec-item">
              <div class="spec-name">${getSpecLabel(key)}</div>
              <div class="spec-value">${value}</div>
            </div>`).join('') : ''}
        </div>
      </div>
    </div>`;
  const container = document.getElementById('productContainer');
  if (container) container.innerHTML = html;

  // thumbnails
  document.querySelectorAll('.thumbnail').forEach(el=>{
    el.addEventListener('click', ()=> changeMainImage(el.getAttribute('data-img'), el));
  });
  const btn = document.getElementById('btnOpenJoin');
  if (btn) btn.addEventListener('click', openJoinModal);
}

function changeMainImage(src, el){
  const main=document.getElementById('mainImage');
  if(main){ main.src=src; }
  document.querySelectorAll('.thumbnail').forEach(t=>t.classList.remove('active'));
  if(el) el.classList.add('active');
}
function openJoinModal(){ const m=document.getElementById('joinModal'); if (m) m.classList.add('show'); }
function closeJoinModal(){ const m=document.getElementById('joinModal'); if (m) m.classList.remove('show'); }
function getCookie(name){ const m = document.cookie.match(new RegExp('(?:^|; )'+name+'=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }

function getSpecLabel(key) {
  const labels = {
    'processor': 'מעבד',
    'memory': 'זיכרון RAM',
    'storage': 'אחסון',
    'display': 'מסך',
    'graphics': 'כרטיס מסך',
    'connectivity': 'קישוריות',
    'battery': 'סוללה',
    'os': 'מערכת הפעלה',
    'weight': 'משקל',
    'dimensions': 'מידות',
    'keyboard': 'מקלדת',
    'webcam': 'מצלמת רשת'
  };
  return labels[key] || key;
}

async function submitJoin(e){
  e.preventDefault();
  if(!currentProduct) return;
  const name=document.getElementById('joinName').value.trim();
  const email=document.getElementById('joinEmail').value.trim();
  const phone=document.getElementById('joinPhone').value.trim();
  const referralCode=getCookie('ref');
  try{
    const data=await api.post(`/products/${currentProduct.id}/join`,{ name,email,phone, referralCode });
    if(!data?.success) throw new Error(data?.message||'Join failed');
    alert('🎉 הצטרפת בהצלחה! נפתח וואטסאפ עם הודעה מוכנה');
    if(data.data?.whatsappUrl) window.open(data.data.whatsappUrl,'_blank');
    closeJoinModal();
  }catch(err){ alert('שגיאה בהצטרפות: '+err.message);} 
}

document.addEventListener('DOMContentLoaded', ()=>{
  loadDesignSettings();
  loadProduct();
  const form = document.getElementById('joinForm');
  if (form) form.addEventListener('submit', submitJoin);
  const back = document.getElementById('btnBack'); if (back) back.addEventListener('click', ()=> window.history.back());
  const closeBtn = document.getElementById('btnCloseJoin'); if (closeBtn) closeBtn.addEventListener('click', closeJoinModal);
});
