import { api } from './api.js';

function qs(id){ return document.getElementById(id); }

// Compute API base for static hosting (GitHub Pages) to use external backend
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

// Preview utilities
function setPrimaryPreviewPage(url){
  const frame = document.getElementById('primaryPreviewFrame');
  if (!frame) return;
  frame.setAttribute('data-src', url);
  loadPreviewFrame(frame);
}

function setPreviewDevice(size){
  const frame = document.getElementById('primaryPreviewFrame');
  if (!frame) return;
  frame.classList.remove('frame-mobile','frame-tablet','frame-desktop');
  frame.classList.add('frame-'+(size||'desktop'));
}

function loadPreviewFrame(frame){
  if (!frame) return;
  const base = frame.getAttribute('data-src') || frame.dataset.src || '../shop/index.html';
  const url = base + (base.includes('?') ? '&' : '?') + '_t=' + Date.now();
  // inject vars after load
  try {
    frame.addEventListener('load', ()=>{
      try { applyDesignVarsToAllPreviews(); } catch {}
    });
  } catch {}
  frame.src = url;
}

function refreshPreviews(){
  // primary
  const primary = document.getElementById('primaryPreviewFrame');
  if (primary) loadPreviewFrame(primary);
}

function initPreviews(){
  const primary = document.getElementById('primaryPreviewFrame');
  if (primary) loadPreviewFrame(primary);

  const select = document.getElementById('previewPageSelect');
  if (select){
    renderPreviewOptions(select.value);
    select.addEventListener('change', ()=> { setPrimaryPreviewPage(select.value); renderPreviewOptions(select.value); });
  }

  const deviceBtns = document.querySelectorAll('.device-tabs [data-size]');
  deviceBtns.forEach(btn=> btn.addEventListener('click', ()=>{
    deviceBtns.forEach(b=> b.classList.remove('btn-primary'));
    btn.classList.add('btn-primary');
    setPreviewDevice(btn.getAttribute('data-size'));
  }));

  document.querySelectorAll('.preview-card.preview-thumb').forEach(card=>{
    card.addEventListener('click', ()=>{
      const src = card.getAttribute('data-src') || card.querySelector('.preview-frame')?.getAttribute('data-src') || '../shop/index.html';
      const sel = document.getElementById('previewPageSelect');
      if (sel) sel.value = src;
      setPrimaryPreviewPage(src);
    });
  });

  const btnRefresh = document.getElementById('refreshPreviewsBtn');
  if (btnRefresh) btnRefresh.addEventListener('click', refreshPreviews);
  applyDesignVarsToAllPreviews();

  // Bind actions inside preview options header
  bindPreviewOptionsActions();
}

// ===== Dynamic preview options & live CSS variables =====
const CSS_VAR_MAP = {
  joinBtnColor: '--vipo-join-bg',
  detailsBtnBg: '--vipo-details-bg',
  headerBgColor: '--vipo-header-bg',
  pageBg: '--vipo-page-bg',
  mainTitleColor: '--vipo-title-color',
  categoryTextColor: '--vipo-category-color',
  categoryChipBg: '--vipo-category-bg',
  priceSectionBg: '--vipo-price-section-bg',
  shippingInfoBg: '--vipo-shipping-info-bg',
  installmentsInfoBg: '--vipo-installments-info-bg',
  progressBarColor: '--vipo-progress-bg',
  priceTextColor: '--vipo-price-text',
  discountBadgeBg: '--vipo-discount-bg',
  discountBadgeText: '--vipo-discount-text',
  daysLeftColor: '--vipo-days-left',
  secondaryBtnBg: '--vipo-secondary-bg',
  secondaryBtnText: '--vipo-secondary-text',
  cardRadius: '--vipo-card-radius',
  buttonRadius: '--vipo-button-radius',
  gridMin: '--vipo-grid-min',
  gridGap: '--vipo-grid-gap',
  infoBg: '--vipo-info-bg',
  warningBg: '--vipo-warning-bg',
  warningBorder: '--vipo-warning-border',
  successBg: '--vipo-success-bg',
  successBorder: '--vipo-success-border'
};

// Keep last-saved design snapshot for Reset in the preview panel
let designLastSaved = null;

const PAGE_OPTIONS = {
  '/shop': ['joinBtnColor','detailsBtnBg','headerBgColor','pageBg','categoryTextColor','gridMin','gridGap','cardRadius','buttonRadius','discountBadgeBg','discountBadgeText','progressBarColor'],
  '/product/1': ['priceSectionBg','joinBtnColor','detailsBtnBg','progressBarColor','daysLeftColor','categoryChipBg','priceTextColor','headerBgColor'],
  '/shop/checkout': ['shippingInfoBg','installmentsInfoBg','secondaryBtnBg','secondaryBtnText','priceTextColor','headerBgColor','pageBg'],
  '/shop/payment-success': ['successBg','successBorder','joinBtnColor','detailsBtnBg','headerBgColor','pageBg'],
  '/shop/payment-cancel': ['warningBg','warningBorder','priceTextColor','headerBgColor','pageBg'],
  '/my-orders': ['headerBgColor','pageBg','secondaryBtnBg','secondaryBtnText','cardRadius']
};

// Categorized options per page for a clearer UX inside the preview panel
const PAGE_CATEGORIES = {
  '/shop': {
    'רקעים': ['pageBg','headerBgColor','priceSectionBg','shippingInfoBg','installmentsInfoBg'],
    'כותרות וטקסט': ['mainTitleColor','categoryTextColor','priceTextColor','daysLeftColor'],
    'כפתורים': ['joinBtnColor','detailsBtnBg','secondaryBtnBg','secondaryBtnText','buttonRadius'],
    'כרטיסים וגריד': ['cardRadius','gridMin','gridGap'],
    'תגיות וקידום': ['discountBadgeBg','discountBadgeText','progressBarColor','categoryChipBg'],
    'מידע והתראות': ['infoBg','warningBg','warningBorder','successBg','successBorder']
  },
  '/product/1': {
    'רקעים': ['pageBg','headerBgColor','priceSectionBg'],
    'כותרות וטקסט': ['mainTitleColor','categoryTextColor','priceTextColor','daysLeftColor'],
    'כפתורים': ['joinBtnColor','detailsBtnBg','secondaryBtnBg','secondaryBtnText','buttonRadius'],
    'תגיות וקידום': ['discountBadgeBg','discountBadgeText','progressBarColor','categoryChipBg']
  },
  '/shop/checkout': {
    'רקעים': ['pageBg','headerBgColor','shippingInfoBg','installmentsInfoBg'],
    'כפתורים': ['secondaryBtnBg','secondaryBtnText','buttonRadius'],
    'טקסטים': ['priceTextColor']
  },
  '/shop/payment-success': {
    'מצב הצלחה': ['successBg','successBorder'],
    'רקעים': ['pageBg','headerBgColor'],
    'כפתורים': ['joinBtnColor','detailsBtnBg']
  },
  '/shop/payment-cancel': {
    'מצב ביטול/אזהרה': ['warningBg','warningBorder'],
    'רקעים': ['pageBg','headerBgColor'],
    'טקסטים': ['priceTextColor']
  },
  '/my-orders': {
    'רקעים': ['pageBg','headerBgColor'],
    'כפתורים': ['secondaryBtnBg','secondaryBtnText'],
    'כרטיסים': ['cardRadius']
  }
};

// Normalize preview page values (relative HTML) to canonical keys used above
function normalizePreviewKey(page){
  try {
    const s = String(page||'');
    if (/product\.html/i.test(s)){
      const u = new URL(s, location.href);
      const id = u.searchParams.get('id') || '1';
      return `/product/${id}`;
    }
    if (/index\.html$/i.test(s) || /\/shop\/?$/i.test(s)) return '/shop';
    if (/checkout\.html/i.test(s)) return '/shop/checkout';
    if (/payment-success\.html/i.test(s)) return '/shop/payment-success';
    if (/payment-cancel\.html/i.test(s)) return '/shop/payment-cancel';
    if (/my-orders\.html/i.test(s)) return '/my-orders';
    if (/^\/(shop|product)\b/.test(s)) return s;
    return s;
  } catch { return String(page||''); }
}

function currentLang(){ try { return localStorage.getItem('admin_lang')||'he'; } catch { return 'he'; } }
function labelForKey(key){
  const dict = i18n[currentLang()] || i18n.he;
  const mapKey = 'design.'+key;
  return dict[mapKey] || key;
}

