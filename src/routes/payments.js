import { Router } from 'express';
import { createHmac } from 'crypto';
const router = Router();

import { getPool } from '../db/postgres.js';
import { memory } from '../store/memory.js';

function normalizePayStatus(status) {
  const s = String(status || '').toLowerCase();
  if (!s) return 'paid';
  if (['paid', 'success', 'succeeded', 'approved', 'completed'].includes(s)) return 'paid';
  if (['cancelled', 'canceled', 'void', 'reversed'].includes(s)) return 'canceled';
  if (['failed', 'error', 'declined'].includes(s)) return 'failed';
  if (['pending', 'processing', 'in_progress', 'created'].includes(s)) return 'pending';
  return 'pending';
}

// Create payment session. If PayPlus integration env is configured, return hosted redirect; otherwise fall back to local success page.
router.post('/payments/create', async (req, res) => {
  try {
    const { productId, quantity = 1, method, referralCode } = req.body || {};
    if (!productId) return res.status(400).json({ success:false, error:'productId required' });
    // Compute order total from DB (fallback to 0 if DB not available)
    const pool = getPool();
    let price = 0, shipping = 0;
    let agentId = null;
    if (pool) {
      try {
        const r = await pool.query('SELECT price, shipping_cost FROM products WHERE id=$1 LIMIT 1', [Number(productId)]);
        if (!r.rows.length) return res.status(404).json({ success:false, error:'Product not found' });
        price = Number(r.rows[0].price||0);
        shipping = Number(r.rows[0].shipping_cost||0);
        if (referralCode) {
          try { const ra = await pool.query('SELECT id FROM agents WHERE referral_code=$1 LIMIT 1', [String(referralCode)]); agentId = ra.rows[0]?.id || null; } catch {}
        }
      } catch (dbErr) {
        // keep price/shipping as 0
      }
    }
    if (!pool && referralCode) {
      try { const ag = (memory.agents||[]).find(a=> String(a.referral_code)===String(referralCode)); agentId = ag?.id || null; } catch {}
    }
    const qty = Math.max(1, Number(quantity||1));
    const subtotal = price * qty;
    // For online/installments there is no delivery-on-delivery fee; shipping applies
    const beforeVat = subtotal + shipping;
    const vat = Math.round(beforeVat * 0.18);
    const total = beforeVat + vat;

    // Create a pending order in DB if available
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random()*1e4)}`;
    if (pool) {
      try {
        await pool.query('INSERT INTO orders (id, product_id, agent_id, quantity, total_amount, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())', [orderId, Number(productId), agentId, qty, Number(total||0), 'pending']);
      } catch {}
    }

    // Hosted payment redirect (optional): if PAYPLUS_REDIRECT_TEMPLATE is set, fill it
    // Example template: https://sandbox.payplus.co.il/redirect?order_id={ORDER_ID}&amount={AMOUNT}
    const tmpl = process.env.PAYPLUS_REDIRECT_TEMPLATE;
    let redirectUrl = `/shop/payment-success.html?order_id=${encodeURIComponent(orderId)}&status=paid`;
    if (tmpl && /^https?:\/\//i.test(tmpl)) {
      redirectUrl = tmpl.replace('{ORDER_ID}', encodeURIComponent(orderId)).replace('{AMOUNT}', encodeURIComponent(String(total||0)));
    } else {
      // Demo mode: mark order as paid immediately so UI status aligns
      try {
        if (pool) {
          await pool.query('UPDATE orders SET status=$1, payment_ref=$2, updated_at=NOW() WHERE id=$3', ['paid', 'DEMO', String(orderId)]);
          // Record sale + commission (10%) if we have an agent
          if (agentId) {
            const commission = Math.round(Number(total||0) * 0.10);
            await pool.query('INSERT INTO sales (agent_id, product_id, amount, commission, date) VALUES ($1,$2,$3,$4,NOW())', [agentId, Number(productId), Number(total||0), commission]);
            await pool.query('UPDATE agents SET sales = COALESCE(sales,0)+1, total_commissions = COALESCE(total_commissions,0)+$1 WHERE id=$2', [commission, agentId]);
          }
        }
      } catch {}
      if (!pool && agentId) {
        // in-memory sale record
        try {
          const commission = Math.round(Number(total||0) * 0.10);
          memory.sales = memory.sales || [];
          memory.sales.push({ id: `S-${Date.now()}`, agent_id: agentId, product_id: Number(productId), amount: Number(total||0), commission, date: new Date().toISOString() });
          const ag = (memory.agents||[]).find(a=> Number(a.id)===Number(agentId));
          if (ag) { ag.sales = (ag.sales||0)+1; ag.totalCommissions = (ag.totalCommissions||0)+commission; }
        } catch {}
      }
    }

    res.json({ success:true, redirectUrl, orderId, amount: total, method: method||'online' });
  } catch (e) {
    res.status(500).json({ success:false, error:e.message });
  }
});

// Webhook placeholder for payment provider (to be implemented with signature verification)
router.post('/payments/webhook/payplus', async (req, res) => {
  try {
    const secret = process.env.PAYPLUS_SIGNING_SECRET || '';
    if (secret) {
      const sig = req.get('x-payplus-signature') || '';
      const payload = JSON.stringify(req.body || {});
      const calc = createHmac('sha256', secret).update(payload).digest('hex');
      if (!sig || sig !== calc) return res.status(401).json({ success:false });
    }
    const { orderId, status, paymentRef } = req.body || {};
    if (!orderId) return res.status(400).json({ success:false, error:'orderId required' });
    const pool = getPool();
    if (pool) {
      try {
        const normalized = normalizePayStatus(status);
        await pool.query('UPDATE orders SET status=$1, payment_ref=$2, updated_at=NOW() WHERE id=$3', [normalized, paymentRef||null, String(orderId)]);
      } catch {}
    }
    res.json({ success:true });
  } catch (e) {
    res.status(400).json({ success:false });
  }
});

router.post('/payments/dev/mark', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ success:false, error:'Not allowed in production' });
    const { orderId, status = 'paid', paymentRef } = req.body || {};
    if (!orderId) return res.status(400).json({ success:false, error:'orderId required' });
    const pool = getPool();
    if (pool) {
      try { const normalized = normalizePayStatus(status); await pool.query('UPDATE orders SET status=$1, payment_ref=$2, updated_at=NOW() WHERE id=$3', [normalized, paymentRef||null, String(orderId)]); }
      catch {}
    }
    res.json({ success:true });
  } catch (e) {
    res.status(400).json({ success:false, error:e.message });
  }
});

export default router;
