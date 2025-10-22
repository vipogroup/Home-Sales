import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';
import bodyParser from 'body-parser';
import twilio from 'twilio';

import { applySecurityMiddleware } from './middleware/security.js';
import { initPostgres, getPool } from './db/postgres.js';
import helmet from 'helmet';

import authRoutes from './routes/auth.js';
import agentsRoutes from './routes/agents.js';
import productsRoutes from './routes/products.js';
import adminRoutes from './routes/admin.js';
import paymentsRoutes from './routes/payments.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

applySecurityMiddleware(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const { MessagingResponse } = twilio.twiml;
const twilioWebhook = twilio.webhook({ validate: true });

// Shared CSP policy for admin/agent pages
const adminCsp = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https:'],
    styleSrc: ["'self'", 'https:', 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
    connectSrc: ["'self'"],
    frameSrc: ["'self'", 'https:']
  }
});

// Static assets path
const publicDir = path.resolve(__dirname, '../public');
const designFilePath = path.resolve(__dirname, '../design-settings.json');

// Referral cookie middleware: set 'ref' cookie if query contains ?ref=CODE and count visit
app.use((req, res, next) => {
  try {
    const ref = req.query?.ref;
    if (ref) {
      const opts = {
        httpOnly: false,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 90 * 24 * 60 * 60 * 1000,
        path: '/',
      };
      res.cookie('ref', String(ref), opts);
      const pool = getPool();
      if (pool) {
        (async ()=>{ try { await pool.query('UPDATE agents SET visits = COALESCE(visits,0)+1 WHERE referral_code=$1', [String(ref)]); } catch{} })();
      }
    }
  } catch {}
  next();
});

// Serve short referral routes before static, to set cookie then redirect
app.get('/r/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    if (code) {
      const opts = { httpOnly:false, sameSite:'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 90*24*60*60*1000, path:'/' };
      res.cookie('ref', code, opts);
      const pool = getPool();
      if (pool) {
        try { await pool.query('UPDATE agents SET visits = COALESCE(visits,0)+1 WHERE referral_code=$1', [code]); } catch {}
      }
    }
  } catch {}
  return res.redirect('/shop');
});

app.get('/r/:code/p/:id', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim();
    const id = String(req.params.id || '').trim();
    if (code) {
      const opts = { httpOnly:false, sameSite:'lax', secure: process.env.COOKIE_SECURE === 'true', maxAge: 90*24*60*60*1000, path:'/' };
      res.cookie('ref', code, opts);
      const pool = getPool();
      if (pool) {
        try { await pool.query('UPDATE agents SET visits = COALESCE(visits,0)+1 WHERE referral_code=$1', [code]); } catch {}
      }
    }
    return res.redirect(`/product/${encodeURIComponent(id)}`);
  } catch {
    return res.redirect('/shop');
  }
});