function guessInputType(key){
  if (/Radius$|^grid(Min|Gap)$/.test(key)) return 'dimension';
  return 'colorlike';
}

function readDesignValue(key){ const el = qs('ds_'+key); return el ? el.value : ''; }
function setDesignValue(key, val){ const el = qs('ds_'+key); if (el){ el.value = val; el.dispatchEvent(new Event('input',{bubbles:true})); } }

function isSimpleColor(val){
  if (!val) return false;
  const s = String(val).trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
}

function pickFirstColorToken(val){
  const s = String(val||'');
  const hex = s.match(/#([0-9a-f]{3,8})/i); if (hex) return '#'+hex[1];
  const rgb = s.match(/rgba?\([^\)]+\)/i); if (rgb) return rgb[0];
  const hsl = s.match(/hsla?\([^\)]+\)/i); if (hsl) return hsl[0];
  return '';
}

function toHex6FromHex(token){
  const s = token.trim();
  if (!/^#/i.test(s)) return null;
  const body = s.slice(1);
  if (body.length===3) return '#'+body.split('').map(c=>c+c).join('').toLowerCase();
  if (body.length===4) return '#'+body.slice(0,3).split('').map(c=>c+c).join('').toLowerCase();
  if (body.length>=6) return '#'+body.slice(0,6).toLowerCase();
  return null;
}

function toHex6FromRgb(token){
  const m = token.match(/rgba?\(([^\)]+)\)/i); if (!m) return null;
  const parts = m[1].split(',').map(x=>x.trim());
  let r = parseFloat(parts[0]), g = parseFloat(parts[1]), b = parseFloat(parts[2]);
  if (/%/.test(parts[0])){ r = Math.round(parseFloat(parts[0])*2.55); }
  if (/%/.test(parts[1])){ g = Math.round(parseFloat(parts[1])*2.55); }
  if (/%/.test(parts[2])){ b = Math.round(parseFloat(parts[2])*2.55); }
  const clamp = v=> Math.max(0, Math.min(255, Math.round(v)));
  const hex = (n)=> ('0'+clamp(n).toString(16)).slice(-2);
  return '#'+hex(r)+hex(g)+hex(b);
}

function hslToRgb(h, s, l){
  h = (h%360+360)%360; s/=100; l/=100;
  const c = (1 - Math.abs(2*l - 1)) * s;
  const x = c * (1 - Math.abs((h/60)%2 - 1));
  const m = l - c/2;
  let r=0,g=0,b=0;
  if (0<=h && h<60){ r=c; g=x; b=0; }
  else if (60<=h && h<120){ r=x; g=c; b=0; }
  else if (120<=h && h<180){ r=0; g=c; b=x; }
  else if (180<=h && h<240){ r=0; g=x; b=c; }
  else if (240<=h && h<300){ r=x; g=0; b=c; }
  else { r=c; g=0; b=x; }
  return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) };
}

function toHex6FromHsl(token){
  const m = token.match(/hsla?\(([^\)]+)\)/i); if (!m) return null;
  const parts = m[1].split(',').map(x=>x.trim());
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]);
  const l = parseFloat(parts[2]);
  const {r,g,b} = hslToRgb(h, s, l);
  const hex = (n)=> ('0'+Math.max(0,Math.min(255,Math.round(n))).toString(16)).slice(-2);
  return '#'+hex(r)+hex(g)+hex(b);
}

function anyToHex6(val){
  if (!val) return null;
  const token = pickFirstColorToken(val) || String(val);
  if (/^#/.test(token)) return toHex6FromHex(token);
  if (/^rgba?/i.test(token)) return toHex6FromRgb(token);
  if (/^hsla?/i.test(token)) return toHex6FromHsl(token);
  return null;
}

function buildOptionRow(key){
  const type = guessInputType(key);
  const label = labelForKey(key);
  const val = readDesignValue(key) || '';
  if (type==='dimension'){
    return `<div class="opt-row"><label class="opt-label">${label}</label><input class="opt-input" data-ds="${key}" type="text" placeholder="px / rem / %" value="${val}"/></div>`;
  }
  const colorVal = anyToHex6(val) || '#ffffff';
  return `<div class="opt-row"><label class="opt-label">${label}</label>
    <input class="opt-input opt-color" data-ds="${key}" data-kind="color" type="color" value="${colorVal}"/>
    <input class="opt-input opt-text" data-ds="${key}" data-kind="text" type="text" placeholder="CSS color או gradient(...)" value="${val}"/>
  </div>`;
}

function bindOptionsEvents(root){
  root.querySelectorAll('.opt-row').forEach(row=>{
    const color = row.querySelector('.opt-color');
    const text = row.querySelector('.opt-text');
    const key = (color||text)?.getAttribute('data-ds');
    if (!key) return;
    if (color){
      color.addEventListener('input', ()=>{ if (text) text.value = color.value; setDesignValue(key, color.value); applyDesignVarsToAllPreviews(); });
      color.addEventListener('change', ()=>{ if (text) text.value = color.value; setDesignValue(key, color.value); applyDesignVarsToAllPreviews(); });
    }
    if (text){
      text.addEventListener('input', ()=>{ const hex = anyToHex6(text.value); if (hex && color) color.value = hex; setDesignValue(key, text.value); applyDesignVarsToAllPreviews(); });
      text.addEventListener('change', ()=>{ const hex = anyToHex6(text.value); if (hex && color) color.value = hex; setDesignValue(key, text.value); applyDesignVarsToAllPreviews(); });
    }
  });
}

function initPoTabs(container){
  const tabs = container.querySelectorAll('.po-tab');
  const panels = container.querySelectorAll('.po-panel');
  tabs.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-tab');
      tabs.forEach(b=> b.classList.remove('active'));
      panels.forEach(p=> p.classList.remove('active'));
      btn.classList.add('active');
      const panel = container.querySelector('#'+id);
      if (panel) panel.classList.add('active');
    });
  });
}

function renderPreviewOptions(page){
  const list = document.getElementById('previewOptionsList');
  if (!list) return;
  const key = normalizePreviewKey(page);
  const categories = PAGE_CATEGORIES[key];
  if (categories){
    const names = Object.keys(categories);
    const header = `<div class="po-tabs-header">${names.map((n,i)=>`<button class="po-tab ${i===0?'active':''}" data-tab="po-tab-${i}">${n}</button>`).join('')}</div>`;
    const content = `<div class="po-tabs-content">${names.map((n,i)=>{
      const rows = (categories[n]||[]).map(k=> buildOptionRow(k)).join('');
      return `<div id="po-tab-${i}" class="po-panel ${i===0?'active':''}">${rows}</div>`;
    }).join('')}</div>`;
    list.innerHTML = `<div class="po-tabs">${header}${content}</div>`;
    initPoTabs(list);
    bindOptionsEvents(list);
    return;
  }
  // fallback: flat list
  const keys = PAGE_OPTIONS[key] || [];
  const html = keys.map(key=> buildOptionRow(key)).join('');
  list.innerHTML = html || '<div class="muted">אין אופציות ספציפיות לעמוד זה</div>';
  bindOptionsEvents(list);
}

function collectDesign(){
  const design = {};
  Object.keys(CSS_VAR_MAP).forEach(k=>{ const el = qs('ds_'+k); if (el) design[k] = el.value; });
  return design;
}

function buildCssVars(design){
  const vars = {};
  Object.entries(CSS_VAR_MAP).forEach(([k,cssVar])=>{
    const val = design[k];
    if (val!=null && val!=='') vars[cssVar] = val;
  });
  return vars;
}

function varsToCssText(vars){
  const lines = Object.entries(vars).map(([v,val])=>`${v}: ${val};`);
  return `:root{${lines.join(' ')}}`;
}

function getFrameDoc(frame){
  try { return frame.contentDocument || (frame.contentWindow && frame.contentWindow.document) || null; }
  catch { return null; }
}

function applyVarsToFrame(frame, cssText){
  const doc = getFrameDoc(frame);
  if (!doc) return;
  let styleEl = doc.getElementById('admin-preview-vars');
  if (!styleEl){ styleEl = doc.createElement('style'); styleEl.id = 'admin-preview-vars'; doc.head.appendChild(styleEl); }
  styleEl.textContent = cssText;
}

function applyDesignVarsToAllPreviews(){
  const d = collectDesign();
  const css = varsToCssText(buildCssVars(d));
  const primary = document.getElementById('primaryPreviewFrame');
  if (primary) applyVarsToFrame(primary, css);
}

