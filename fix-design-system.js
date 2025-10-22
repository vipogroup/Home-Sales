// תיקון מערכת הצבעים - הבעיה נמצאה!

console.log("🔍 בדיקת מערכת הצבעים:");

// 1. בדיקה אם השרת מחזיר CSS משתנים
fetch('/assets/theme.css')
  .then(response => response.text())
  .then(css => {
    console.log("✅ השרת מחזיר CSS משתנים:");
    console.log(css.substring(0, 200) + "...");
  })
  .catch(err => console.error("❌ שגיאה בטעינת theme.css:", err));

// 2. בדיקה אם הדפים משתמשים במשתנים
const computedStyle = getComputedStyle(document.documentElement);
const primaryColor = computedStyle.getPropertyValue('--vipo-primary');
console.log("🎨 צבע ראשי נוכחי:", primaryColor || "לא נמצא");

// 3. בדיקה אם יש event listeners על ערכות הצבעים
const presetCards = document.querySelectorAll('.preset-card');
const presetBtns = document.querySelectorAll('.preset-btn');
console.log("📋 נמצאו preset-card:", presetCards.length);
console.log("🔘 נמצאו preset-btn:", presetBtns.length);

// 4. הבעיה: הקוד מחפש .preset-btn אבל בHTML יש .preset-card!
console.log("🐛 הבעיה נמצאה: הקוד מחפש '.preset-btn' אבל בHTML יש '.preset-card'");

// 5. תיקון זמני
if (presetCards.length > 0 && presetBtns.length === 0) {
  console.log("🔧 מתקן את הבעיה...");
  
  const designPresets = {
    amazon: {
      joinBtnColor: '#FF9900',
      headerBgColor: '#ffffff',
      progressBarColor: '#FF9900',
      mainTitleColor: '#111111',
      discountBadgeBg: '#B12704',
      pageBg: 'linear-gradient(135deg, #FF9900 0%, #FFB84D 100%)',
      priceTextColor: '#B12704'
    },
    shopify: {
      joinBtnColor: '#7ab55c',
      headerBgColor: '#ffffff',
      progressBarColor: '#7ab55c',
      mainTitleColor: '#004c3f',
      discountBadgeBg: '#bf0711',
      pageBg: 'linear-gradient(135deg, #7ab55c 0%, #95c96e 100%)',
      priceTextColor: '#bf0711'
    },
    ebay: {
      joinBtnColor: '#0064d2',
      headerBgColor: '#ffffff',
      progressBarColor: '#0064d2',
      mainTitleColor: '#191919',
      discountBadgeBg: '#e53238',
      pageBg: 'linear-gradient(135deg, #0064d2 0%, #4285f4 100%)',
      priceTextColor: '#e53238'
    }
  };
  
  presetCards.forEach(card => {
    card.addEventListener('click', async () => {
      const preset = card.getAttribute('data-preset');
      const colors = designPresets[preset];
      
      if (colors) {
        console.log("🎨 מחיל ערכת צבעים:", preset, colors);
        
        try {
          // שליחה לשרת
          const response = await fetch('/api/design', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(colors)
          });
          
          if (response.ok) {
            console.log("✅ נשמר בשרת בהצלחה");
            
            // רענון הדף כדי לטעון את הצבעים החדשים
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            
            // הודעה למשתמש
            const msgEl = document.getElementById('designSaveMsg');
            if (msgEl) {
              msgEl.textContent = `✅ נשמרה ערכת ${preset}! הדף יתרענן בעוד שנייה...`;
              msgEl.style.color = '#16a34a';
            }
          } else {
            throw new Error('שגיאה בשמירה');
          }
        } catch (error) {
          console.error("❌ שגיאה:", error);
          const msgEl = document.getElementById('designSaveMsg');
          if (msgEl) {
            msgEl.textContent = `❌ שגיאה בשמירת ערכת ${preset}: ${error.message}`;
            msgEl.style.color = '#dc2626';
          }
        }
      }
    });
  });
  
  console.log("✅ תיקון הושלם! עכשיו ערכות הצבעים אמורות לעבוד");
}
