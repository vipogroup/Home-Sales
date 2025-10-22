// תיקון זמני למערכת הצבעים
// הקובץ הזה יעקוף את בעיית הדטאבייס ויישמר בלוקל סטורג'

class DesignManager {
  constructor() {
    this.storageKey = 'vipo-design-settings';
    this.defaultSettings = {
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
    
    this.presets = {
      amazon: {
        joinBtnColor: '#FF9900',
        headerBgColor: '#ffffff',
        progressBarColor: '#FF9900',
        mainTitleColor: '#111111',
        discountBadgeBg: '#B12704',
        discountBadgeText: '#ffffff',
        detailsBtnBg: 'linear-gradient(135deg,#232F3E 0%,#37475A 100%)',
        categoryTextColor: '#232F3E',
        priceSectionBg: 'linear-gradient(135deg,#FF9900 0%,#FFB84D 100%)',
        shippingInfoBg: 'linear-gradient(135deg,#232F3E 0%,#37475A 100%)',
        pageBg: 'linear-gradient(135deg, #FF9900 0%, #FFB84D 100%)',
        priceTextColor: '#B12704',
        daysLeftColor: '#B12704'
      },
      shopify: {
        joinBtnColor: '#7ab55c',
        headerBgColor: '#ffffff',
        progressBarColor: '#7ab55c',
        mainTitleColor: '#004c3f',
        discountBadgeBg: '#bf0711',
        discountBadgeText: '#ffffff',
        detailsBtnBg: 'linear-gradient(135deg,#004c3f 0%,#7ab55c 100%)',
        categoryTextColor: '#004c3f',
        priceSectionBg: 'linear-gradient(135deg,#7ab55c 0%,#95c96e 100%)',
        shippingInfoBg: 'linear-gradient(135deg,#004c3f 0%,#7ab55c 100%)',
        pageBg: 'linear-gradient(135deg, #7ab55c 0%, #95c96e 100%)',
        priceTextColor: '#bf0711',
        daysLeftColor: '#bf0711'
      },
      ebay: {
        joinBtnColor: '#0064d2',
        headerBgColor: '#ffffff',
        progressBarColor: '#0064d2',
        mainTitleColor: '#191919',
        discountBadgeBg: '#e53238',
        discountBadgeText: '#ffffff',
        detailsBtnBg: 'linear-gradient(135deg,#0064d2 0%,#4285f4 100%)',
        categoryTextColor: '#0064d2',
        priceSectionBg: 'linear-gradient(135deg,#0064d2 0%,#4285f4 100%)',
        shippingInfoBg: 'linear-gradient(135deg,#0064d2 0%,#4285f4 100%)',
        pageBg: 'linear-gradient(135deg, #0064d2 0%, #4285f4 100%)',
        priceTextColor: '#e53238',
        daysLeftColor: '#e53238'
      }
    };
    
    this.init();
  }
  
  init() {
    // טען הגדרות מלוקל סטורג'
    this.loadSettings();
    
    // החל הגדרות על הדף
    this.applySettings();
    
    // האזן לשינויים
    this.bindEvents();
  }
  
  loadSettings() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.currentSettings = { ...this.defaultSettings, ...JSON.parse(saved) };
      } else {
        this.currentSettings = { ...this.defaultSettings };
      }
    } catch (e) {
      console.error('Failed to load design settings:', e);
      this.currentSettings = { ...this.defaultSettings };
    }
  }
  
  saveSettings(settings) {
    try {
      this.currentSettings = { ...this.currentSettings, ...settings };
      localStorage.setItem(this.storageKey, JSON.stringify(this.currentSettings));
      this.applySettings();
      console.log('✅ Design settings saved locally');
      return true;
    } catch (e) {
      console.error('❌ Failed to save design settings:', e);
      return false;
    }
  }
  
  applySettings() {
    // יצירת CSS משתנים
    const root = document.documentElement;
    const settings = this.currentSettings;
    
    // החלת משתני CSS
    root.style.setProperty('--vipo-primary', settings.joinBtnColor);
    root.style.setProperty('--vipo-header-bg', settings.headerBgColor);
    root.style.setProperty('--vipo-progress-bg', settings.progressBarColor);
    root.style.setProperty('--vipo-title-color', settings.mainTitleColor);
    root.style.setProperty('--vipo-discount-bg', settings.discountBadgeBg);
    root.style.setProperty('--vipo-discount-text', settings.discountBadgeText);
    root.style.setProperty('--vipo-details-bg', settings.detailsBtnBg);
    root.style.setProperty('--vipo-category-color', settings.categoryTextColor);
    root.style.setProperty('--vipo-price-bg', settings.priceSectionBg);
    root.style.setProperty('--vipo-ship-bg', settings.shippingInfoBg);
    root.style.setProperty('--vipo-page-bg', settings.pageBg);
    root.style.setProperty('--vipo-price-text', settings.priceTextColor);
    root.style.setProperty('--vipo-days-left', settings.daysLeftColor);
    
    console.log('🎨 Design settings applied');
  }
  
  bindEvents() {
    // האזן ללחיצות על ערכות צבעים
    document.addEventListener('click', (e) => {
      if (e.target.closest('.preset-card')) {
        const presetCard = e.target.closest('.preset-card');
        const presetName = presetCard.getAttribute('data-preset');
        if (this.presets[presetName]) {
          this.saveSettings(this.presets[presetName]);
          this.showMessage(`נשמרה ערכת ${presetName}!`);
        }
      }
    });
    
    // האזן לשמירת טופס עיצוב
    const designForm = document.getElementById('designForm');
    if (designForm) {
      designForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(designForm);
        const settings = {};
        
        // אסוף נתונים מהטופס
        for (const [key, value] of formData.entries()) {
          if (key.startsWith('ds_')) {
            const settingKey = key.replace('ds_', '');
            settings[settingKey] = value;
          }
        }
        
        this.saveSettings(settings);
        this.showMessage('הגדרות העיצוב נשמרו בהצלחה!');
      });
    }
  }
  
  showMessage(text) {
    const msgEl = document.getElementById('designSaveMsg');
    if (msgEl) {
      msgEl.textContent = text;
      msgEl.style.color = '#16a34a';
      setTimeout(() => {
        msgEl.textContent = '';
      }, 3000);
    } else {
      console.log(text);
    }
  }
}

// אתחול המערכת
if (typeof window !== 'undefined') {
  window.designManager = new DesignManager();
}

export default DesignManager;