function bindPreviewOptionsActions(){
  const btnSave = document.getElementById('poSaveBtn');
  const btnReset = document.getElementById('poResetBtn');
  const msg = document.getElementById('previewOptionsMsg');
  const presetSel = document.getElementById('poPresetSelect');
  // preset labels
  const PRESET_LABELS = { amazon:'Amazon', ebay:'eBay', shopify:'Shopify', aliexpress:'AliExpress', walmart:'Walmart', etsy:'Etsy' };
  function populatePreviewPresets(sel){
    if (!sel) return;
    const keys = Object.keys(designPresets||{});
    const opts = ['<option value="">— בחר ערכה מוכחת —</option>'].concat(keys.map(k=>`<option value="${k}">${PRESET_LABELS[k]||k}</option>`));
    sel.innerHTML = opts.join('');
  }
  if (presetSel){
    populatePreviewPresets(presetSel);
    presetSel.onchange = ()=>{
      const key = presetSel.value;
      const preset = (designPresets||{})[key];
      if (!preset) return;
      fillDesignForm(preset);
      applyDesignVarsToAllPreviews();
      try { const sel=document.getElementById('previewPageSelect'); if (sel) renderPreviewOptions(sel.value); } catch {}
      if (msg){ msg.textContent = `הוחלה ערכה: ${(PRESET_LABELS[key]||key)} (טרם נשמר)`; setTimeout(()=> msg.textContent='', 2500); }
    };
  }
  if (btnSave) btnSave.onclick = async ()=>{
    try {
      const payload = collectDesign();
      await api.post('/design', payload);
      designLastSaved = { ...payload };
      reloadThemeCSS();
      applyDesignVarsToAllPreviews();
      if (msg){ msg.textContent = 'נשמר בהצלחה'; setTimeout(()=> msg.textContent='', 2000); }
    } catch(e){ if (msg){ msg.textContent = 'שגיאה בשמירה: '+e.message; setTimeout(()=> msg.textContent='', 2500); } }
  };
  if (btnReset) btnReset.onclick = ()=>{
    try {
      const snapshot = designLastSaved; 
      if (snapshot) {
        fillDesignForm(snapshot);
        applyDesignVarsToAllPreviews();
        const sel = document.getElementById('previewPageSelect'); if (sel) renderPreviewOptions(sel.value);
        if (msg){ msg.textContent = 'שוחזר לערכים שמורים'; setTimeout(()=> msg.textContent='', 1500); }
      }
    } catch(e){ if (msg){ msg.textContent = 'שגיאה בשחזור'; setTimeout(()=> msg.textContent='', 1500); } }
  };
}

