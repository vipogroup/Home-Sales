import { api } from './api.js';

function qs(id){ return document.getElementById(id); }

// ... (כל הקוד נשאר כמו שהוא עד שורה 422)

function bindPresets(){
  // FIXED: שינוי מ-.preset-btn ל-.preset-card
  document.querySelectorAll('.preset-card').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const key = btn.getAttribute('data-preset');
      const preset = designPresets[key];
      if (!preset) return;
      fillDesignForm(preset);
      try { 
        await api.post('/design', preset); 
        qs('designSaveMsg').textContent = 'נשמרה ערכה: '+ key + ' - הדף יתרענן בעוד שנייה...'; 
        setTimeout(()=> { 
          qs('designSaveMsg').textContent=''; 
          window.location.reload(); 
        }, 2000); 
      }
      catch(e){ qs('designSaveMsg').textContent = 'שגיאה בשמירת ערכה: '+e.message; }
    });
  });
}

// הודעה על התיקון
console.log('🔧 Admin.js fixed: Changed .preset-btn to .preset-card and added page reload');

// ... (שאר הקוד נשאר כמו שהוא)