// Serve static after referral cookie middleware
app.use(express.static(publicDir));
// Dynamic theme CSS (CSP-safe): exposes CSS variables from DB settings
app.get('/assets/theme.css', async (req, res) => {
  try {
    const pool = getPool();
    const defaults = {
      joinBtnColor: '#667eea',
      headerBgColor: '#ffffff',
      progressBarColor: '#667eea',
      mainTitleColor: '#222222',
      discountBadgeBg: '#e74c3c',
      discountBadgeText: '#ffffff',
      detailsBtnBg: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
      categoryTextColor: '#667eea',
      priceSectionBg: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
      shippingInfoBg: 'linear-gradient(135deg,#3498db 0%,#2980b9 100%)',
      installmentsInfoBg: '#f0f8ff',
      cardRadius: '20px',
      gridMin: '350px',
      gridGap: '2rem',
      pageBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      priceTextColor: '#e74c3c',
      daysLeftColor: '#e74c3c',
      buttonRadius: '25px',
      secondaryBtnBg: '#95a5a6',
      secondaryBtnText: '#ffffff',
      categoryChipBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      infoBg: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
      warningBg: 'linear-gradient(135deg,#fff3cd 0%,#ffeaa7 100%)',
      warningBorder: '#f39c12',
      successBg: 'rgba(46, 204, 113, 0.1)',
      successBorder: '#2ecc71'
    };
    let design = { ...defaults };
    if (pool) {
      try {
        const r = await pool.query('SELECT value FROM settings WHERE key=$1 LIMIT 1', ['design']);
        if (r.rows?.length) {
          design = { ...defaults, ...(r.rows[0].value || {}) };
        }
      } catch {}
    }
    // Merge file-based settings (works even without DB)
    try {
      if (fs.existsSync(designFilePath)) {
        const raw = fs.readFileSync(designFilePath, 'utf8');
        const fileDesign = JSON.parse(raw || '{}');
        design = { ...design, ...fileDesign };
      }
    } catch {}
    const primary = design.joinBtnColor || defaults.joinBtnColor;
    const headerBg = design.headerBgColor || defaults.headerBgColor;
    const titleColor = design.mainTitleColor || defaults.mainTitleColor;
    const progressBg = (design.progressBarColor || design.joinBtnColor || defaults.progressBarColor);
    const discountBg = design.discountBadgeBg || defaults.discountBadgeBg;
    const discountText = design.discountBadgeText || defaults.discountBadgeText;
    const detailsBg = design.detailsBtnBg || defaults.detailsBtnBg;
    const categoryColor = design.categoryTextColor || defaults.categoryTextColor;
    const priceBg = design.priceSectionBg || defaults.priceSectionBg;
    const shipBg = design.shippingInfoBg || defaults.shippingInfoBg;
    const instBg = design.installmentsInfoBg || defaults.installmentsInfoBg;
    const cardRadius = design.cardRadius || defaults.cardRadius;
    const gridMin = design.gridMin || defaults.gridMin;
    const gridGap = design.gridGap || defaults.gridGap;
    const pageBg = design.pageBg || defaults.pageBg;
    const priceText = design.priceTextColor || defaults.priceTextColor;
    const daysLeft = design.daysLeftColor || defaults.daysLeftColor;
    const btnRadius = design.buttonRadius || defaults.buttonRadius;
    const secBg = design.secondaryBtnBg || defaults.secondaryBtnBg;
    const secText = design.secondaryBtnText || defaults.secondaryBtnText;
    const categoryChipBg = design.categoryChipBg || defaults.categoryChipBg;
    const infoBg = design.infoBg || defaults.infoBg;
    const warnBg = design.warningBg || defaults.warningBg;
    const warnBorder = design.warningBorder || defaults.warningBorder;
    const successBg = design.successBg || defaults.successBg;
    const successBorder = design.successBorder || defaults.successBorder;
    // Generate comprehensive CSS with all variables
    const css = `:root {
      /* Primary Colors */
      --vipo-primary: ${primary};
      --vipo-join-bg: ${primary};
      --vipo-header-bg: ${headerBg};
      --vipo-title-color: ${titleColor};
      --vipo-progress-bg: ${progressBg};
      
      /* Discount & Badges */
      --vipo-discount-bg: ${discountBg};
      --vipo-discount-text: ${discountText};
      --vipo-category-color: ${categoryColor};
      --vipo-category-bg: ${categoryChipBg};
      
      /* Buttons */
      --vipo-details-bg: ${detailsBg};
      --vipo-secondary-bg: ${secBg};
      --vipo-secondary-text: ${secText};
      --vipo-button-radius: ${btnRadius};
      
      /* Sections & Backgrounds */
      --vipo-price-bg: ${priceBg};
      --vipo-price-section-bg: ${priceBg};
      --vipo-ship-bg: ${shipBg};
      --vipo-shipping-info-bg: ${shipBg};
      --vipo-inst-bg: ${instBg};
      --vipo-installments-info-bg: ${instBg};
      --vipo-page-bg: ${pageBg};
      
      /* Text Colors */
      --vipo-price-text: ${priceText};
      --vipo-days-left: ${daysLeft};
      
      /* Layout */
      --vipo-card-radius: ${cardRadius};
      --vipo-grid-min: ${gridMin};
      --vipo-grid-gap: ${gridGap};
      
      /* Status & Alerts */
      --vipo-info-bg: ${infoBg};
      --vipo-warning-bg: ${warnBg};
      --vipo-warning-border: ${warnBorder};
      --vipo-success-bg: ${successBg};
      --vipo-success-border: ${successBorder};
    }`;
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    return res.send(css);
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    return res.send(':root{}');
  }
});