async function loadSales(){
  const box = qs('salesContainer');
  const totalsEl = qs('salesTotals');
  if (!box) return;
  box.textContent = 'טוען מכירות...';
  try {
    const q = buildOrdersQuery();
    const res = await api.get('/sales'+q);
    const list = res?.sales || [];
    const totals = res?.totals || { count: 0, commissions: 0 };
    if (totalsEl) totalsEl.textContent = `סה"כ מכירות: ${totals.count} | סה"כ עמלות: ₪${Number(totals.commissions||0).toLocaleString()}`;
    if (!list.length) { box.textContent = 'אין מכירות'; return; }
    const rows = list.map(s => `<tr>
      <td>${s.id||''}</td>
      <td>${s.agentId||''}</td>
      <td>${s.agentName||''}</td>
      <td>${s.productId||''}</td>
      <td>${s.productName||''}</td>
      <td>₪${Number(s.amount||0).toLocaleString()}</td>
      <td>₪${Number(s.commission||0).toLocaleString()}</td>
      <td>${s.date ? new Date(s.date).toLocaleString('he-IL') : ''}</td>
    </tr>`).join('');
    box.innerHTML = `<table class="table">
      <thead><tr><th>ID</th><th>Agent#</th><th>שם סוכן</th><th>מוצר#</th><th>שם מוצר</th><th>סכום</th><th>עמלה</th><th>תאריך</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  } catch (e) {
    box.textContent = 'שגיאה בטעינת מכירות';
  }
}

let productsCache = [];
let chByDate = null, chByProduct = null, chByAgent = null;

// i18n (he/en) – keys must match data-i18n attributes in HTML
const i18n = {
  he: {
    'ui.title': 'לוח ניהול מאוחד (שלב 1)',
    'ui.language': 'שפה',
    'ui.logout': 'התנתקות',
    'ui.checkingServer': 'בודק שרת... ',
    'ui.health': 'מצב שרת',
    'design.title': 'עיצוב',
    'design.joinBtnColor': 'צבע כפתור הצטרפות',
    'design.headerBgColor': 'צבע רקע כותרת',
    'design.progressBarColor': 'צבע פס התקדמות',
    'design.mainTitleColor': 'צבע כותרת ראשית',
    'design.discountBadgeBg': 'רקע תגית הנחה',
    'design.discountBadgeText': 'צבע טקסט תגית הנחה',
    'design.detailsBtnBg': 'רקע כפתור פרטים',
    'design.categoryTextColor': 'צבע טקסט קטגוריה',
    'design.priceSectionBg': 'רקע אזור מחיר',
    'design.shippingInfoBg': 'רקע מידע משלוח',
    'design.installmentsInfoBg': 'רקע מידע תשלומים',
    'design.cardRadius': 'רדיוס כרטיס',
    'design.gridMin': 'רוחב מינ׳ כרטיס',
    'design.gridGap': 'מרווח גריד',
    'design.pageBg': 'רקע עמוד',
    'design.priceTextColor': 'צבע מחיר',
    'design.daysLeftColor': 'צבע “ימים שנותרו”',
    'design.buttonRadius': 'רדיוס כפתור',
    'design.secondaryBtnBg': 'רקע כפתור משני',
    'design.secondaryBtnText': 'טקסט כפתור משני',
    'design.categoryChipBg': 'רקע תגית קטגוריה',
    'design.infoBg': 'רקע מידע',
    'design.warningBg': 'רקע אזהרה',
    'design.warningBorder': 'מסגרת אזהרה',
    'design.successBg': 'רקע הצלחה',
    'design.successBorder': 'מסגרת הצלחה',
    'design.save': 'שמירת עיצוב',
    'design.presetsTitle': 'ערכות צבעים מוכחות',
    'design.presetsIntro': 'בחר ערכת צבעים מוכחת מאתרי מכירות בינלאומיים מובילים',
    'preset.amazon': 'Amazon',
    'preset.ebay': 'eBay',
    'preset.shopify': 'Shopify',
    'preset.aliexpress': 'AliExpress',
    'preset.walmart': 'Walmart',
    'preset.etsy': 'Etsy',
    'db.tools': 'כלי DB:',
    'db.check': 'בדיקת חיבור DB',
    'db.seedDemo': 'ייבוא מוצרי דמו ל-DB',
    'tabs.agents': 'סוכנים',
    'tabs.products': 'מוצרים',
    'tabs.orders': 'הזמנות',
    'tabs.design': 'עיצוב'
  },
  en: {
    'ui.title': 'Unified Admin Dashboard (Phase 1)',
    'ui.language': 'Language',
    'ui.logout': 'Logout',
    'ui.checkingServer': 'Checking server...',
    'ui.health': 'Health',
    'design.title': 'Design',
    'design.joinBtnColor': 'Join Button Color',
    'design.headerBgColor': 'Header Bg Color',
    'design.progressBarColor': 'Progress Bar Color',
    'design.mainTitleColor': 'Main Title Color',
    'design.discountBadgeBg': 'Discount Badge BG',
    'design.discountBadgeText': 'Discount Badge Text',
    'design.detailsBtnBg': 'Details Button BG',
    'design.categoryTextColor': 'Category Text Color',
    'design.priceSectionBg': 'Price Section BG',
    'design.shippingInfoBg': 'Shipping Info BG',
    'design.installmentsInfoBg': 'Installments Info BG',
    'design.cardRadius': 'Card Radius',
    'design.gridMin': 'Grid Min (card)',
    'design.gridGap': 'Grid Gap',
    'design.pageBg': 'Page Background',
    'design.priceTextColor': 'Price Text Color',
    'design.daysLeftColor': 'Days Left Color',
    'design.buttonRadius': 'Button Radius',
    'design.secondaryBtnBg': 'Secondary Button BG',
    'design.secondaryBtnText': 'Secondary Button Text',
    'design.categoryChipBg': 'Category Chip BG',
    'design.infoBg': 'Info Background',
    'design.warningBg': 'Warning Background',
    'design.warningBorder': 'Warning Border',
    'design.successBg': 'Success Background',
    'design.successBorder': 'Success Border',
    'design.save': 'Save Design',
    'design.presetsTitle': 'Proven Color Presets',
    'design.presetsIntro': 'Pick a proven scheme from leading international e‑commerce sites',
    'preset.amazon': 'Amazon',
    'preset.ebay': 'eBay',
    'preset.shopify': 'Shopify',
    'preset.aliexpress': 'AliExpress',
    'preset.walmart': 'Walmart',
    'preset.etsy': 'Etsy',
    'db.tools': 'DB Tools:',
    'db.check': 'Check DB Connection',
    'db.seedDemo': 'Seed Demo Products',
    'tabs.agents': 'Agents',
    'tabs.products': 'Products',
    'tabs.orders': 'Orders',
    'tabs.design': 'Design'
  }
};

function applyLang(lang){
  const dict = i18n[lang] || i18n['he'];
  document.documentElement.setAttribute('lang', lang==='en'?'en':'he');
  document.documentElement.setAttribute('dir', lang==='en'?'ltr':'rtl');
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if (key && dict[key]) el.textContent = dict[key];
  });
  const sel = qs('langSelect'); if (sel) sel.value = lang;
  try { localStorage.setItem('admin_lang', lang); } catch {}
}

function bindLang(){
  const sel = qs('langSelect');
  if (sel) sel.addEventListener('change', ()=> applyLang(sel.value));
  let lang = 'he';
  try { lang = localStorage.getItem('admin_lang') || 'he'; } catch {}
  applyLang(lang);
}

function bindDbTools(){
  const statusBtn = qs('dbStatusBtn');
  const seedBtn = qs('seedProductsBtn');
  const txt = qs('dbStatusText');
  if (statusBtn) statusBtn.onclick = async ()=>{
    try {
      const r = await api.get('/admin/db-status');
      txt.textContent = r.connected ? 'מחובר ל-DB' : 'אין חיבור DB';
      txt.classList.remove('text-success','text-danger');
      txt.classList.add(r.connected ? 'text-success' : 'text-danger');
    }
    catch(e){
      txt.textContent = 'שגיאה בבדיקת DB';
      txt.classList.remove('text-success');
      txt.classList.add('text-danger');
    }
  };
  if (seedBtn) seedBtn.onclick = async ()=>{
    try { const r = await api.post('/admin/seed-products', {}); alert(`ייבוא הושלם: ${r.inserted||0} מוצרים`); }
    catch(e){ alert('שגיאה בייבוא: '+ e.message); }
  };
}

// Orders
function buildOrdersQuery(){
  const from = qs('ordersFrom')?.value || '';
  const to = qs('ordersTo')?.value || '';
  const productId = qs('ordersProduct')?.value || '';
  const agentId = qs('ordersAgent')?.value || '';
  const parts = [];
  if (from) parts.push('from='+encodeURIComponent(from));
  if (to) parts.push('to='+encodeURIComponent(to));
  if (productId) parts.push('productId='+encodeURIComponent(productId));
  if (agentId) parts.push('agentId='+encodeURIComponent(agentId));
  return parts.length? ('?'+parts.join('&')) : '';
}

async function loadOrders(){
  const box = qs('ordersContainer');
  const totalsEl = qs('ordersTotals');
  box.textContent = 'טוען הזמנות...';
  try {
    const q = buildOrdersQuery();
    const res = await api.get('/orders'+q);
    const list = res?.orders || [];
    const totals = res?.totals || { count: 0, sum: 0 };
    totalsEl.textContent = `סה"כ הזמנות: ${totals.count} | סה"כ סכום: ₪${Number(totals.sum||0).toLocaleString()}`;
    if (!list.length) { box.textContent = 'אין הזמנות'; return; }
    const showDev = (location.hostname==='localhost' || location.hostname==='127.0.0.1');
    const rows = list.map(o => {
      const st = (o.status||'pending').toLowerCase();
      const stCls = st==='paid' ? 'text-success' : (st==='canceled' ? 'text-danger' : 'muted');
      return `<tr>
        <td>${o.id}</td>
        <td>${o.productId}</td>
        <td>${o.productName||''}</td>
        <td>${o.quantity}</td>
        <td>₪${Number(o.totalAmount||0).toLocaleString()}</td>
        <td><span class="${stCls}">${st}</span></td>
        <td>${o.paymentRef||''}</td>
        <td>${o.agentId||''}</td>
        <td>${o.agentName||''}</td>
        <td>${o.createdAt? new Date(o.createdAt).toLocaleString('he-IL'):''}</td>
        <td>
          <button class="btn btn-outline-danger btn-del-order" data-id="${o.id}">מחק</button>
          ${showDev ? `<button class=\"btn btn-outline-success btn-mark-paid\" data-id=\"${o.id}\">סמן שולם</button>` : ''}
          ${showDev ? `<button class=\"btn btn-outline btn-mark-canceled\" data-id=\"${o.id}\">סמן בוטל</button>` : ''}
        </td>
      </tr>`;
    }).join('');
    box.innerHTML = `<table class="table">
      <thead><tr><th>ID</th><th>מוצר#</th><th>שם מוצר</th><th>כמות</th><th>סכום</th><th>סטטוס</th><th>אסמכתא</th><th>AgentID</th><th>שם סוכן</th><th>נוצר ב</th><th>פעולות</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
    const exportBtn = qs('exportOrdersBtn');
    if (exportBtn) exportBtn.onclick = ()=>window.open(computeApiBase()+'/orders.csv'+buildOrdersQuery(),'_blank');
    box.querySelectorAll('.btn-del-order').forEach(btn=> btn.addEventListener('click', onDeleteOrder));
    box.querySelectorAll('.btn-mark-paid').forEach(btn=> btn.addEventListener('click', async (e)=>{ const id=e.currentTarget.getAttribute('data-id'); try{ await api.post('/payments/dev/mark',{ orderId:id, status:'paid' }); await loadOrders(); }catch(err){ alert('שגיאה בעדכון סטטוס: '+err.message); } }));
    box.querySelectorAll('.btn-mark-canceled').forEach(btn=> btn.addEventListener('click', async (e)=>{ const id=e.currentTarget.getAttribute('data-id'); try{ await api.post('/payments/dev/mark',{ orderId:id, status:'canceled' }); await loadOrders(); }catch(err){ alert('שגיאה בעדכון סטטוס: '+err.message); } }));
    await loadOrdersSummary();
  } catch (e) {
    box.textContent = `שגיאה בטעינת הזמנות: ${e.message}`;
  }
}
async function prepareOrdersFilters(){
  const selProd = qs('ordersProduct');
  const selAgent = qs('ordersAgent');
  if (!selProd || !selAgent) return;
  // Populate products
  try {
    const resP = await api.get('/products');
    const items = resP?.data || [];
    selProd.innerHTML = '<option value="">הכל</option>' + items.map(p=>`<option value="${p.id}">${(p.name||'')}</option>`).join('');
  } catch {}
  // Populate agents
  try {
    const resA = await api.get('/agents/all');
    const list = resA?.agents || [];
    selAgent.innerHTML = '<option value="">הכל</option>' + list.map(a=>`<option value="${a.id}">${(a.full_name||'Agent #'+a.id)}</option>`).join('');
  } catch {}
  const btnFilter = qs('ordersFilterBtn');
  const btnClear = qs('ordersClearBtn');
  if (btnFilter) btnFilter.onclick = async ()=> { await loadOrders(); await loadOrdersSummary(); await loadSales(); };
  if (btnClear) btnClear.onclick = async ()=>{ if (qs('ordersFrom')) qs('ordersFrom').value=''; if (qs('ordersTo')) qs('ordersTo').value=''; if (qs('ordersProduct')) qs('ordersProduct').value=''; if (qs('ordersAgent')) qs('ordersAgent').value=''; await loadOrders(); await loadOrdersSummary(); await loadSales(); };
  const exportSales = qs('exportSalesBtn');
  if (exportSales) exportSales.onclick = ()=> window.open(computeApiBase()+'/sales.csv'+buildOrdersQuery(),'_blank');
  // initial sales load using current filters
  await loadSales();
}

