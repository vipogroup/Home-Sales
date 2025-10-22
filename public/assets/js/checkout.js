import { loadDesignSettings } from '/assets/js/design.js';
import { api } from '/assets/js/api.js';

function goBack(){ window.location.href = '/shop'; }
let currentProduct = null;
let currentQty = 1;
let selectedMethod = 'online';

function selectPaymentMethod(m){
  document.querySelectorAll('.payment-method').forEach(el=>el.classList.remove('selected'));
  const el=document.querySelector(`.payment-method[data-method="${m}"]`);
  if(el) el.classList.add('selected');
  selectedMethod = m;
  const showDelivery = (m==='cash_on_delivery'||m==='card_on_delivery');
  const showInstallments = (m==='installments');
  const del = document.getElementById('deliveryPaymentDetails'); if (del) del.classList.toggle('hidden', !showDelivery);
  const ins = document.getElementById('installmentsDetails'); if (ins) ins.classList.toggle('hidden', !showInstallments);
  const fee = document.getElementById('deliveryPaymentFeeRow'); if (fee) fee.classList.toggle('hidden', !showDelivery);
  recalcTotals();
}
function selectInstallments(n){
  document.querySelectorAll('.installment-option').forEach(el=>el.classList.remove('selected'));
  const selected = Array.from(document.querySelectorAll('.installment-option')).find(x=>x.getAttribute('data-n')===String(n));
  const selBox = document.getElementById('selectedInstallment'); if (selBox) selBox.classList.remove('hidden');
  const txt = document.getElementById('selectedInstallmentText'); if (txt) txt.textContent = `${n} תשלומים`;
  if(selected) selected.classList.add('selected');
}
function getCookie(name){ const m=document.cookie.match(new RegExp('(?:^|; )'+name+'=([^;]*)')); return m? decodeURIComponent(m[1]) : null; }
function getParams(){ const p=new URLSearchParams(window.location.search); return { productId: Number(p.get('product')||1), qty: Number(p.get('qty')||1) }; }
async function simulatePay(){
  try {
    const { productId, qty } = getParams();
    const referralCode = getCookie('ref');
    if (selectedMethod === 'cash_on_delivery' || selectedMethod === 'card_on_delivery'){
      const data = await api.post('/orders/confirm', { productId, quantity: qty, referralCode });
      if (!data?.success) throw new Error(data?.error || 'Order failed');
      const orderId = data.order?.id || `ORD-${Math.floor(Math.random()*1e6)}`;
      try { localStorage.setItem('lastOrderId', orderId); } catch {}
      window.location.href = `/shop/payment-success.html?order_id=${orderId}&status=paid`;
      return;
    }
    // Online or installments -> create payment session
    const pj = await api.post('/payments/create', { productId, quantity: qty, referralCode, method: selectedMethod });
    if (!pj?.success) throw new Error(pj?.error || 'Payment init failed');
    try { if (pj.orderId) localStorage.setItem('lastOrderId', pj.orderId); } catch {}
    window.location.href = pj.redirectUrl;
  } catch (e) {
    alert('שגיאה בביצוע הזמנה: '+ e.message);
  }
}

function renderOrderItem(){
  const box = document.getElementById('orderItems');
  if (!box || !currentProduct) return;
  const img = (currentProduct.details && currentProduct.details.images && currentProduct.details.images[0]) || currentProduct.image || '';
  box.innerHTML = `
    <div class="product-item">
      <img class="product-image" src="${img}" alt="${currentProduct.name}">
      <div class="product-details">
        <h4>${currentProduct.name}</h4>
        <div class="muted text-sm">כמות: ${currentQty}</div>
      </div>
      <div class="ms-auto text-left">
        <div class="product-price">₪${(currentProduct.price*currentQty).toLocaleString()}</div>
      </div>
    </div>`;
}

function updateInstallmentAmounts(total){
  const set = (id, v)=>{ const el = document.getElementById(id); if (el) el.textContent = Math.ceil(v).toLocaleString(); };
  // 0% for 3,6
  set('installment3', total/3);
  set('installment6', total/6);
  // 12m @2.9%, 24m @3.9%, 36m @4.9%
  set('installment12', total*1.029/12);
  set('installment24', total*1.039/24);
  set('installment36', total*1.049/36);
}

function recalcTotals(){
  if (!currentProduct) return;
  const productPriceEl = document.getElementById('productPrice');
  const shippingPriceEl = document.getElementById('shippingPrice');
  const vatPriceEl = document.getElementById('vatPrice');
  const totalPriceEl = document.getElementById('totalPrice');
  const cashAmountEl = document.getElementById('cashAmount');

  const subtotal = Number(currentProduct.price||0) * currentQty;
  const shipping = Number((currentProduct.shipping && currentProduct.shipping.cost) || 0);
  const deliveryFee = (selectedMethod==='cash_on_delivery'||selectedMethod==='card_on_delivery') ? 15 : 0;
  const beforeVat = subtotal + shipping + deliveryFee;
  const vat = Math.round(beforeVat * 0.18);
  const total = beforeVat + vat;

  if (productPriceEl) productPriceEl.textContent = '₪'+subtotal.toLocaleString();
  if (shippingPriceEl) shippingPriceEl.textContent = '₪'+shipping.toLocaleString();
  const feeRow = document.getElementById('deliveryPaymentFeeRow'); if (feeRow) feeRow.classList.toggle('hidden', !deliveryFee);
  const feeVal = document.getElementById('deliveryPaymentFee'); if (feeVal) feeVal.textContent = '₪'+deliveryFee.toLocaleString();
  if (vatPriceEl) vatPriceEl.textContent = '₪'+vat.toLocaleString();
  if (totalPriceEl) totalPriceEl.textContent = '₪'+total.toLocaleString();
  if (cashAmountEl) cashAmountEl.textContent = total.toLocaleString();

  updateInstallmentAmounts(total);
}

async function loadProduct(){
  try{
    const { productId, qty } = getParams();
    currentQty = Math.max(1, Number(qty||1));
    const data = await api.get(`/products/${productId}`);
    if (!data?.success) throw new Error('לא נמצא מוצר');
    currentProduct = data.data;
    renderOrderItem();
    recalcTotals();
  }catch(e){ /* keep minimal; UI still usable */ }
}

document.addEventListener('DOMContentLoaded',()=>{
  if (window.loadDesignSettings) window.loadDesignSettings();
  const loading = document.getElementById('loading'); if (loading) loading.classList.add('hidden');
  const content = document.getElementById('checkoutContent'); if (content) content.classList.remove('hidden');
  document.querySelectorAll('.payment-method').forEach(el=> el.addEventListener('click', ()=> selectPaymentMethod(el.getAttribute('data-method'))));
  document.querySelectorAll('.installment-option').forEach(el=> el.addEventListener('click', ()=> selectInstallments(el.getAttribute('data-n'))));
  const btnPay = document.getElementById('btnPay'); if (btnPay) btnPay.addEventListener('click', simulatePay);
  const back = document.querySelector('.back-btn'); if (back) back.addEventListener('click', goBack);
  loadProduct();
});
