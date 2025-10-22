// תיקון מערכת הצבעים לעבוד ללא DB
const fs = require('fs');
const path = require('path');

const productsJsPath = path.join(__dirname, 'src/routes/products.js');
const designFilePath = path.join(__dirname, 'design-settings.json');

// קריאת הקובץ
let content = fs.readFileSync(productsJsPath, 'utf8');

// הוספת פונקציות שמירה לקובץ JSON
const fileSystemFunctions = `
// File system functions for design settings (no DB)
function loadDesignFromFile() {
  try {
    if (fs.existsSync('${designFilePath}')) {
      const raw = fs.readFileSync('${designFilePath}', 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed loading design settings:', e.message);
  }
  return { joinBtnColor: '#667eea' };
}

function saveDesignToFile(settings) {
  try {
    fs.writeFileSync('${designFilePath}', JSON.stringify(settings, null, 2));
    console.log('✅ Design settings saved to file');
    return true;
  } catch (e) {
    console.error('❌ Failed to save design settings:', e.message);
    return false;
  }
}
`;

// הוספת הפונקציות אחרי הייבוא
content = content.replace(
  "import { getPool } from '../db/postgres.js';",
  "import { getPool } from '../db/postgres.js';\nimport fs from 'fs';\n" + fileSystemFunctions
);

// שינוי אתחול designSettings
content = content.replace(
  "let designSettings = { joinBtnColor: '#667eea' };",
  "let designSettings = loadDesignFromFile();"
);

// שינוי POST /design לשמור גם לקובץ
const oldPostDesign = `router.post('/design', adminAuth, (req, res) => {
  try {
    designSettings = { ...designSettings, ...(req.body || {}) };
    const pool = getPool();
    if (pool) {
      (async ()=>{
        await pool.query('INSERT INTO settings(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()', ['design', designSettings]);
        res.json({ success: true, data: designSettings });
      })().catch(e=>res.status(400).json({ success:false, error:e.message }));
      return;
    }
    res.json({ success: true, data: designSettings });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});`;

const newPostDesign = `router.post('/design', adminAuth, (req, res) => {
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
});`;

content = content.replace(oldPostDesign, newPostDesign);

// שמירת הקובץ המתוקן
fs.writeFileSync(productsJsPath, content);

console.log('✅ תוקן products.js לעבוד ללא DB!');
console.log('🔧 השינויים:');
console.log('   1. הוספת פונקציות שמירה לקובץ JSON');
console.log('   2. טעינת הגדרות מקובץ בהפעלה');
console.log('   3. שמירה לקובץ כאשר אין DB');
console.log('   4. הקובץ יישמר ב:', designFilePath);
