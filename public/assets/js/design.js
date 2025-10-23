// Design settings loader and applier
import { api } from './api.js';
export const defaultDesign = {
  joinBtnColor: '#667eea',
  headerBgColor: '#ffffff',
  progressBarColor: '#667eea',
  mainTitleColor: '#222222'
};

export async function loadDesignSettings(){
  try {
    const data = await api.get('/design');
    const design = data?.success && data?.data ? { ...defaultDesign, ...data.data } : (JSON.parse(localStorage.getItem('vipoDesignSettings')||'null') || defaultDesign);
    localStorage.setItem('vipoDesignSettings', JSON.stringify(design));
    applyDesignToPage(design);
    return design;
  } catch (e) {
    const design = JSON.parse(localStorage.getItem('vipoDesignSettings')||'null') || defaultDesign;
    applyDesignToPage(design);
    return design;
  }
}

export function applyDesignToPage(design){
  try {
    // If theme stylesheet is present, variables are provided externally (CSP-safe)
    const hasThemeCss = typeof document !== 'undefined' && (
      document.querySelector('link[href*="/assets/theme.css"]') ||
      document.querySelector('link[href*="assets/css/theme.css"]') ||
      document.querySelector('link[href$="theme.css"]')
    );
    if (hasThemeCss) return;

    // Fallback for environments without theme.css (may be blocked under strict CSP)
    const root = document.documentElement;
    root.style.setProperty('--vipo-primary', design.joinBtnColor || defaultDesign.joinBtnColor);
    if (design.headerBgColor) root.style.setProperty('--vipo-header-bg', design.headerBgColor);
    if (design.mainTitleColor) root.style.setProperty('--vipo-title-color', design.mainTitleColor);
    if (design.joinBtnColor) root.style.setProperty('--vipo-join-bg', design.joinBtnColor);
    const progressBg = design.progressBarColor || design.joinBtnColor || defaultDesign.progressBarColor;
    if (progressBg) root.style.setProperty('--vipo-progress-bg', progressBg);
  } catch (e) {
    console.warn('applyDesignToPage failed:', e);
  }
}

// Expose to window for non-module inline scripts
// Note: guard to avoid overwriting if already defined
if (typeof window !== 'undefined') {
  if (!window.loadDesignSettings) window.loadDesignSettings = loadDesignSettings;
  if (!window.applyDesignToPage) window.applyDesignToPage = applyDesignToPage;
}

