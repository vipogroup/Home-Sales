import { Router } from 'express';
const router = Router();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { memory } from '../store/memory.js';
import { getPool } from '../db/postgres.js';
import { agentAuth } from '../middleware/auth.js';
import { getProductsInMemory } from './products.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacyAgentsPath = path.resolve(__dirname, '../../../data/agents.json');

function ensureAgentsLoaded() {
  if (memory.agents && memory.agents.length) return;
  try {
    if (fs.existsSync(legacyAgentsPath)) {
      const raw = fs.readFileSync(legacyAgentsPath, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        memory.agents = list.map(a => ({
          id: a.id,
          full_name: a.full_name || a.name || 'Agent',
          email: a.email,
          phone: a.phone || '',
          referral_code: a.referral_code || a.refCode || '',
          is_active: a.is_active !== false,
          created_at: a.created_at || new Date().toISOString(),
          visits: a.visits || 0,
          sales: a.sales || 0,
          totalCommissions: a.totalCommissions || a.commissions || 0,
          role: a.role || 'agent'
        }));
      }
    }
  } catch (e) {
    console.warn('Could not load legacy agents.json:', e.message);
  }
}

router.get('/agents/all', (req, res) => {
  (async ()=>{
    const pool = getPool();
    if (pool) {
      try {
        const r = await pool.query('SELECT id, full_name, email, phone, referral_code, is_active, created_at, visits, sales, total_commissions FROM agents ORDER BY id DESC');
        const agents = (r.rows||[]).map(a=>({
          id:a.id, full_name:a.full_name, email:a.email, phone:a.phone, referral_code:a.referral_code, is_active:a.is_active,
          created_at:a.created_at, visits:a.visits||0, sales:a.sales||0, totalCommissions:a.total_commissions||0
        }));
        return res.json({ success:true, agents });
      } catch(e){ return res.status(500).json({ success:false, error:e.message }); }
    }
    ensureAgentsLoaded();
    res.json({ success: true, agents: memory.agents });
  })();
});

