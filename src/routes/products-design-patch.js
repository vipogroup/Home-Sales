// Patch for design settings - add to products.js

// Add these imports at the top
const designFilePath = path.resolve(__dirname, '../../design-settings.json');

// Add these functions after the existing functions
function loadDesignSettings() {
  try {
    if (fs.existsSync(designFilePath)) {
      const raw = fs.readFileSync(designFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed loading design settings:', e.message);
  }
  
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

// Replace the designSettings initialization
// let designSettings = { joinBtnColor: '#667eea' };
// with:
let designSettings = loadDesignSettings();

// Replace the design routes:
// Design settings
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