async function onDeleteOrder(ev){
  const id = ev.currentTarget.getAttribute('data-id');
  if (!id) return;
  if (!confirm('למחוק הזמנה?')) return;
  try { await api.delete(`/orders/${id}`); await loadOrders(); }
  catch(e){ alert('שגיאה במחיקת הזמנה: '+ e.message); }
}

function buildSummaryQuery(){
  const from = qs('ordersFrom')?.value || '';
  const to = qs('ordersTo')?.value || '';
  const parts = [];
  if (from) parts.push('from='+encodeURIComponent(from));
  if (to) parts.push('to='+encodeURIComponent(to));
  return parts.length? ('?'+parts.join('&')) : '';
}

async function loadOrdersSummary(){
  try{
    if (!(window.Chart)) return;
    const q = buildSummaryQuery();
    const res = await api.get('/orders/summary'+q);
    const byDate = res?.byDate || [];
    const byProd = res?.byProduct || [];
    const byAgent = res?.byAgent || [];
    renderCharts(byDate, byProd, byAgent);
  }catch(e){ /* ignore */ }
}

function ensureCtx(id){ const c = qs(id); return c ? c.getContext('2d') : null; }

function renderCharts(byDate, byProd, byAgent){
  const ctxDate = ensureCtx('chartByDate');
  const ctxProd = ensureCtx('chartByProduct');
  const ctxAgent = ensureCtx('chartByAgent');
  if (ctxDate){
    const labels = byDate.map(x=>x.day);
    const sums = byDate.map(x=>Number(x.sum||0));
    if (chByDate) chByDate.destroy();
    chByDate = new Chart(ctxDate, { type:'line', data:{ labels, datasets:[{ label:'₪ מכירות', data:sums, borderColor:'#667eea', backgroundColor:'rgba(102,126,234,0.2)', tension:0.25 }]}, options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ autoSkip:true, maxTicksLimit:10 } }, y:{ beginAtZero:true } } } });
  }
  if (ctxProd){
    const top = byProd.slice(0,8);
    const labels = top.map(x=>x.name || ('#'+x.id));
    const sums = top.map(x=>Number(x.sum||0));
    if (chByProduct) chByProduct.destroy();
    chByProduct = new Chart(ctxProd, { type:'bar', data:{ labels, datasets:[{ label:'₪ לפי מוצר', data:sums, backgroundColor:'#28a745' }]}, options:{ plugins:{ legend:{ display:false } }, indexAxis:'y', scales:{ x:{ beginAtZero:true } } } });
  }
  if (ctxAgent){
    const top = byAgent.slice(0,8);
    const labels = top.map(x=>x.full_name || ('Agent #'+x.id));
    const sums = top.map(x=>Number(x.sum||0));
    if (chByAgent) chByAgent.destroy();
    chByAgent = new Chart(ctxAgent, { type:'bar', data:{ labels, datasets:[{ label:'₪ לפי סוכן', data:sums, backgroundColor:'#ff9800' }]}, options:{ plugins:{ legend:{ display:false } }, indexAxis:'y', scales:{ x:{ beginAtZero:true } } } });
  }
}

function show(id){ const el = qs(id); if (el) el.classList.remove('hidden'); }
function hide(id){ const el = qs(id); if (el) el.classList.add('hidden'); }

async function checkHealth(){
  const el = qs('health');
  try {
    const data = await api.get('/health');
    let lang = 'he'; try { lang = localStorage.getItem('admin_lang') || 'he'; } catch {}
    const dict = i18n[lang] || i18n['he'];
    const status = String(data.status||'').toLowerCase();
    const statusText = (lang==='he' && status==='ok') ? 'תקין' : (status || 'unknown');
    el.textContent = `${dict['ui.health']}: ${statusText}`;
  }
  catch(e){ el.textContent = (i18n['he']['ui.health']+': שגיאה'); }
}

async function ensureAdmin(){
  try {
    const res = await api.get('/admin/status');
    if (!res?.success && res?.error) throw new Error(res.error);
  } catch (e) {
    // If auth is enabled, server returns 401/403. Redirect to login.
    window.location.href = 'login.html';
  }
}

function bindLogout(){
  const btn = qs('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', async ()=>{
    try { await api.post('/admin/logout', {}); } catch {}
    window.location.href = 'login.html';
  });
}

const designPresets = {
  amazon: {
    joinBtnColor:'#FF9900', headerBgColor:'#ffffff', progressBarColor:'#FF9900', mainTitleColor:'#111111',
    discountBadgeBg:'#B12704', discountBadgeText:'#ffffff', detailsBtnBg:'linear-gradient(135deg,#232F3E 0%,#37475A 100%)', categoryTextColor:'#232F3E',
    priceSectionBg:'linear-gradient(135deg,#FF9900 0%,#F90 100%)', shippingInfoBg:'linear-gradient(135deg,#146eb4 0%,#0d538a 100%)', installmentsInfoBg:'#f0f8ff',
    cardRadius:'16px', gridMin:'320px', gridGap:'1.5rem', pageBg:'linear-gradient(135deg,#f7f7f7 0%,#ffffff 100%)', priceTextColor:'#B12704', daysLeftColor:'#B12704',
    buttonRadius:'24px', secondaryBtnBg:'#37475A', secondaryBtnText:'#ffffff', categoryChipBg:'linear-gradient(135deg,#232F3E 0%,#37475A 100%)',
    infoBg:'linear-gradient(135deg,#146eb4 0%,#0d538a 100%)', warningBg:'linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%)', warningBorder:'#f39c12', successBg:'rgba(46,204,113,0.1)', successBorder:'#2ecc71'
  },
  ebay: {
    joinBtnColor:'#0064D2', headerBgColor:'#ffffff', progressBarColor:'#FFA500', mainTitleColor:'#222222',
    discountBadgeBg:'#E53238', discountBadgeText:'#ffffff', detailsBtnBg:'linear-gradient(135deg,#0064D2 0%,#004A9F 100%)', categoryTextColor:'#0064D2',
    priceSectionBg:'linear-gradient(135deg,#E53238 0%,#0064D2 100%)', shippingInfoBg:'linear-gradient(135deg,#86B817 0%,#5E8C0A 100%)', installmentsInfoBg:'#ecf5ff',
    cardRadius:'18px', gridMin:'340px', gridGap:'1.8rem', pageBg:'linear-gradient(135deg,#f5f9ff 0%,#ffffff 100%)', priceTextColor:'#E53238', daysLeftColor:'#F18E00',
    buttonRadius:'24px', secondaryBtnBg:'#FFA500', secondaryBtnText:'#222222', categoryChipBg:'linear-gradient(135deg,#0064D2 0%,#004A9F 100%)',
    infoBg:'linear-gradient(135deg,#86B817 0%,#5E8C0A 100%)', warningBg:'linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%)', warningBorder:'#f39c12', successBg:'rgba(46,204,113,0.1)', successBorder:'#2ecc71'
  },
  shopify: {
    joinBtnColor:'#95BF47', headerBgColor:'#ffffff', progressBarColor:'#5E8E3E', mainTitleColor:'#222222',
    discountBadgeBg:'#E43D40', discountBadgeText:'#ffffff', detailsBtnBg:'linear-gradient(135deg,#95BF47 0%,#5E8E3E 100%)', categoryTextColor:'#5E8E3E',
    priceSectionBg:'linear-gradient(135deg,#95BF47 0%,#5E8E3E 100%)', shippingInfoBg:'linear-gradient(135deg,#5E8E3E 0%,#3D6B2A 100%)', installmentsInfoBg:'#f4ffe8',
    cardRadius:'20px', gridMin:'360px', gridGap:'2rem', pageBg:'linear-gradient(135deg,#f7fff0 0%,#ffffff 100%)', priceTextColor:'#E43D40', daysLeftColor:'#5E8E3E',
    buttonRadius:'26px', secondaryBtnBg:'#232F3E', secondaryBtnText:'#ffffff', categoryChipBg:'linear-gradient(135deg,#95BF47 0%,#5E8E3E 100%)',
    infoBg:'linear-gradient(135deg,#5E8E3E 0%,#3D6B2A 100%)', warningBg:'linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%)', warningBorder:'#f39c12', successBg:'rgba(46,204,113,0.1)', successBorder:'#2ecc71'
  },
  aliexpress: {
    joinBtnColor:'#FF4747', headerBgColor:'#ffffff', progressBarColor:'#FF7A00', mainTitleColor:'#222222',
    discountBadgeBg:'#FF4747', discountBadgeText:'#ffffff', detailsBtnBg:'linear-gradient(135deg,#FF4747 0%,#D93636 100%)', categoryTextColor:'#FF4747',
    priceSectionBg:'linear-gradient(135deg,#FF7A00 0%,#FF4747 100%)', shippingInfoBg:'linear-gradient(135deg,#FF7A00 0%,#D45A00 100%)', installmentsInfoBg:'#fff5ef',
    cardRadius:'18px', gridMin:'340px', gridGap:'1.5rem', pageBg:'linear-gradient(135deg,#fff7f5 0%,#ffffff 100%)', priceTextColor:'#FF4747', daysLeftColor:'#FF7A00',
    buttonRadius:'24px', secondaryBtnBg:'#222222', secondaryBtnText:'#ffffff', categoryChipBg:'linear-gradient(135deg,#FF4747 0%,#D93636 100%)',
    infoBg:'linear-gradient(135deg,#FF7A00 0%,#D45A00 100%)', warningBg:'linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%)', warningBorder:'#f39c12', successBg:'rgba(46,204,113,0.1)', successBorder:'#2ecc71'
  },
  walmart: {
    joinBtnColor:'#0071CE', headerBgColor:'#ffffff', progressBarColor:'#FFC220', mainTitleColor:'#222222',
    discountBadgeBg:'#E60023', discountBadgeText:'#ffffff', detailsBtnBg:'linear-gradient(135deg,#0071CE 0%,#004A9F 100%)', categoryTextColor:'#0071CE',
    priceSectionBg:'linear-gradient(135deg,#0071CE 0%,#004A9F 100%)', shippingInfoBg:'linear-gradient(135deg,#FFC220 0%,#E0A800 100%)', installmentsInfoBg:'#f0f8ff',
    cardRadius:'18px', gridMin:'340px', gridGap:'1.8rem', pageBg:'linear-gradient(135deg,#f5f9ff 0%,#ffffff 100%)', priceTextColor:'#E60023', daysLeftColor:'#FFC220',
    buttonRadius:'24px', secondaryBtnBg:'#FFC220', secondaryBtnText:'#222222', categoryChipBg:'linear-gradient(135deg,#0071CE 0%,#004A9F 100%)',
    infoBg:'linear-gradient(135deg,#FFC220 0%,#E0A800 100%)', warningBg:'linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%)', warningBorder:'#f39c12', successBg:'rgba(46,204,113,0.1)', successBorder:'#2ecc71'
  },
  etsy: {
    joinBtnColor:'#D5641C', headerBgColor:'#ffffff', progressBarColor:'#FFAC6B', mainTitleColor:'#2c3e50',
    discountBadgeBg:'#D5641C', discountBadgeText:'#ffffff', detailsBtnBg:'linear-gradient(135deg,#D5641C 0%,#B54E0F 100%)', categoryTextColor:'#B54E0F',
    priceSectionBg:'linear-gradient(135deg,#FFAC6B 0%,#D5641C 100%)', shippingInfoBg:'linear-gradient(135deg,#2c3e50 0%,#1f2a36 100%)', installmentsInfoBg:'#fff6ee',
    cardRadius:'18px', gridMin:'340px', gridGap:'1.8rem', pageBg:'linear-gradient(135deg,#fff8f2 0%,#ffffff 100%)', priceTextColor:'#D5641C', daysLeftColor:'#FFAC6B',
    buttonRadius:'24px', secondaryBtnBg:'#2c3e50', secondaryBtnText:'#ffffff', categoryChipBg:'linear-gradient(135deg,#D5641C 0%,#B54E0F 100%)',
    infoBg:'linear-gradient(135deg,#2c3e50 0%,#1f2a36 100%)', warningBg:'linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%)', warningBorder:'#f39c12', successBg:'rgba(46,204,113,0.1)', successBorder:'#2ecc71'
  }
};

