// פתרון זמני למערכת הצבעים - שמירה בקובץ JSON
import fs from 'fs';
import path from 'path';

const designFilePath = path.join(process.cwd(), 'design-settings.json');

// ברירות מחדל
const defaultSettings = {
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

// יצירת קובץ ברירות מחדל
try {
  fs.writeFileSync(designFilePath, JSON.stringify(defaultSettings, null, 2));
  console.log('✅ נוצר קובץ הגדרות עיצוב:', designFilePath);
} catch (e) {
  console.error('❌ שגיאה ביצירת קובץ הגדרות:', e.message);
}
