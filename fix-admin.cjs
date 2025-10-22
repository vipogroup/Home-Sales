// קובץ זמני לתיקון admin.js
const fs = require('fs');
const path = require('path');

const adminJsPath = path.join(__dirname, 'public/assets/js/admin.js');

// קריאת הקובץ
let content = fs.readFileSync(adminJsPath, 'utf8');

// תיקון 1: שינוי מ-.preset-btn ל-.preset-card
content = content.replace(
  "document.querySelectorAll('.preset-btn').forEach(btn=>{",
  "document.querySelectorAll('.preset-card').forEach(btn=>{"
);

// תיקון 2: הוספת רענון דף אחרי שמירה
content = content.replace(
  "qs('designSaveMsg').textContent = 'נשמרה ערכה: '+ key; setTimeout(()=>qs('designSaveMsg').textContent='', 2000);",
  "qs('designSaveMsg').textContent = 'נשמרה ערכה: '+ key + ' - הדף יתרענן בעוד שנייה...'; setTimeout(()=> { qs('designSaveMsg').textContent=''; window.location.reload(); }, 2000);"
);

// שמירת הקובץ המתוקן
fs.writeFileSync(adminJsPath, content);

console.log('✅ admin.js תוקן בהצלחה!');
console.log('🔧 השינויים:');
console.log('   1. שינוי מ-.preset-btn ל-.preset-card');
console.log('   2. הוספת רענון דף אחרי שמירת ערכת צבעים');
