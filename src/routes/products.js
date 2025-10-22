import { Router } from 'express';
const router = Router();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatIsraeliPhone } from '../utils/phone.js';
import { adminAuth } from '../middleware/auth.js';
import { getPool } from '../db/postgres.js';

// File system functions for design settings (no DB)

function loadDesignFromFile() {
  try {
    if (fs.existsSync(designFilePath)) {
      const raw = fs.readFileSync(designFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed loading design settings:', e.message);
  }
  return { joinBtnColor: '#667eea' };
}

function saveDesignToFile(settings) {
  try {
    fs.writeFileSync(designFilePath, JSON.stringify(settings, null, 2));
    console.log('✅ Design settings saved to file');
    return true;
  } catch (e) {
    console.error('❌ Failed to save design settings:', e.message);
    return false;
  }
}

import { memory } from '../store/memory.js';

// Resolve data path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsPath = path.resolve(__dirname, '../data/products.json');
const legacyAgentsPath = path.resolve(__dirname, '../../../data/agents.json');
const designFilePath = path.join(__dirname, '../../design-settings.json');

// Load products from JSON (dev only, non-persistent writes)
function loadProducts() {
  try {
    const raw = fs.readFileSync(productsPath, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed loading products.json:', e.message);
    return [];
  }
}

let products = loadProducts();
let participants = [];
let designSettings = loadDesignFromFile();
const leadStats = { total: 0, byCode: {} };
let referralMap = {};
let orders = [];
let commissionsByAgent = {}; // {agentId: totalCommission}

// Try to load legacy agents.json to build referral map (dev only)
try {
  if (fs.existsSync(legacyAgentsPath)) {
    const raw = fs.readFileSync(legacyAgentsPath, 'utf8');
    const legacyAgents = JSON.parse(raw);
    if (Array.isArray(legacyAgents)) {
      referralMap = Object.fromEntries(
        legacyAgents
          .filter(a => a && a.referral_code && a.id)
          .map(a => [String(a.referral_code), Number(a.id)])
      );
    }
  }
} catch (e) {
  console.warn('Could not build referral map from legacy agents.json:', e.message);
}

function decorateProduct(p) {
  const now = new Date();
  const end = p?.groupBuy?.endDate ? new Date(p.groupBuy.endDate) : now;
  const daysLeft = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  const progress = p?.groupBuy?.maxParticipants
    ? Math.round((p.groupBuy.currentParticipants / p.groupBuy.maxParticipants) * 100)
    : 0;
  const discount = p?.originalPrice
    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
    : 0;
  return { ...p, daysLeft, progress, discount };
}

function productRowToObj(r) {
  return decorateProduct({
    id: r.id,
    name: r.name,
    description: r.description,
    price: Number(r.price || 0),
    originalPrice: Number(r.original_price || 0),
    category: r.category || '',
    stock: Number(r.stock || 0),
    image: r.image || '',
    purchaseType: r.purchase_type || 'group',
    groupBuy: {
      isActive: r.groupbuy_is_active === true,
      currentParticipants: Number(r.groupbuy_current_participants || 0),
      minParticipants: Number(r.groupbuy_min_participants || 0),
      maxParticipants: Number(r.groupbuy_max_participants || 0),
      endDate: r.groupbuy_end_date ? new Date(r.groupbuy_end_date).toISOString() : null
    },
    shipping: {
      cost: Number(r.shipping_cost || 0),
      deliveryDays: Number(r.shipping_delivery_days || 3)
    },
    details: r.details || {}
  });
}

// Public: get minimal order info by ID (for success/cancel pages)
router.get('/orders/:id/public', async (req, res) => {
  try {
    const oid = String(req.params.id);
    const pool = getPool();
    if (pool) {
      const r = await pool.query('SELECT id, product_id AS "productId", quantity, total_amount AS "totalAmount", status, payment_ref AS "paymentRef", created_at AS "createdAt" FROM orders WHERE id=$1 LIMIT 1', [oid]);
      if (!r.rows.length) return res.status(404).json({ success:false, error:'Order not found' });
      return res.json({ success:true, order: r.rows[0] });
    }
    const o = orders.find(x => String(x.id) === oid);
    if (!o) return res.status(404).json({ success:false, error:'Order not found' });
    return res.json({ success:true, order: { id:o.id, productId:o.productId, quantity:o.quantity, totalAmount:o.totalAmount, status:o.status||'pending', paymentRef:o.paymentRef||'', createdAt:o.createdAt } });
  } catch (e) {
    res.status(500).json({ success:false, error:e.message });
  }
});

// Admin sales list (commissions tracking)
router.get('/sales', adminAuth, async (req, res) => {
  try {
    const { from, to, productId, agentId } = req.query || {};
    const pool = getPool();
    if (pool) {
      const conds = [];
      const params = [];
      if (from) { params.push(new Date(from)); conds.push(`s.date >= $${params.length}`); }
      if (to)   { params.push(new Date(new Date(to).getTime()+24*60*60*1000)); conds.push(`s.date < $${params.length}`); }
      if (productId) { params.push(Number(productId)); conds.push(`s.product_id = $${params.length}`); }
      if (agentId)   { params.push(Number(agentId)); conds.push(`s.agent_id = $${params.length}`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const sql = `SELECT s.id, s.agent_id AS "agentId", a.full_name AS "agentName", s.product_id AS "productId", p.name AS "productName", s.amount, s.commission, s.date
                   FROM sales s
                   LEFT JOIN agents a ON a.id = s.agent_id
                   LEFT JOIN products p ON p.id = s.product_id
                   ${where}
                   ORDER BY s.date DESC`;
      const r = await pool.query(sql, params);
      const list = r.rows;
      const totals = { count: list.length, commissions: list.reduce((s,x)=> s + Number(x.commission||0), 0) };
      return res.json({ success: true, sales: list, totals });
    }
    // in-memory
    let list = (memory.sales||[]).map(s=>({
      id: s.id||'',
      agentId: s.agent_id||null,
      agentName: (()=>{ try { const a=(memory.agents||[]).find(x=>Number(x.id)===Number(s.agent_id)); return a?.full_name || ''; } catch{} return ''; })(),
      productId: s.product_id,
      productName: (()=>{ try { const p=(products||[]).find(x=>Number(x.id)===Number(s.product_id)); return p?.name || ''; } catch{} return ''; })(),
      amount: Number(s.amount||0),
      commission: Number(s.commission||0),
      date: s.date
    }));
    if (from) { const ts = new Date(from).getTime(); list = list.filter(x => new Date(x.date).getTime() >= ts); }
    if (to)   { const te = new Date(new Date(to).getTime()+24*60*60*1000).getTime(); list = list.filter(x => new Date(x.date).getTime() < te); }
    if (productId) list = list.filter(x => Number(x.productId) === Number(productId));
    if (agentId)   list = list.filter(x => Number(x.agentId||0) === Number(agentId));
    const totals = { count: list.length, commissions: list.reduce((s,x)=> s + Number(x.commission||0), 0) };
    res.json({ success: true, sales: list, totals });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Admin sales CSV export
router.get('/sales.csv', adminAuth, async (req, res) => {
  try {
    const { from, to, productId, agentId } = req.query || {};
    const pool = getPool();
    let rowsData = [];
    if (pool) {
      const conds = [];
      const params = [];
      if (from) { params.push(new Date(from)); conds.push(`s.date >= $${params.length}`); }
      if (to)   { params.push(new Date(new Date(to).getTime()+24*60*60*1000)); conds.push(`s.date < $${params.length}`); }
      if (productId) { params.push(Number(productId)); conds.push(`s.product_id = $${params.length}`); }
      if (agentId)   { params.push(Number(agentId)); conds.push(`s.agent_id = $${params.length}`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const sql = `SELECT s.id, s.agent_id AS "agentId", a.full_name AS "agentName", s.product_id AS "productId", p.name AS "productName", s.amount, s.commission, s.date
                   FROM sales s LEFT JOIN agents a ON a.id = s.agent_id LEFT JOIN products p ON p.id = s.product_id ${where} ORDER BY s.date DESC`;
      const r = await pool.query(sql, params);
      rowsData = r.rows;
    } else {
      rowsData = (memory.sales||[]).map(s=>({ id:s.id||'', agentId:s.agent_id, agentName:(()=>{ try{ const a=(memory.agents||[]).find(x=>Number(x.id)===Number(s.agent_id)); return a?.full_name||''; }catch{} return ''; })(), productId:s.product_id, productName:(()=>{ try{ const p=(products||[]).find(x=>Number(x.id)===Number(s.product_id)); return p?.name||''; }catch{} return ''; })(), amount:Number(s.amount||0), commission:Number(s.commission||0), date:s.date }));
      // filters
      if (from) { const ts = new Date(from).getTime(); rowsData = rowsData.filter(x => new Date(x.date).getTime() >= ts); }
      if (to)   { const te = new Date(new Date(to).getTime()+24*60*60*1000).getTime(); rowsData = rowsData.filter(x => new Date(x.date).getTime() < te); }
      if (productId) rowsData = rowsData.filter(x => Number(x.productId) === Number(productId));
      if (agentId)   rowsData = rowsData.filter(x => Number(x.agentId||0) === Number(agentId));
    }
    const headers = ['id','agentId','agentName','productId','productName','amount','commission','date'];
    const rows = rowsData.map(o => [o.id, o.agentId||'', o.agentName||'', o.productId, o.productName||'', o.amount, o.commission, new Date(o.date).toISOString()]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => {
      const s = String(v ?? '');
      const needsWrap = /[",\n]/.test(s);
      const esc = s.replace(/\"/g, '""');
      return needsWrap ? `"${esc}"` : esc;
    }).join(','))].join('\n');
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sales.csv"');
    res.send(bom + csv);
  } catch (e) {
    res.status(500).send('');
  }
});
function createWhatsAppMessage(participant, product) {
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  const daysLeft = Math.max(0, Math.ceil((new Date(product.groupBuy.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
  const message = `🎉 *ברכות ${participant.name}!*\n\nהצטרפת בהצלחה לרכישה הקבוצתית! \n\n📦 *פרטי המוצר:*\n• שם המוצר: ${product.name}\n• קטגוריה: ${product.category}\n• תיאור: ${product.description}\n\n💰 *פרטי מחיר:*\n• מחיר רגיל: ₪${product.originalPrice.toLocaleString()}\n• מחיר קבוצתי: ₪${product.price.toLocaleString()}\n• חיסכון: ${discount}% (₪${(product.originalPrice - product.price).toLocaleString()})\n\n👥 *סטטוס הרכישה:*\n• משתתפים נוכחיים: ${product.groupBuy.currentParticipants}\n• מקסימום משתתפים: ${product.groupBuy.maxParticipants}\n• ימים נותרו: ${daysLeft} ימים\n\n📋 *הפרטים שלך:*\n• שם: ${participant.name}\n• אימייל: ${participant.email}\n• טלפון: ${participant.phone}\n• תאריך הצטרפות: ${new Date(participant.joinedAt).toLocaleDateString('he-IL')}\n\n📞 *צריך עזרה?* צור קשר איתנו בוואטסאפ.\n\nתודה שבחרת ב-VIPO! 🛒`;
  const encodedMessage = encodeURIComponent(message);
  const businessPhone = '972555545821';
  return `https://wa.me/${businessPhone}?text=${encodedMessage}`;
}

// GET all products
router.get('/products', async (req, res) => {
  try {
    const pool = getPool();
    if (pool) {
      const r = await pool.query('SELECT * FROM products ORDER BY id DESC');
      const data = (r.rows || []).map(productRowToObj);
      return res.json({ success: true, count: data.length, data });
    }
    const data = products.map(decorateProduct);
    res.json({ success: true, count: data.length, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Orders summary (for charts): totals by product, by agent, and by date
router.get('/orders/summary', adminAuth, async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const pool = getPool();
    if (pool) {
      const conds = [];
      const params = [];
      if (from) { params.push(new Date(from)); conds.push(`o.created_at >= $${params.length}`); }
      if (to)   { params.push(new Date(new Date(to).getTime()+24*60*60*1000)); conds.push(`o.created_at < $${params.length}`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const byProductSql = `SELECT p.id, p.name, COALESCE(SUM(o.total_amount),0) AS sum, COUNT(o.id) AS count
                            FROM products p LEFT JOIN orders o ON o.product_id=p.id ${where ? where.replace('WHERE','WHERE') : ''}
                            GROUP BY p.id, p.name ORDER BY sum DESC`;
      const byAgentSql = `SELECT a.id, a.full_name, COALESCE(SUM(o.total_amount),0) AS sum, COUNT(o.id) AS count
                          FROM agents a LEFT JOIN orders o ON o.agent_id=a.id ${where ? where.replace('WHERE','WHERE') : ''}
                          GROUP BY a.id, a.full_name ORDER BY sum DESC`;
      const byDateSql = `SELECT DATE(o.created_at) AS day, COUNT(*) AS count, COALESCE(SUM(o.total_amount),0) AS sum
                         FROM orders o ${where} GROUP BY day ORDER BY day ASC`;
      const [r1, r2, r3] = await Promise.all([
        pool.query(byProductSql, params),
        pool.query(byAgentSql, params),
        pool.query(byDateSql, params)
      ]);
      return res.json({ success:true, byProduct:r1.rows, byAgent:r2.rows, byDate:r3.rows });
    }
    // in-memory fallback
    const filterOrder = (o)=>{
      if (from && new Date(o.createdAt).getTime() < new Date(from).getTime()) return false;
      if (to && new Date(o.createdAt).getTime() >= new Date(new Date(to).getTime()+24*60*60*1000).getTime()) return false;
      return true;
    };
    const filtered = orders.filter(filterOrder);
    const byProductMap = {};
    const byAgentMap = {};
    const byDateMap = {};
    filtered.forEach(o=>{
      const p = products.find(x=>x.id===o.productId);
      const pname = p?.name || `#${o.productId}`;
      byProductMap[o.productId] = byProductMap[o.productId] || { id:o.productId, name:pname, sum:0, count:0 };
      byProductMap[o.productId].sum += Number(o.totalAmount||0); byProductMap[o.productId].count++;
      const aid = o.agentId || 0;
      const aname = (()=>{ const ag=(memory.agents||[]).find(a=>a.id===aid); return ag?.full_name || `Agent #${aid}`; })();
      byAgentMap[aid] = byAgentMap[aid] || { id:aid, full_name:aname, sum:0, count:0 };
      byAgentMap[aid].sum += Number(o.totalAmount||0); byAgentMap[aid].count++;
      const d = (new Date(o.createdAt)).toISOString().slice(0,10);
      byDateMap[d] = byDateMap[d] || { day:d, count:0, sum:0 };
      byDateMap[d].count++; byDateMap[d].sum += Number(o.totalAmount||0);
    });
    const byProduct = Object.values(byProductMap).sort((a,b)=>b.sum-a.sum);
    const byAgent = Object.values(byAgentMap).sort((a,b)=>b.sum-a.sum);
    const byDate = Object.values(byDateMap).sort((a,b)=> a.day.localeCompare(b.day));
    res.json({ success:true, byProduct, byAgent, byDate });
  } catch (e) {
    res.status(500).json({ success:false, error:e.message });
  }
});

// Delete order (admin)
router.delete('/orders/:id', adminAuth, async (req, res) => {
  try {
    const oid = String(req.params.id);
    const pool = getPool();
    if (pool) {
      await pool.query('DELETE FROM orders WHERE id=$1', [oid]);
    }
    const idx = orders.findIndex(o => String(o.id) === oid);
    if (idx !== -1) orders.splice(idx, 1);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET single product
router.get('/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = getPool();
    if (pool) {
      const r = await pool.query('SELECT * FROM products WHERE id=$1 LIMIT 1', [id]);
      if (!r.rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
      return res.json({ success: true, data: productRowToObj(r.rows[0]) });
    }
    const product = products.find(p => p.id === id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: decorateProduct(product) });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// JOIN group-buy / product
router.post('/products/:id/join', async (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  const { name, email, phone } = req.body || {};
  const referralCode = (req.body && req.body.referralCode) || req.get('X-Referral-Code') || (req.cookies && req.cookies.ref) || null;
  if (!name || !email || !phone) {
    return res.status(400).json({ success: false, message: 'name, email, phone are required' });
  }

  if (product.groupBuy && product.groupBuy.currentParticipants >= product.groupBuy.maxParticipants) {
    return res.status(400).json({ success: false, message: 'Group buy is full' });
  }

  const already = participants.find(p => p.email === email && p.productId === id);
  if (already) {
    return res.status(400).json({ success: false, message: 'Already joined this product' });
  }

  const participant = {
    id: participants.length + 1,
    productId: id,
    name,
    email,
    phone: formatIsraeliPhone(phone),
    joinedAt: new Date(),
    referralCode: referralCode || null,
    agentId: referralCode && referralMap[referralCode] ? referralMap[referralCode] : null
  };
  participants.push(participant);

  const pool = getPool();
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO participants (product_id, agent_id, name, email, phone, referral_code, joined_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [id, participant.agentId, name, email, formatIsraeliPhone(phone), referralCode]
      );
      // increment product current participants
      await pool.query('UPDATE products SET groupbuy_current_participants = COALESCE(groupbuy_current_participants,0)+1 WHERE id=$1', [id]);
    } catch (dbErr) {
      console.warn('[PG] Failed to insert participant, continuing in memory:', dbErr.message);
    }
  }

  if (product.groupBuy) {
    product.groupBuy.currentParticipants = Math.min(
      product.groupBuy.currentParticipants + 1,
      product.groupBuy.maxParticipants
    );
  }

  if (referralCode) {
    leadStats.total++;
    leadStats.byCode[referralCode] = (leadStats.byCode[referralCode] || 0) + 1;
  }

  const whatsappUrl = createWhatsAppMessage(participant, product);

  res.json({
    success: true,
    message: 'הצטרפת בהצלחה לרכישה הקבוצתית! 🎉',
    data: {
      participant,
      product: decorateProduct(product),
      whatsappUrl,
      referralAccepted: Boolean(referralCode)
    }
  });
});

// Create new product
router.post('/products', adminAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const pool = getPool();
    if (pool) {
      const q = `INSERT INTO products (name, description, price, original_price, category, stock, image, purchase_type,
        groupbuy_is_active, groupbuy_current_participants, groupbuy_min_participants, groupbuy_max_participants, groupbuy_end_date,
        shipping_cost, shipping_delivery_days, details)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`;
      const gv = payload.groupBuy || {};
      const sv = payload.shipping || {};
      const params = [
        payload.name || '', payload.description || '', Number(payload.price||0), Number(payload.originalPrice||0), payload.category || '', Number(payload.stock||0), payload.image || '', payload.purchaseType || 'group',
        gv.isActive===true, Number(gv.currentParticipants||0), Number(gv.minParticipants||0), Number(gv.maxParticipants||0), gv.endDate? new Date(gv.endDate): null,
        Number(sv.cost||0), Number(sv.deliveryDays||3), payload.details || {}
      ];
      const r = await pool.query(q, params);
      return res.json({ success: true, data: productRowToObj(r.rows[0]) });
    }
    const id = (products.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1) || 1;
    const product = { id, ...payload };
    products.push(product);
    res.json({ success: true, data: product });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Admin orders list
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { from, to, productId, agentId } = req.query || {};
    const pool = getPool();
    if (pool) {
      const conds = [];
      const params = [];
      if (from) { params.push(new Date(from)); conds.push(`o.created_at >= $${params.length}`); }
      if (to)   { params.push(new Date(new Date(to).getTime()+24*60*60*1000)); conds.push(`o.created_at < $${params.length}`); }
      if (productId) { params.push(Number(productId)); conds.push(`o.product_id = $${params.length}`); }
      if (agentId)   { params.push(Number(agentId)); conds.push(`o.agent_id = $${params.length}`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const sql = `SELECT o.id, o.product_id AS "productId", o.quantity, o.total_amount AS "totalAmount", o.status AS "status", o.payment_ref AS "paymentRef", o.agent_id AS "agentId", o.created_at AS "createdAt",
                          p.name AS "productName", a.full_name AS "agentName"
                   FROM orders o
                   LEFT JOIN products p ON p.id = o.product_id
                   LEFT JOIN agents a ON a.id = o.agent_id
                   ${where}
                   ORDER BY o.created_at DESC`;
      const r = await pool.query(sql, params);
      const list = r.rows;
      const totals = { count: list.length, sum: list.reduce((s,x)=> s + Number(x.totalAmount||0), 0) };
      return res.json({ success: true, orders: list, totals });
    }

    let list = orders.map(o => ({
      ...o,
      status: o.status || 'pending',
      paymentRef: o.paymentRef || '',
      productName: (products.find(p => p.id === o.productId)?.name) || '',
      agentName: (()=>{ try { const a=(memory.agents||[]).find(x=>Number(x.id)===Number(o.agentId)); return a?.full_name || ''; } catch{} return ''; })()
    }));
    // in-memory filters
    if (from) { const ts = new Date(from).getTime(); list = list.filter(o => new Date(o.createdAt).getTime() >= ts); }
    if (to)   { const te = new Date(new Date(to).getTime()+24*60*60*1000).getTime(); list = list.filter(o => new Date(o.createdAt).getTime() < te); }
    if (productId) list = list.filter(o => Number(o.productId) === Number(productId));
    if (agentId)   list = list.filter(o => Number(o.agentId||0) === Number(agentId));
    const totals = { count: list.length, sum: list.reduce((s, o) => s + Number(o.totalAmount || 0), 0) };
    res.json({ success: true, orders: list, totals });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Admin orders CSV export
router.get('/orders.csv', adminAuth, async (req, res) => {
  try {
    const { from, to, productId, agentId } = req.query || {};
    const pool = getPool();
    let rowsData = [];
    if (pool) {
      const conds = [];
      const params = [];
      if (from) { params.push(new Date(from)); conds.push(`o.created_at >= $${params.length}`); }
      if (to)   { params.push(new Date(new Date(to).getTime()+24*60*60*1000)); conds.push(`o.created_at < $${params.length}`); }
      if (productId) { params.push(Number(productId)); conds.push(`o.product_id = $${params.length}`); }
      if (agentId)   { params.push(Number(agentId)); conds.push(`o.agent_id = $${params.length}`); }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const sql = `SELECT o.id, o.product_id AS "productId", p.name AS "productName", o.quantity, o.total_amount AS "totalAmount", o.status AS "status", o.payment_ref AS "paymentRef", o.agent_id AS "agentId", o.created_at AS "createdAt", a.full_name AS "agentName"
                   FROM orders o LEFT JOIN products p ON p.id = o.product_id LEFT JOIN agents a ON a.id = o.agent_id ${where} ORDER BY o.created_at DESC`;
      const r = await pool.query(sql, params);
      rowsData = r.rows;
    } else {
      rowsData = orders.map(o => ({
        id: o.id,
        productId: o.productId,
        productName: (products.find(p => p.id === o.productId)?.name) || '',
        quantity: o.quantity,
        totalAmount: o.totalAmount,
        status: o.status || 'pending',
        paymentRef: o.paymentRef || '',
        agentId: o.agentId || '',
        createdAt: o.createdAt,
        agentName: (()=>{ try { const a=(memory.agents||[]).find(x=>Number(x.id)===Number(o.agentId)); return a?.full_name || ''; } catch{} return ''; })()
      }));
      // apply in-memory filters
      if (from) { const ts = new Date(from).getTime(); rowsData = rowsData.filter(o => new Date(o.createdAt).getTime() >= ts); }
      if (to)   { const te = new Date(new Date(to).getTime()+24*60*60*1000).getTime(); rowsData = rowsData.filter(o => new Date(o.createdAt).getTime() < te); }
      if (productId) rowsData = rowsData.filter(o => Number(o.productId) === Number(productId));
      if (agentId)   rowsData = rowsData.filter(o => Number(o.agentId||0) === Number(agentId));
    }
    const headers = ['id','productId','productName','quantity','totalAmount','status','paymentRef','agentId','agentName','createdAt'];
    const rows = rowsData.map(o => [o.id, o.productId, o.productName||'', o.quantity, o.totalAmount, o.status||'pending', o.paymentRef||'', o.agentId||'', o.agentName||'', new Date(o.createdAt).toISOString()]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => {
      const s = String(v ?? '');
      const needsWrap = /[",\n]/.test(s);
      const esc = s.replace(/\"/g, '\"\"');
      return needsWrap ? `\"${esc}\"` : esc;
    }).join(','))].join('\n');
    const bom = '\\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=\"orders.csv\"');
    res.send(bom + csv);
  } catch (e) {
    res.status(500).send('');
  }
});

// Update product
router.put('/products/:id', adminAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = getPool();
    if (pool) {
      (async () => {
        const p = req.body || {};
        const gv = p.groupBuy || {};
        const sv = p.shipping || {};
        await pool.query(`UPDATE products SET
          name=$1, description=$2, price=$3, original_price=$4, category=$5, stock=$6, image=$7, purchase_type=$8,
          groupbuy_is_active=$9, groupbuy_current_participants=$10, groupbuy_min_participants=$11, groupbuy_max_participants=$12, groupbuy_end_date=$13,
          shipping_cost=$14, shipping_delivery_days=$15, details=$16
        WHERE id=$17`, [
          p.name||'', p.description||'', Number(p.price||0), Number(p.originalPrice||0), p.category||'', Number(p.stock||0), p.image||'', p.purchaseType||'group',
          gv.isActive===true, Number(gv.currentParticipants||0), Number(gv.minParticipants||0), Number(gv.maxParticipants||0), gv.endDate? new Date(gv.endDate): null,
          Number(sv.cost||0), Number(sv.deliveryDays||3), p.details||{}, id
        ]);
        const r = await pool.query('SELECT * FROM products WHERE id=$1 LIMIT 1', [id]);
        if (!r.rows.length) return res.status(404).json({ success:false, message:'Product not found'});
        return res.json({ success: true, data: productRowToObj(r.rows[0]) });
      })().catch(e=>res.status(400).json({ success:false, error:e.message }));
      return;
    }
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Product not found' });
    products[idx] = { ...products[idx], ...req.body };
    res.json({ success: true, data: products[idx] });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Delete product
router.delete('/products/:id', adminAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = getPool();
    if (pool) {
      (async ()=>{
        // orders has FK without CASCADE: delete them first
        await pool.query('DELETE FROM orders WHERE product_id=$1', [id]);
        await pool.query('DELETE FROM products WHERE id=$1', [id]);
        return res.json({ success:true });
      })().catch(e=>res.status(400).json({ success:false, error:e.message }));
      return;
    }
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Product not found' });
    const removed = products.splice(idx, 1)[0];
    // Also remove participants of this product
    participants = participants.filter(p => p.productId !== id);
    // Remove in-memory orders
    orders = orders.filter(o => Number(o.productId)!==id);
    res.json({ success: true, data: removed });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Confirm order and attribute commission (dev in-memory)
router.post('/orders/confirm', async (req, res) => {
  try {
    const { productId, quantity = 1, totalAmount } = req.body || {};
    const id = Number(productId);
    const product = products.find(p => p.id === id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const referralCode = (req.body && req.body.referralCode) || req.get('X-Referral-Code') || (req.cookies && req.cookies.ref) || null;
    let agentId = referralCode && referralMap[referralCode] ? referralMap[referralCode] : null;
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random()*1e4)}`;
    const amount = Number(totalAmount ?? product.price * quantity) || 0;
    const commission = Math.round(amount * 0.10);

    const pool = getPool();
    if (pool) {
      try {
        // Try resolve agent by referral_code in DB if not resolved from memory
        if (!agentId && referralCode) {
          const r = await pool.query('SELECT id FROM agents WHERE referral_code=$1 LIMIT 1', [String(referralCode)]);
          agentId = r.rows[0]?.id || null;
        }
        await pool.query(
          'INSERT INTO orders (id, product_id, agent_id, quantity, total_amount, created_at) VALUES ($1,$2,$3,$4,$5,NOW())',
          [orderId, id, agentId, Number(quantity||1), amount]
        );
        // insert sale & update agent totals if we have an agent
        if (agentId) {
          await pool.query('INSERT INTO sales (agent_id, product_id, amount, commission, date) VALUES ($1,$2,$3,$4,NOW())', [agentId, id, amount, commission]);
          await pool.query('UPDATE agents SET sales = COALESCE(sales,0)+1, total_commissions = COALESCE(total_commissions,0) + $1 WHERE id=$2', [commission, agentId]);
        }
      } catch (dbErr) {
        console.warn('[PG] Failed to insert order, fallback to memory:', dbErr.message);
      }
    }

    const order = { id: orderId, productId: id, quantity, totalAmount: amount, agentId, createdAt: new Date() };
    orders.push(order);
    if (agentId) {
      commissionsByAgent[agentId] = (commissionsByAgent[agentId] || 0) + commission;
      // in-memory sales and agent counters
      try {
        memory.sales.push({ agent_id: agentId, product_id: id, amount, commission, date: new Date().toISOString() });
        const ag = (memory.agents||[]).find(a=>Number(a.id)===Number(agentId));
        if (ag) { ag.sales = (ag.sales||0)+1; ag.totalCommissions = (ag.totalCommissions||0)+commission; }
      } catch {}
    }

    res.json({ success: true, order, commission, agentId, referralAccepted: Boolean(referralCode) });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// GET product participants
router.get('/products/:id/participants', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = getPool();
    if (pool) {
      const r = await pool.query('SELECT id, product_id AS "productId", name, email, phone, joined_at AS "joinedAt", referral_code AS "referralCode", agent_id AS "agentId" FROM participants WHERE product_id=$1 ORDER BY joined_at DESC', [id]);
      return res.json({ success: true, data: r.rows });
    }
    const list = participants.filter(p => p.productId === id);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.get('/products/:id/participants.csv', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pool = getPool();
    let list = [];
    if (pool) {
      const r = await pool.query('SELECT id, product_id AS "productId", name, email, phone, joined_at AS "joinedAt", referral_code AS "referralCode", agent_id AS "agentId" FROM participants WHERE product_id=$1 ORDER BY joined_at DESC', [id]);
      list = r.rows;
    } else {
      list = participants.filter(p => p.productId === id);
    }
    const headers = ['id','productId','name','email','phone','joinedAt','referralCode','agentId'];
    const rows = list.map(p => [p.id, p.productId, p.name, p.email, p.phone, new Date(p.joinedAt).toISOString(), p.referralCode||'', p.agentId||'']);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => {
      const s = String(v ?? '');
      // escape quotes and wrap if needed
      const needsWrap = /[",\n]/.test(s);
      const esc = s.replace(/\"/g, '\"\"');
      return needsWrap ? `\"${esc}\"` : esc;
    }).join(','))].join('\n');
    const bom = '\\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"participants-${id}.csv\"`);
    res.send(bom + csv);
  } catch (e) {
    res.status(500).send('');
  }
});

// Design settings
router.get('/design', (req, res) => {
  (async ()=>{
    const pool = getPool();
    if (pool) {
      try {
        const r = await pool.query('SELECT value FROM settings WHERE key=$1 LIMIT 1', ['design']);
        if (r.rows.length) {
          const dbVal = r.rows[0].value || {};
          const merged = { ...designSettings, ...dbVal };
          return res.json({ success:true, data: merged });
        }
      } catch {}
    }
    res.json({ success: true, data: designSettings });
  })();
});

router.post('/design', adminAuth, (req, res) => {
  try {
    designSettings = { ...designSettings, ...(req.body || {}) };
    
    // Try DB first
    const pool = getPool();
    if (pool) {
      (async ()=>{
        await pool.query('INSERT INTO settings(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()', ['design', designSettings]);
        saveDesignToFile(designSettings); // Also save to file as backup
        console.log('🎨 Design saved to DB and file');
        res.json({ success: true, data: designSettings });
      })().catch(e=>res.status(400).json({ success:false, error:e.message }));
      return;
    }
    
    // No DB - save to file only
    if (saveDesignToFile(designSettings)) {
      console.log('🎨 Design saved to file (no DB)');
      res.json({ success: true, data: designSettings });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save design settings' });
    }
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Expose current in-memory products snapshot (dev/no-DB scenarios)
export function getProductsInMemory(){
  try { return products.map(decorateProduct); } catch { return []; }
}

export default router;