function fillDesignForm(values){
  Object.entries(values||{}).forEach(([k,v])=>{
    const id = 'ds_'+k; const el = qs(id); if (el) el.value = v;
  });
}


// פונקציה לטעינה מחדש של CSS הצבעים בלבד
function reloadThemeCSS() {
  const themeLinks = document.querySelectorAll('link[href*="assets/theme.css"], link[href*="assets/css/theme.css"], link[href$="theme.css"]');
  themeLinks.forEach(link => {
    const newLink = document.createElement('link');
    newLink.rel = 'stylesheet';
    newLink.href = link.href + '?v=' + Date.now(); // Cache busting
    link.parentNode.insertBefore(newLink, link.nextSibling);
    setTimeout(() => link.remove(), 100); // הסרה של הקישור הישן
  });
  
  // עדכון CSS variables במידה והם לא נטענים מהשרת
  updateCSSVariables();
  try { refreshPreviews(); } catch {}
}

// פונקציה לעדכון משתני CSS ישירות
function updateCSSVariables() {
  // כאן אפשר להוסיף עדכון ישיר של משתני CSS אם צריך
  console.log('🎨 CSS variables updated');
}

function bindPresets(){
  document.querySelectorAll('.preset-card').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const key = btn.getAttribute('data-preset');
      const preset = designPresets[key];
      if (!preset) return;
      fillDesignForm(preset);
      try { await api.post('/design', preset); qs('designSaveMsg').textContent = 'נשמרה ערכה: '+ key + ' - מעדכן צבעים...'; setTimeout(()=> { 
        qs('designSaveMsg').textContent='✅ הצבעים עודכנו בהצלחה!'; 
        // טעינה מחדש של CSS בלבד (ללא רענון דף)
        reloadThemeCSS();
        try { refreshPreviews(); } catch {}
        try { const sel=document.getElementById('previewPageSelect'); if (sel) renderPreviewOptions(sel.value); } catch {}
        try { applyDesignVarsToAllPreviews(); } catch {}
        setTimeout(()=> qs('designSaveMsg').textContent='', 3000);
      }, 1000); }
      catch(e){ qs('designSaveMsg').textContent = 'שגיאה בשמירת ערכה: '+e.message; }
    });
  });
}