// Friendly routes for shop pages
app.get('/shop', (req, res) => {
  res.sendFile(path.join(publicDir, 'shop', 'index.html'));
});

app.get('/product/:id', (req, res) => {
  res.sendFile(path.join(publicDir, 'shop', 'product.html'));
});

app.get('/shop/checkout', (req, res) => {
  res.sendFile(path.join(publicDir, 'shop', 'checkout.html'));
});

app.get('/shop/payment-success', (req, res) => {
  res.sendFile(path.join(publicDir, 'shop', 'payment-success.html'));
});

app.get('/shop/payment-cancel', (req, res) => {
  res.sendFile(path.join(publicDir, 'shop', 'payment-cancel.html'));
});

app.get('/my-orders', (req, res) => {
  res.sendFile(path.join(publicDir, 'shop', 'my-orders.html'));
});

// Agent friendly routes (re-use admin CSP policy)
app.get('/agent/login', adminCsp, (req, res) => {
  res.sendFile(path.join(publicDir, 'agent', 'login.html'));
});

app.get('/agent/dashboard', adminCsp, (req, res) => {
  res.sendFile(path.join(publicDir, 'agent', 'dashboard.html'));
});

app.get('/agent/register', adminCsp, (req, res) => {
  res.sendFile(path.join(publicDir, 'agent', 'register.html'));
});

app.get('/admin', adminCsp, (req, res) => {
  res.sendFile(path.join(publicDir, 'admin', 'login.html'));
});

app.get('/admin/login', adminCsp, (req, res) => {
  res.sendFile(path.join(publicDir, 'admin', 'login.html'));
});

app.get('/admin/dashboard', adminCsp, (req, res) => {
  res.sendFile(path.join(publicDir, 'admin', 'dashboard.html'));
});

// Health
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/twilio/incoming', twilioWebhook, (req, res) => {
  const from = req.body.From || '';
  const body = (req.body.Body || '').trim();
  try { console.log('Incoming:', { from, body }); } catch {}
  const twiml = new MessagingResponse();
  twiml.message(`קיבלתי: ${body}`);
  res.type('text/xml').status(200).send(twiml.toString());
});

app.post('/twilio/status', (req, res) => {
  try { console.log('Status:', req.body?.MessageSid, req.body?.MessageStatus); } catch {}
  res.sendStatus(204);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// API routes
app.use('/api', authRoutes);
app.use('/api', agentsRoutes);
app.use('/api', productsRoutes);
app.use('/api', adminRoutes);
app.use('/api', paymentsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Server error' });
});

// Helper function to get local IP address
function getLocalIpAddress() {
  const nets = os.networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback to localhost if no external IP found
}

let dbInitialized = false;
async function ensureDbOnce() {
  if (dbInitialized) return;
  await initPostgres();
  dbInitialized = true;
}

function startWithFallback(ports) {
  if (!ports.length) {
    console.error('[Server] No available ports to bind. Exiting.');
    process.exit(1);
  }
  const port = ports[0];
  const server = app.listen(port, '0.0.0.0', async () => {
    const localIp = getLocalIpAddress();
    console.log(`VIPO unified server listening on http://localhost:${port}`);
    console.log(`Network access available at: http://${localIp}:${port}`);
    await ensureDbOnce();
  });
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${port} in use, trying next...`);
      startWithFallback(ports.slice(1));
    } else {
      console.error('Server listen error:', err);
      process.exit(1);
    }
  });
}

const port = Number(process.env.PORT) || 10000;
const server = app.listen(port, '0.0.0.0', async () => {
  const localIp = getLocalIpAddress();
  console.log(`VIPO unified server listening on http://localhost:${port}`);
  console.log(`Network access available at: http://${localIp}:${port}`);
  await ensureDbOnce();
});
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${port} in use. Set PORT env to a free port or stop the conflicting process.`);
  } else {
    console.error('Server listen error:', err);
  }
  process.exit(1);
});