// Agent self endpoints (require agentAuth)
router.get('/agent/me/summary', agentAuth, async (req, res) => {
  try {
    const agentId = Number(req.user.agentId);
    const pool = getPool();
    if (pool) {
      const [ra, ro] = await Promise.all([
        pool.query('SELECT full_name, referral_code, visits, total_commissions FROM agents WHERE id=$1 LIMIT 1', [agentId]),
        pool.query('SELECT COUNT(*)::int AS count, COALESCE(SUM(total_amount),0)::int AS sum FROM orders WHERE agent_id=$1', [agentId])
      ]);
      if (!ra.rows.length) return res.status(404).json({ success:false, error:'Agent not found' });
      const a = ra.rows[0];
      const totals = ro.rows[0] || { count:0, sum:0 };
      return res.json({ success:true, summary:{ name:a.full_name, referralCode:a.referral_code, visits:a.visits||0, orders: totals.count||0, amount: totals.sum||0, totalCommissions: a.total_commissions||0 } });
    }
    // Fallback (memory only)
    const ag = (memory.agents||[]).find(x=>Number(x.id)===agentId);
    const sales = (memory.sales||[]).filter(s=>Number(s.agent_id)===agentId);
    const amount = sales.reduce((s,x)=> s+Number(x.amount||0), 0);
    const totalCommissions = sales.reduce((s,x)=> s+Number(x.commission||0), 0);
    return res.json({ success:true, summary:{ name: ag?.full_name||'Agent', referralCode: ag?.referral_code||'', visits: ag?.visits||0, orders: sales.length, amount, totalCommissions } });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/agent/me/products', agentAuth, async (req, res) => {
  try {
    const agentId = Number(req.user.agentId);
    const pool = getPool();
    let referralCode = '';
    if (pool) {
      try {
        const ra = await pool.query('SELECT referral_code FROM agents WHERE id=$1 LIMIT 1', [agentId]);
        referralCode = ra.rows[0]?.referral_code || '';
      } catch {}
      const r = await pool.query('SELECT id, name FROM products ORDER BY id DESC');
      const origin = (req.protocol+'://'+req.get('host'));
      const items = (r.rows||[]).map(p=> ({ id:p.id, name:p.name, link: `${origin}/product/${p.id}?ref=${encodeURIComponent(referralCode)}` }));
      return res.json({ success:true, products: items });
    }
    // Fallback: no DB -> load referral code from memory + products from live in-memory list
    try {
      // ensure legacy agents memory loaded
      ensureAgentsLoaded();
      const ag = (memory.agents||[]).find(x=> Number(x.id)===agentId);
      referralCode = ag?.referral_code || '';
      const list = getProductsInMemory() || [];
      const origin = (req.protocol+'://'+req.get('host'));
      const items = (Array.isArray(list) ? list : []).map(p=> ({ id:p.id, name:p.name, link: `${origin}/product/${p.id}?ref=${encodeURIComponent(referralCode)}` }));
      return res.json({ success:true, products: items });
    } catch (e) {
      return res.json({ success:true, products: [] });
    }
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/agent/me/orders', agentAuth, async (req, res) => {
  try {
    const agentId = Number(req.user.agentId);
    const pool = getPool();
    if (pool) {
      const r = await pool.query('SELECT id, product_id AS "productId", quantity, total_amount AS "totalAmount", status, payment_ref AS "paymentRef", created_at AS "createdAt" FROM orders WHERE agent_id=$1 ORDER BY created_at DESC', [agentId]);
      return res.json({ success:true, orders:r.rows });
    }
    return res.json({ success:true, orders: [] });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/agent/me/sales', agentAuth, async (req, res) => {
  try {
    const agentId = Number(req.user.agentId);
    const pool = getPool();
    if (pool) {
      const r = await pool.query('SELECT id, product_id AS "productId", amount, commission, date FROM sales WHERE agent_id=$1 ORDER BY date DESC', [agentId]);
      return res.json({ success:true, sales: r.rows });
    }
    const rows = (memory.sales||[]).filter(s=>Number(s.agent_id)===agentId).map(s=>({ id:s.id||'', productId:s.product_id, amount:Number(s.amount||0), commission:Number(s.commission||0), date:s.date }));
    return res.json({ success:true, sales: rows });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/agent/me/sales.csv', agentAuth, async (req, res) => {
  try {
    const agentId = Number(req.user.agentId);
    const pool = getPool();
    let rows = [];
    if (pool) {
      const r = await pool.query('SELECT id, product_id AS "productId", amount, commission, date, customer FROM sales WHERE agent_id=$1 ORDER BY date DESC', [agentId]);
      rows = r.rows;
    } else {
      rows = (memory.sales||[]).filter(s=>Number(s.agent_id)===agentId).map(s=>({ id:s.id||'', productId:s.product_id, amount:s.amount, commission:s.commission, date:s.date, customer:s.customer||'' }));
    }
    const headers = ['id','productId','amount','commission','date','customer'];
    const data = [headers.join(','), ...rows.map(o=>[o.id, o.productId, o.amount, o.commission, new Date(o.date).toISOString(), o.customer||''].join(','))].join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="sales.csv"');
    res.send('\uFEFF'+data);
  } catch (e) { res.status(500).send(''); }
});

router.get('/agent/:id', (req, res) => {
  (async ()=>{
    const id = parseInt(req.params.id);
    const pool = getPool();
    if (pool) {
      try{
        const r = await pool.query('SELECT id, full_name, email, phone, referral_code, is_active, created_at, visits, sales, total_commissions FROM agents WHERE id=$1 LIMIT 1',[id]);
        if (!r.rows.length) return res.json({ success:true, agent:null });
        const a=r.rows[0];
        const agent={ id:a.id, full_name:a.full_name, email:a.email, phone:a.phone, referral_code:a.referral_code, is_active:a.is_active,
          created_at:a.created_at, visits:a.visits||0, sales:a.sales||0, totalCommissions:a.total_commissions||0 };
        return res.json({ success:true, agent });
      } catch(e){ return res.status(500).json({ success:false, error:e.message }); }
    }
    ensureAgentsLoaded();
    const agent = (memory.agents||[]).find(a=>a.id===id) || null;
    res.json({ success:true, agent });
  })();
});

router.get('/agent/:id/sales', (req, res) => {
  (async ()=>{
    const id = parseInt(req.params.id);
    const pool = getPool();
    if (pool) {
      try{
        const r = await pool.query('SELECT id, agent_id, product_id, amount, commission, date, customer FROM sales WHERE agent_id=$1 ORDER BY date DESC',[id]);
        return res.json({ success:true, sales:r.rows });
      } catch(e){ return res.status(500).json({ success:false, error:e.message }); }
    }
    const rows = memory.sales.filter(s => s.agent_id === id);
    res.json({ success:true, sales: rows });
  })();
});

router.post('/agent/:id/reset-password', (req, res) => {
  const id = parseInt(req.params.id);
  const agent = (memory.agents || []).find(a => a.id === id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
  const tempPassword = Math.random().toString(36).slice(-8);
  // In production: persist hashed password and send WhatsApp via service
  res.json({ success: true, tempPassword });
});

// Referral visit tracking (dev)
router.post('/referrals/visit', (req, res) => {
  (async ()=>{
    const { referralCode, page } = req.body || {};
    if (referralCode) {
      memory.refStats.total++;
      memory.refStats.byCode[referralCode] = (memory.refStats.byCode[referralCode] || 0) + 1;
      const pool = getPool();
      if (pool) {
        try { await pool.query('UPDATE agents SET visits = COALESCE(visits,0)+1 WHERE referral_code=$1', [String(referralCode)]); }
        catch{}
      } else {
        ensureAgentsLoaded();
        const ag = (memory.agents||[]).find(a => String(a.referral_code) === String(referralCode));
        if (ag) ag.visits = (ag.visits || 0) + 1;
      }
    }
    res.json({ success: true, tracked: Boolean(referralCode), stats: memory.refStats, page: page || null });
  })();
});

// Backward compatible alias
router.post('/track-visit', (req, res) => {
  const { referralCode, page } = req.body || {};
  if (referralCode) {
    memory.refStats.total++;
    memory.refStats.byCode[referralCode] = (memory.refStats.byCode[referralCode] || 0) + 1;
  }
  res.json({ success: true, tracked: Boolean(referralCode), stats: memory.refStats, page: page || null });
});

router.get('/agent/:id/referral-link', (req, res) => {
  (async ()=>{
    const id = parseInt(req.params.id);
    const pool = getPool();
    if (pool) {
      try{
        const r = await pool.query('SELECT referral_code FROM agents WHERE id=$1 LIMIT 1', [id]);
        if (!r.rows.length) return res.status(404).json({ success:false, error:'Agent not found' });
        const origin = `${req.protocol}://${req.get('host')}`;
        return res.json({ success:true, referral_link: `${origin}/shop?ref=${encodeURIComponent(r.rows[0].referral_code||'')}` });
      } catch(e){ return res.status(500).json({ success:false, error:e.message }); }
    }
    ensureAgentsLoaded();
    const ag = (memory.agents||[]).find(a => a.id === id);
    if (!ag) return res.status(404).json({ success: false, error: 'Agent not found' });
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json({ success: true, referral_link: `${origin}/shop?ref=${encodeURIComponent(ag.referral_code||'')}` });
  })();
});

export default router;
