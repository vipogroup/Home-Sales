// תיקון לקובץ admin.js - רק החלק הרלוונטי

function bindPresets(){
  // תיקון: שינוי מ-.preset-btn ל-.preset-card
  document.querySelectorAll('.preset-card').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const key = btn.getAttribute('data-preset');
      const preset = designPresets[key];
      if (!preset) return;
      fillDesignForm(preset);
      try { 
        await api.post('/design', preset); 
        qs('designSaveMsg').textContent = 'נשמרה ערכה: '+ key + ' - הדף יתרענן בעוד שנייה...'; 
        setTimeout(()=>{
          qs('designSaveMsg').textContent='';
          // רענון הדף כדי לטעון את הצבעים החדשים
          window.location.reload();
        }, 2000); 
      }
      catch(e){ 
        qs('designSaveMsg').textContent = 'שגיאה בשמירת ערכה: '+e.message; 
      }
    });
  });
}

// הוספת הקוד הזה לקובץ admin.js הקיים
console.log("🔧 תיקון מערכת הצבעים טעון");

// אם הדף כבר נטען, הפעל את התיקון מיד
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindPresets);
} else {
  bindPresets();
}
