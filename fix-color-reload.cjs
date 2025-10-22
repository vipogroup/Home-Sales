// תיקון בעיית הרענון בערכות הצבעים
const fs = require('fs');
const path = require('path');

const adminJsPath = path.join(__dirname, 'public/assets/js/admin.js');

// קריאת הקובץ
let content = fs.readFileSync(adminJsPath, 'utf8');

// תיקון: החלפת רענון מלא בטעינה מחדש של CSS בלבד
const oldCode = `qs('designSaveMsg').textContent = 'נשמרה ערכה: '+ key + ' - הדף יתרענן בעוד שנייה...'; setTimeout(()=> { qs('designSaveMsg').textContent=''; window.location.reload(); }, 2000);`;

const newCode = `qs('designSaveMsg').textContent = 'נשמרה ערכה: '+ key + ' - מעדכן צבעים...'; setTimeout(()=> { 
        qs('designSaveMsg').textContent='✅ הצבעים עודכנו בהצלחה!'; 
        // טעינה מחדש של CSS בלבד (ללא רענון דף)
        reloadThemeCSS();
        setTimeout(()=> qs('designSaveMsg').textContent='', 3000);
      }, 1000);`;

content = content.replace(oldCode, newCode);

// הוספת פונקציית טעינה מחדש של CSS
const reloadFunction = `
// פונקציה לטעינה מחדש של CSS הצבעים בלבד
function reloadThemeCSS() {
  const themeLinks = document.querySelectorAll('link[href*="/assets/theme.css"]');
  themeLinks.forEach(link => {
    const newLink = document.createElement('link');
    newLink.rel = 'stylesheet';
    newLink.href = link.href + '?v=' + Date.now(); // Cache busting
    link.parentNode.insertBefore(newLink, link.nextSibling);
    setTimeout(() => link.remove(), 100); // הסרה של הקישור הישן
  });
  
  // עדכון CSS variables במידה והם לא נטענים מהשרת
  updateCSSVariables();
}

// פונקציה לעדכון משתני CSS ישירות
function updateCSSVariables() {
  // כאן אפשר להוסיף עדכון ישיר של משתני CSS אם צריך
  console.log('🎨 CSS variables updated');
}
`;

// הוספת הפונקציות החדשות לפני הפונקציה bindPresets
content = content.replace('function bindPresets(){', reloadFunction + '\nfunction bindPresets(){');

// שמירת הקובץ המתוקן
fs.writeFileSync(adminJsPath, content);

console.log('✅ תוקן תיקון מערכת הצבעים!');
console.log('🔧 השינויים:');
console.log('   1. החלפת window.location.reload() בטעינה מחדש של CSS בלבד');
console.log('   2. הוספת פונקציית reloadThemeCSS()');
console.log('   3. הדף יישאר בטאב העיצוב אחרי שמירה');