// Products
async function loadProducts(){
  const container = qs('productsContainer');
  container.textContent = 'טוען מוצרים...';
  try {
    const res = await api.get('/products');
    const items = res?.data || [];
    productsCache = items;
    if (!items.length) { container.textContent = 'אין מוצרים'; return; }
    const rows = items.map(p => `<tr>
      <td>${p.id}</td>
      <td>${p.name||''}</td>
      <td>${p.category||''}</td>
      <td>₪${(p.price||0).toLocaleString()}</td>
      <td>₪${(p.originalPrice||0).toLocaleString()}</td>
      <td>
        <button data-id="${p.id}" class="btn btn-outline-primary btn-edit">ערוך</button>
        <button data-id="${p.id}" data-name="${(p.name||'').replace(/\"/g,'&quot;')}" class="btn btn-outline btn-participants">משתתפים</button>
        <button data-id="${p.id}" class="btn btn-outline-danger btn-del">מחק</button>
      </td>
    </tr>`).join('');
    container.innerHTML = `<table class="table">
      <thead><tr><th>ID</th><th>שם</th><th>קטגוריה</th><th>מחיר</th><th>מחיר מקורי</th><th>פעולות</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
    container.querySelectorAll('.btn-del').forEach(btn => btn.addEventListener('click', onDeleteProduct));
    container.querySelectorAll('.btn-participants').forEach(btn => btn.addEventListener('click', onViewParticipants));
    container.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', onEditProduct));
  } catch(e) {
    container.textContent = `שגיאה בטעינת מוצרים: ${e.message}`;
  }
}

function showEditModal(show){ const m = qs('editProductModal'); if (!m) return; if (show) m.classList.add('show'); else m.classList.remove('show'); }

function onEditProduct(ev){
  const id = Number(ev.currentTarget.getAttribute('data-id'));
  const p = (productsCache||[]).find(x=>Number(x.id)===id);
  if (!p) return;
  qs('ep_id').value = p.id;
  qs('ep_name').value = p.name||'';
  qs('ep_category').value = p.category||'';
  qs('ep_price').value = Number(p.price||0);
  qs('ep_originalPrice').value = Number(p.originalPrice||0);
  qs('ep_stock').value = Number(p.stock||0);
  qs('ep_image').value = p.image||'';
  const epPT = qs('ep_purchaseType'); if (epPT) epPT.value = (p.purchaseType||'group');
  qs('ep_gb_active').value = String(p.groupBuy?.isActive===true);
  qs('ep_gb_current').value = Number(p.groupBuy?.currentParticipants||0);
  qs('ep_gb_min').value = Number(p.groupBuy?.minParticipants||0);
  qs('ep_gb_max').value = Number(p.groupBuy?.maxParticipants||0);
  if (p.groupBuy?.endDate) {
    try { qs('ep_gb_end').value = (new Date(p.groupBuy.endDate)).toISOString().slice(0,10); } catch {}
  } else { qs('ep_gb_end').value = ''; }
  qs('ep_ship_cost').value = Number(p.shipping?.cost||0);
  qs('ep_ship_days').value = Number(p.shipping?.deliveryDays||3);
  showEditModal(true);
}

async function onSaveEditProduct(){
  const id = Number(qs('ep_id').value);
  const payload = {
    name: qs('ep_name').value.trim(),
    category: qs('ep_category').value.trim(),
    price: Number(qs('ep_price').value||0),
    originalPrice: Number(qs('ep_originalPrice').value||0),
    stock: Number(qs('ep_stock').value||0),
    image: qs('ep_image').value.trim(),
    purchaseType: (qs('ep_purchaseType')?.value || 'group'),
    groupBuy: {
      isActive: qs('ep_gb_active').value === 'true',
      currentParticipants: Number(qs('ep_gb_current').value||0),
      minParticipants: Number(qs('ep_gb_min').value||0),
      maxParticipants: Number(qs('ep_gb_max').value||0),
      endDate: qs('ep_gb_end').value ? new Date(qs('ep_gb_end').value).toISOString() : null
    },
    shipping: {
      cost: Number(qs('ep_ship_cost').value||0),
      deliveryDays: Number(qs('ep_ship_days').value||3)
    }
  };
  try { await api.put(`/products/${id}`, payload); showEditModal(false); await loadProducts(); }
  catch(e){ alert('שגיאה בשמירה: '+ e.message); }
}

async function onDeleteProduct(ev){
  const id = ev.currentTarget.getAttribute('data-id');
  if (!id) return;
  if (!confirm('למחוק את המוצר?')) return;
  try { await api.delete(`/products/${id}`); await loadProducts(); }
  catch(e){ alert('שגיאה במחיקה: '+e.message); }
}

async function onViewParticipants(ev){
  const id = ev.currentTarget.getAttribute('data-id');
  const name = ev.currentTarget.getAttribute('data-name') || `#${id}`;
  const hint = qs('participantsHint');
  const box = qs('participantsContainer');
  hint.textContent = `מוצר: ${name}`;
  box.textContent = 'טוען משתתפים...';
  const exportBtn = qs('exportParticipantsBtn');
  if (exportBtn) { exportBtn.disabled = false; exportBtn.onclick = ()=>{ window.open(`${computeApiBase()}/products/${id}/participants.csv`, '_blank'); }; }
  try {
    const res = await api.get(`/products/${id}/participants`);
    const list = res?.data || [];
    if (!list.length) { box.textContent = 'אין משתתפים למוצר זה'; return; }
    const rows = list.map(u => `<tr>
      <td>${u.id}</td>
      <td>${u.name||''}</td>
      <td>${u.email||''}</td>
      <td>${u.phone||''}</td>
      <td>${u.joinedAt? new Date(u.joinedAt).toLocaleString('he-IL') : ''}</td>
      <td>${u.referralCode||''}</td>
      <td>${u.agentId||''}</td>
    </tr>`).join('');
    box.innerHTML = `<table class="table">
      <thead><tr><th>ID</th><th>שם</th><th>אימייל</th><th>טלפון</th><th>מועד הצטרפות</th><th>רפרל</th><th>Agent</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  } catch (e) {
    box.textContent = `שגיאה בטעינת משתתפים: ${e.message}`;
  }
}

function bindNewProductForm(){
  const form = qs('newProductForm');
  if (!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const pt = (qs('np_purchaseType')?.value || 'immediate');
    const shipDays = pt==='group' ? 60 : 2;
    const payload = {
      name: qs('np_name').value.trim(),
      category: qs('np_category').value.trim(),
      price: Number(qs('np_price').value),
      originalPrice: Number(qs('np_originalPrice').value),
      image: qs('np_image').value.trim(),
      purchaseType: pt,
      groupBuy: { isActive:(pt==='group'), currentParticipants:0, minParticipants:5, maxParticipants:20, endDate: new Date(Date.now()+7*864e5).toISOString() },
      shipping: { cost:29, deliveryDays: shipDays },
      details: { images: [], video:'', warranty:'', inBox:[] }
    };
    try { await api.post('/products', payload); await loadProducts(); form.reset(); }
    catch(e){ alert('שגיאה בהוספה: '+e.message); }
  });
}

// Design tab
async function loadDesign(){
  try {
    const res = await api.get('/design');
    const d = res?.data || {};
    const set = (id, val)=>{ const el=qs(id); if (el && val!=null) el.value = val; };
    set('ds_joinBtnColor', d.joinBtnColor);
    set('ds_headerBgColor', d.headerBgColor);
    set('ds_progressBarColor', d.progressBarColor);
    set('ds_mainTitleColor', d.mainTitleColor);
    set('ds_discountBadgeBg', d.discountBadgeBg);
    set('ds_discountBadgeText', d.discountBadgeText);
    set('ds_detailsBtnBg', d.detailsBtnBg);
    set('ds_categoryTextColor', d.categoryTextColor);
    set('ds_priceSectionBg', d.priceSectionBg);
    set('ds_shippingInfoBg', d.shippingInfoBg);
    set('ds_installmentsInfoBg', d.installmentsInfoBg);
    set('ds_cardRadius', d.cardRadius);
    set('ds_gridMin', d.gridMin);
    set('ds_gridGap', d.gridGap);
    set('ds_pageBg', d.pageBg);
    set('ds_priceTextColor', d.priceTextColor);
    set('ds_daysLeftColor', d.daysLeftColor);
    set('ds_buttonRadius', d.buttonRadius);
    set('ds_secondaryBtnBg', d.secondaryBtnBg);
    set('ds_secondaryBtnText', d.secondaryBtnText);
    set('ds_categoryChipBg', d.categoryChipBg);
    set('ds_infoBg', d.infoBg);
    set('ds_warningBg', d.warningBg);
    set('ds_warningBorder', d.warningBorder);
    set('ds_successBg', d.successBg);
    set('ds_successBorder', d.successBorder);
    // keep snapshot for Reset
    designLastSaved = { ...d };
    // update in-preview UI now that values are in inputs
    try {
      const sel = document.getElementById('previewPageSelect');
      if (sel) renderPreviewOptions(sel.value);
    } catch {}
    // re-apply live vars
    try { applyDesignVarsToAllPreviews(); } catch {}
  } catch(e){}
}

function bindDesignForm(){
  const form = qs('designForm');
  if (!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const payload = {
      joinBtnColor: qs('ds_joinBtnColor')?.value,
      headerBgColor: qs('ds_headerBgColor')?.value,
      progressBarColor: qs('ds_progressBarColor')?.value,
      mainTitleColor: qs('ds_mainTitleColor')?.value,
      discountBadgeBg: qs('ds_discountBadgeBg')?.value,
      discountBadgeText: qs('ds_discountBadgeText')?.value,
      detailsBtnBg: qs('ds_detailsBtnBg')?.value,
      categoryTextColor: qs('ds_categoryTextColor')?.value,
      priceSectionBg: qs('ds_priceSectionBg')?.value,
      shippingInfoBg: qs('ds_shippingInfoBg')?.value,
      installmentsInfoBg: qs('ds_installmentsInfoBg')?.value,
      cardRadius: qs('ds_cardRadius')?.value,
      gridMin: qs('ds_gridMin')?.value,
      gridGap: qs('ds_gridGap')?.value,
      pageBg: qs('ds_pageBg')?.value,
      priceTextColor: qs('ds_priceTextColor')?.value,
      daysLeftColor: qs('ds_daysLeftColor')?.value,
      buttonRadius: qs('ds_buttonRadius')?.value,
      secondaryBtnBg: qs('ds_secondaryBtnBg')?.value,
      secondaryBtnText: qs('ds_secondaryBtnText')?.value,
      categoryChipBg: qs('ds_categoryChipBg')?.value,
      infoBg: qs('ds_infoBg')?.value,
      warningBg: qs('ds_warningBg')?.value,
      warningBorder: qs('ds_warningBorder')?.value,
      successBg: qs('ds_successBg')?.value,
      successBorder: qs('ds_successBorder')?.value
    };
    try { const res = await api.post('/design', payload); qs('designSaveMsg').textContent = 'נשמר בהצלחה'; reloadThemeCSS(); try { refreshPreviews(); } catch {}; setTimeout(()=>qs('designSaveMsg').textContent='', 2000); }
    catch(e){ qs('designSaveMsg').textContent = 'שגיאה בשמירה: '+e.message; }
  });
}

function bindTabs(){
  const agentsBtn = qs('tabAgents');
  const productsBtn = qs('tabProducts');
  const ordersBtn = qs('tabOrders');
  const designBtn = qs('tabDesign');
  agentsBtn.addEventListener('click', async ()=>{ show('agentsSection'); hide('productsSection'); hide('designSection'); await loadAgents(); });
  productsBtn.addEventListener('click', ()=>{ hide('agentsSection'); show('productsSection'); hide('ordersSection'); hide('designSection'); });
  ordersBtn.addEventListener('click', async ()=>{ hide('agentsSection'); hide('productsSection'); show('ordersSection'); hide('designSection'); await prepareOrdersFilters(); await loadOrders(); await loadOrdersSummary(); await loadSales(); });
  designBtn.addEventListener('click', ()=>{ hide('agentsSection'); hide('productsSection'); hide('ordersSection'); show('designSection'); });
}

document.addEventListener('DOMContentLoaded', async () => {
  await ensureAdmin();
  await checkHealth();
  bindTabs();
  bindNewProductForm();
  bindDesignForm();
  bindLogout();
  bindDbTools();
  bindLang();
  bindPresets();
  initPreviews();
  const btnSave = qs('editProductSave'); if (btnSave) btnSave.addEventListener('click', onSaveEditProduct);
  const btnCancel = qs('editProductCancel'); if (btnCancel) btnCancel.addEventListener('click', ()=> showEditModal(false));
  const modal = qs('editProductModal'); if (modal) modal.addEventListener('click', (e)=>{ if (e.target===modal) showEditModal(false); });
  await loadProducts();
  await loadDesign();
  initColorPreviews();
  try { const legacyForm = qs('designForm'); if (legacyForm) legacyForm.style.display = 'none'; } catch {}
});

// Agents
async function loadAgents(){
  const box = qs('agentsContainer');
  box.textContent = 'טוען סוכנים...';
  try {
    const res = await api.get('/agents/all');
    const list = res?.agents || [];
    if (!list.length) { box.textContent = 'אין סוכנים'; return; }
    const rows = list.map(a => `<tr>
      <td>${a.id}</td>
      <td>${a.full_name||''}</td>
      <td>${a.email||''}</td>
      <td>${a.referral_code||''}</td>
      <td>${a.visits||0}</td>
      <td>${a.sales||0}</td>
      <td>₪${(a.totalCommissions||0).toLocaleString()}</td>
      <td>${a.is_active? '<span class="text-success">פעיל</span>' : '<span class="text-danger">חסום</span>'}</td>
      <td>
        <button data-id="${a.id}" data-active="${a.is_active}" class="btn btn-outline btn-toggle">${a.is_active? 'חסום' : 'הפעל'}</button>
        <button data-id="${a.id}" class="btn btn-outline-primary btn-ref">קישור רפרל</button>
        <button data-id="${a.id}" class="btn btn-outline-danger btn-delete">מחק</button>
      </td>
    </tr>`).join('');
    box.innerHTML = `<table class="table">
      <thead><tr><th>ID</th><th>שם</th><th>אימייל</th><th>רפרל</th><th>ביקורים</th><th>מכירות</th><th>עמלות</th><th>סטטוס</th><th>פעולות</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
    box.querySelectorAll('.btn-toggle').forEach(b => b.addEventListener('click', onToggleAgent));
    box.querySelectorAll('.btn-ref').forEach(b => b.addEventListener('click', onCopyRefLink));
    box.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', onDeleteAgent));
  } catch(e) {
    box.textContent = `שגיאה בטעינת סוכנים: ${e.message}`;
  }
}

async function onToggleAgent(ev){
  const id = ev.currentTarget.getAttribute('data-id');
  const current = ev.currentTarget.getAttribute('data-active') === 'true';
  if (!id) return;
  try { await api.post(`/admin/agent/${id}/toggle-status`, { is_active: !current }); await loadAgents(); }
  catch(e){ alert('שגיאה בשינוי סטטוס: '+ e.message); }
}

async function onDeleteAgent(ev){
  const id = ev.currentTarget.getAttribute('data-id');
  if (!id) return;
  if (!confirm('למחוק את הסוכן?')) return;
  try { await api.delete(`/admin/agent/${id}`); await loadAgents(); }
  catch(e){ alert('שגיאה במחיקת סוכן: '+ e.message); }
}

async function onCopyRefLink(ev){
  const id = ev.currentTarget.getAttribute('data-id');
  if (!id) return;
  try {
    const res = await api.get(`/agent/${id}/referral-link`);
    const link = res?.referral_link || '';
    if (!link) throw new Error('לא נמצא קישור');
    await navigator.clipboard.writeText(link);
    alert('קישור הועתק');
  } catch (e) {
    alert('שגיאה בקבלת קישור: '+ e.message);
  }
}

// Initialize color preview functionality
function initColorPreviews() {
  // Handle old color inputs
  const colorInputs = document.querySelectorAll('.color-input');
  colorInputs.forEach(input => {
    const wrapper = input.closest('.color-input-wrapper');
    if (!wrapper) return;
    
    const preview = wrapper.querySelector('.color-preview');
    if (!preview) return;
    
    const updatePreview = () => {
      const color = input.value;
      preview.style.background = color;
      preview.setAttribute('data-color', color);
    };
    
    updatePreview();
    input.addEventListener('input', updatePreview);
    input.addEventListener('change', updatePreview);
  });

  // Handle new color pickers
  const colorPickers = document.querySelectorAll('.color-picker');
  colorPickers.forEach(picker => {
    const field = picker.closest('.color-field');
    if (!field) return;
    
    const colorBox = field.querySelector('.color-box');
    const colorCode = field.querySelector('.color-code');
    
    if (!colorBox || !colorCode) return;
    
    const updateColor = () => {
      const color = picker.value;
      colorBox.style.background = color;
      colorCode.textContent = color.toLowerCase();
    };
    
    // Initialize
    updateColor();
    
    // Listen for changes
    picker.addEventListener('input', updateColor);
    picker.addEventListener('change', updateColor);
    
    // Make color box clickable
    colorBox.addEventListener('click', () => {
      picker.click();
    });
  });

  // Handle preset cards
  const presetCards = document.querySelectorAll('.preset-card');
  presetCards.forEach(card => {
    card.addEventListener('click', () => {
      // Remove active class from all cards
      presetCards.forEach(c => c.classList.remove('active'));
      // Add active class to clicked card
      card.classList.add('active');
      
      // Apply preset colors based on data-preset
      const preset = card.dataset.preset;
      applyColorPreset(preset);
    });
  });
}

// Apply color preset
function applyColorPreset(preset) {
  const presets = {
    ebay: {
      primary: '#0064d2',
      secondary: '#e53238', 
      accent: '#f7c41f',
      text: '#86b817'
    },
    amazon: {
      primary: '#ff9900',
      secondary: '#232f3e',
      accent: '#37475a', 
      text: '#ffffff'
    },
    shopify: {
      primary: '#7ab55c',
      secondary: '#004c3f',
      accent: '#bf0711',
      text: '#ffffff'
    },
    aliexpress: {
      primary: '#ff4747',
      secondary: '#ff6a00',
      accent: '#ffffff',
      text: '#f5f5f5'
    },
    walmart: {
      primary: '#0071ce',
      secondary: '#ffc220',
      accent: '#ffffff',
      text: '#e6f3ff'
    },
    etsy: {
      primary: '#f1641e',
      secondary: '#222222',
      accent: '#ffffff',
      text: '#f7f7f7'
    }
  };

  const colors = presets[preset];
  if (!colors) return;

  // Update color pickers
  const pickers = document.querySelectorAll('.color-picker');
  if (pickers[0]) pickers[0].value = colors.primary;
  if (pickers[1]) pickers[1].value = colors.secondary;
  if (pickers[2]) pickers[2].value = colors.accent;
  if (pickers[3]) pickers[3].value = colors.text;

  // Trigger change events to update UI
  pickers.forEach(picker => {
    picker.dispatchEvent(new Event('input'));
  });
}
