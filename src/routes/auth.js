import { Router } from 'express';
const router = Router();
import jwt from 'jsonwebtoken';
import { getPool } from '../db/postgres.js';
import { memory } from '../store/memory.js';

router.get('/admin/status', (req, res) => {
  try {
    if (process.env.ENABLE_ADMIN_AUTH !== 'true') {
      return res.json({ success: true, mode: 'dev', role: 'admin' });
    }
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);
    if (!payload || payload.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    return res.json({ success: true, role: 'admin' });
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
});

router.post('/admin/login', (req, res) => {
  try {
    const { user, password } = req.body || {};
    const ADMIN_USER = process.env.ADMIN_USER || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';
    if (!user || !password) {
      return res.status(400).json({ success: false, error: 'Missing credentials' });
    }
    if (user !== ADMIN_USER || password !== ADMIN_PASS) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const token = jwt.sign({ role: 'admin', uid: user }, secret, { expiresIn: '7d' });
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

router.post('/admin/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true });
});

router.post('/agent/login', (req, res) => {
  (async ()=>{
    try {
      const { referralCode } = req.body || {};
      if (!referralCode) return res.status(400).json({ success:false, error:'Missing referralCode' });
      let agent = null;
      const pool = getPool();
      if (pool) {
        try {
          const r = await pool.query('SELECT id, full_name, referral_code, is_active FROM agents WHERE referral_code=$1 LIMIT 1', [String(referralCode)]);
          if (r.rows.length) agent = { id: r.rows[0].id, name: r.rows[0].full_name, is_active: r.rows[0].is_active!==false };
        } catch {}
      }
      if (!agent) return res.status(401).json({ success:false, error:'Agent not found' });
      if (agent.is_active === false) return res.status(403).json({ success:false, error:'Agent inactive' });
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const token = jwt.sign({ role:'agent', agentId: agent.id, name: agent.name||'Agent' }, secret, { expiresIn:'7d' });
      res.cookie('agent_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 7*24*60*60*1000,
        path: '/',
      });
      res.json({ success:true });
    } catch (e) { res.status(500).json({ success:false, error:'Login failed' }); }
  })();
});

// Agent self registration (public)
router.post('/agent/register', (req, res) => {
  (async ()=>{
    try {
      const { full_name, email, phone } = req.body || {};
      if (!full_name || !email || !phone) return res.status(400).json({ success:false, error:'Missing fields' });
      const pool = getPool();
      // helper to gen unique referral code
      const genCode = ()=> 'A'+Math.random().toString(36).slice(2,8).toUpperCase();
      let referral_code = genCode();
      if (pool) {
        try {
          // ensure unique code
          for (let i=0;i<5;i++){
            const r = await pool.query('SELECT 1 FROM agents WHERE referral_code=$1 LIMIT 1', [referral_code]);
            if (!r.rows.length) break; referral_code = genCode();
          }
          const ins = await pool.query(
            'INSERT INTO agents (full_name, email, phone, referral_code, is_active, created_at, visits, sales, total_commissions) VALUES ($1,$2,$3,$4,TRUE,NOW(),0,0,0) RETURNING id, full_name',
            [full_name, email, phone, referral_code]
          );
          const agentId = ins.rows[0].id;
          const name = ins.rows[0].full_name || full_name;
          const secret = process.env.JWT_SECRET || 'dev-secret';
          const token = jwt.sign({ role:'agent', agentId, name }, secret, { expiresIn:'7d' });
          res.cookie('agent_token', token, { httpOnly:true, sameSite:'lax', secure: process.env.COOKIE_SECURE==='true', maxAge:7*24*60*60*1000, path:'/' });
          return res.json({ success:true, referralCode: referral_code, agentId });
        } catch (e) {
          return res.status(400).json({ success:false, error:e.message });
        }
      }
      // fallback: memory only
      try { memory.agents = memory.agents || []; } catch {}
      const id = (memory.agents||[]).reduce((m,a)=> Math.max(m, Number(a.id||0)), 0) + 1;
      referral_code = genCode();
      memory.agents.push({ id, full_name, email, phone, referral_code, is_active:true, created_at:new Date().toISOString(), visits:0, sales:0, totalCommissions:0, role:'agent' });
      const secret = process.env.JWT_SECRET || 'dev-secret';
      const token = jwt.sign({ role:'agent', agentId:id, name: full_name }, secret, { expiresIn:'7d' });
      res.cookie('agent_token', token, { httpOnly:true, sameSite:'lax', secure: process.env.COOKIE_SECURE==='true', maxAge:7*24*60*60*1000, path:'/' });
      return res.json({ success:true, referralCode: referral_code, agentId:id });
    } catch (e) { return res.status(500).json({ success:false, error:'Registration failed' }); }
  })();
});

router.get('/agent/status', (req, res) => {
  try{
    const token = req.cookies?.agent_token;
    if (!token) return res.status(401).json({ success:false, error:'Unauthorized' });
    const secret = process.env.JWT_SECRET || 'dev-secret';
    const payload = jwt.verify(token, secret);
    if (!payload || payload.role !== 'agent') return res.status(403).json({ success:false, error:'Forbidden' });
    res.json({ success:true, role:'agent', agentId: payload.agentId, name: payload.name });
  }catch{ return res.status(401).json({ success:false, error:'Unauthorized' }); }
});

router.post('/agent/logout', (req, res) => {
  res.clearCookie('agent_token', { path:'/' });
  res.json({ success:true });
});

router.get('/auth/ping', (req, res) => {
  res.json({ success: true });
});

export default router;
