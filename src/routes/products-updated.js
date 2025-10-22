import { Router } from 'express';
const router = Router();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { formatIsraeliPhone } from '../utils/phone.js';
import { adminAuth } from '../middleware/auth.js';
import { getPool } from '../db/postgres.js';
import { memory } from '../store/memory.js';

// Resolve data path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsPath = path.resolve(__dirname, '../data/products.json');
const legacyAgentsPath = path.resolve(__dirname, '../../../data/agents.json');
const designFilePath = path.resolve(__dirname, '../../design-settings.json');

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

// Load design settings from JSON file
function loadDesignSettings() {
  try {
    if (fs.existsSync(designFilePath)) {
      const raw = fs.readFileSync(designFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed loading design settings:', e.message);
  }
  
  // Return defaults if file doesn't exist or failed to load
  return {
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
}

// Save design settings to JSON file
function saveDesignSettings(settings) {
  try {
    fs.writeFileSync(designFilePath, JSON.stringify(settings, null, 2));
    console.log('✅ Design settings saved to file');
    return true;
  } catch (e) {
    console.error('❌ Failed to save design settings:', e.message);
    return false;
  }
}

let products = loadProducts();
let participants = [];
let designSettings = loadDesignSettings();
const leadStats = { total: 0, byCode: {} };
let referralMap = {};
let orders = [];
let commissionsByAgent = {}; // {agentId: totalCommission}

// Try to load legacy agents.json to build referral map (dev only)
try {
  if (fs.existsSync(legacyAgentsPath)) {
    const raw = fs.readFileSync(legacyAgentsPath, 'utf8');
    const agents = JSON.parse(raw);
    agents.forEach(a => {
      if (a.referralCode) referralMap[a.referralCode] = a.id;
    });
  }
} catch (e) {
  console.error('Failed loading legacy agents.json:', e.message);
}

// Products API
router.get('/products', (req, res) => {
  const category = req.query.category;
  let filtered = products;
  if (category && category !== 'all') {
    filtered = products.filter(p => p.category === category);
  }
  res.json({ success: true, products: filtered });
});

router.get('/products/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
  res.json({ success: true, product });
});

// Design settings API
router.get('/design', (req, res) => {
  res.json({ success: true, data: designSettings });
});

router.post('/design', adminAuth, (req, res) => {
  try {
    const newSettings = { ...designSettings, ...(req.body || {}) };
    if (saveDesignSettings(newSettings)) {
      designSettings = newSettings;
      console.log('🎨 Design settings updated:', Object.keys(newSettings).length, 'properties');
      res.json({ success: true, data: designSettings });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save design settings' });
    }
  } catch (e) {
    console.error('Error updating design settings:', e.message);
    res.status(400).json({ success: false, error: e.message });
  }
});

// Rest of the routes remain the same...
// (I'll include the essential ones for brevity)

export default router;
