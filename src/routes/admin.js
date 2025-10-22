import { Router } from 'express';
const router = Router();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { memory } from '../store/memory.js';
import { adminAuth } from '../middleware/auth.js';
import { getPool } from '../db/postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacyAgentsPath = path.resolve(__dirname, '../../../data/agents.json');

function ensureAgentsLoaded() {
  if (memory.agents && memory.agents.length) return;
  try {
    if (fs.existsSync(legacyAgentsPath)) {
      const raw = fs.readFileSync(legacyAgentsPath, 'utf8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) memory.agents = list;
    }
  } catch {}
}

// protect all /admin/* endpoints (toggle with ENABLE_ADMIN_AUTH)
router.use('/admin', adminAuth);

router.post('/admin/agent/:id/toggle-status', (req, res) => {
  (async ()=>{
    const id = parseInt(req.params.id);
    const pool = getPool();
    const desired = (typeof req.body?.is_active === 'boolean') ? req.body.is_active : undefined;
    if (pool) {
      try {
        if (typeof desired === 'boolean') await pool.query('UPDATE agents SET is_active=$1 WHERE id=$2', [desired, id]);
        else await pool.query('UPDATE agents SET is_active = NOT COALESCE(is_active, TRUE) WHERE id=$1', [id]);
        const r = await pool.query('SELECT id, full_name, email, phone, referral_code, is_active, created_at, visits, sales, total_commissions FROM agents WHERE id=$1 LIMIT 1', [id]);
        if (!r.rows.length) return res.status(404).json({ success:false, error:'Agent not found' });
        const a=r.rows[0];
        const agent={ id:a.id, full_name:a.full_name, email:a.email, phone:a.phone, referral_code:a.referral_code, is_active:a.is_active,
          created_at:a.created_at, visits:a.visits||0, sales:a.sales||0, totalCommissions:a.total_commissions||0 };
        return res.json({ success:true, agent });
      } catch(e){ return res.status(400).json({ success:false, error:e.message }); }
    }
    ensureAgentsLoaded();
    const ag = (memory.agents || []).find(a => a.id === id);
    if (!ag) return res.status(404).json({ success: false, error: 'Agent not found' });
    if (typeof desired === 'boolean') ag.is_active = desired; else ag.is_active = !Boolean(ag.is_active);
    res.json({ success: true, agent: ag });
  })();
});

router.delete('/admin/agent/:id', (req, res) => {
  (async ()=>{
    const id = parseInt(req.params.id);
    const pool = getPool();
    if (pool) {
      try {
        // Nullify orders.agent_id to preserve orders history
        await pool.query('UPDATE orders SET agent_id=NULL WHERE agent_id=$1', [id]);
        // Delete sales rows
        await pool.query('DELETE FROM sales WHERE agent_id=$1', [id]);
        // Delete agent
        const r = await pool.query('DELETE FROM agents WHERE id=$1 RETURNING id, full_name AS full_name', [id]);
        if (!r.rows.length) return res.status(404).json({ success:false, error:'Agent not found' });
        return res.json({ success:true, agent: { id:r.rows[0].id, full_name:r.rows[0].full_name } });
      } catch(e){ return res.status(400).json({ success:false, error:e.message }); }
    }
    ensureAgentsLoaded();
    const idx = (memory.agents || []).findIndex(a => a.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Agent not found' });
    const removed = memory.agents.splice(idx, 1)[0];
    // Remove in-memory sales
    memory.sales = (memory.sales||[]).filter(s => Number(s.agent_id)!==id);
    res.json({ success: true, agent: removed });
  })();
});

router.post('/products/:id/payment-broadcast', (req, res) => {
  // Placeholder: in production send messages to all participants
  res.json({ success: true, sent: 0 });
});

// DB status
router.get('/admin/db-status', async (req, res) => {
  try {
    const pool = getPool();
    const connected = Boolean(pool);
    res.json({ success: true, connected });
  } catch (e) {
    res.json({ success: true, connected: false });
  }
});

// Seed products from in-memory/dev JSON into Postgres (idempotent-ish by name)
router.post('/admin/seed-products', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(400).json({ success: false, error: 'No database configured' });
    // Load products from memory JSON path via products route file structure
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const productsPath = path.resolve(__dirname, '../data/products.json');
    const raw = fs.readFileSync(productsPath, 'utf8');
    const list = JSON.parse(raw);
    let inserted = 0;
    for (const p of list) {
      try {
        await pool.query(
          `INSERT INTO products (
            id, name, description, price, original_price, category, stock, image, purchase_type,
            groupbuy_is_active, groupbuy_current_participants, groupbuy_min_participants, groupbuy_max_participants, groupbuy_end_date,
            shipping_cost, shipping_delivery_days, details
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          ON CONFLICT (id) DO UPDATE SET
            name=EXCLUDED.name, description=EXCLUDED.description, price=EXCLUDED.price, original_price=EXCLUDED.original_price,
            category=EXCLUDED.category, stock=EXCLUDED.stock, image=EXCLUDED.image, purchase_type=EXCLUDED.purchase_type,
            groupbuy_is_active=EXCLUDED.groupbuy_is_active, groupbuy_current_participants=EXCLUDED.groupbuy_current_participants,
            groupbuy_min_participants=EXCLUDED.groupbuy_min_participants, groupbuy_max_participants=EXCLUDED.groupbuy_max_participants,
            groupbuy_end_date=EXCLUDED.groupbuy_end_date, shipping_cost=EXCLUDED.shipping_cost, shipping_delivery_days=EXCLUDED.shipping_delivery_days,
            details=EXCLUDED.details`,
          [
            p.id, p.name||'', p.description||'', Number(p.price||0), Number(p.originalPrice||0), p.category||'', Number(p.stock||0), p.image||'', p.purchaseType||'group',
            p.groupBuy?.isActive===true, Number(p.groupBuy?.currentParticipants||0), Number(p.groupBuy?.minParticipants||0), Number(p.groupBuy?.maxParticipants||0), p.groupBuy?.endDate? new Date(p.groupBuy.endDate): null,
            Number(p.shipping?.cost||0), Number(p.shipping?.deliveryDays||3), p.details||{}
          ]
        );
        inserted++;
      } catch {}
    }
    res.json({ success: true, inserted });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
