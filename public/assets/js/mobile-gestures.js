// Mobile Gestures and Touch Support
// Enhanced touch interactions for Android and iOS

class MobileGestures {
  constructor() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
    this.minSwipeDistance = 50;
    this.maxSwipeTime = 300;
    this.swipeStartTime = 0;
    
    this.init();
  }

  init() {
    // Add touch event listeners
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    
    // Add visual feedback for touch interactions
    this.addTouchFeedback();
    
    // Handle device orientation changes
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this));
    
    // Prevent zoom on double tap for specific elements
    this.preventDoubleTabZoom();
    
    // Add pull-to-refresh functionality
    this.addPullToRefresh();
  }

  handleTouchStart(event) {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
    this.swipeStartTime = Date.now();
  }

  handleTouchEnd(event) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
    
    const swipeTime = Date.now() - this.swipeStartTime;
    
    if (swipeTime <= this.maxSwipeTime) {
      this.handleSwipe();
    }
  }

  handleSwipe() {
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    
    // Check if it's a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.minSwipeDistance) {
      if (deltaX > 0) {
        this.onSwipeRight();
      } else {
        this.onSwipeLeft();
      }
    }
    
    // Check if it's a vertical swipe
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > this.minSwipeDistance) {
      if (deltaY > 0) {
        this.onSwipeDown();
      } else {
        this.onSwipeUp();
      }
    }
  }

  onSwipeRight() {
    // Navigate back or to previous image
    const backBtn = document.getElementById('btnBack');
    if (backBtn && window.location.pathname.includes('/product/')) {
      backBtn.click();
    }
  }

  onSwipeLeft() {
    // Navigate forward or to next image
    const thumbnails = document.querySelectorAll('.thumbnail');
    if (thumbnails.length > 0) {
      const activeThumbnail = document.querySelector('.thumbnail.active');
      if (activeThumbnail) {
        const nextThumbnail = activeThumbnail.nextElementSibling || thumbnails[0];
        nextThumbnail.click();
      }
    }
  }

  onSwipeUp() {
    // Scroll to next section or close modal
    const modal = document.querySelector('.modal-overlay.show');
    if (modal) {
      const closeBtn = modal.querySelector('#btnCloseJoin');
      if (closeBtn) closeBtn.click();
    }
  }

  onSwipeDown() {
    // Pull to refresh or open modal
    // Handled by pull-to-refresh functionality
  }

  addTouchFeedback() {
    // Add haptic feedback for supported devices
    const touchElements = document.querySelectorAll('.join-btn, .details-btn, .thumbnail, .back-btn');
    
    touchElements.forEach(element => {
      element.addEventListener('touchstart', () => {
        // Add visual feedback
        element.style.transform = 'scale(0.95)';
        element.style.transition = 'transform 0.1s ease';
        
        // Add haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(10); // Short vibration
        }
      }, { passive: true });
      
      element.addEventListener('touchend', () => {
        // Remove visual feedback
        setTimeout(() => {
          element.style.transform = '';
        }, 100);
      }, { passive: true });
    });
  }

  handleOrientationChange() {
    // Adjust layout after orientation change
    setTimeout(() => {
      // Recalculate dimensions
      const productHeader = document.querySelector('.product-header');
      if (productHeader) {
        productHeader.style.minHeight = 'auto';
      }
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  preventDoubleTabZoom() {
    // Prevent zoom on double tap for specific elements
    const preventZoomElements = document.querySelectorAll('.join-btn, .details-btn, .thumbnail');
    
    preventZoomElements.forEach(element => {
      let lastTouchEnd = 0;
      
      element.addEventListener('touchend', (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    });
  }

  addPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let pullDistance = 0;
    const threshold = 100;
    let isPulling = false;
    
    const refreshIndicator = this.createRefreshIndicator();
    
    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
      if (!isPulling) return;
      
      currentY = e.touches[0].clientY;
      pullDistance = currentY - startY;
      
      if (pullDistance > 0 && window.scrollY === 0) {
        e.preventDefault();
        
        // Show refresh indicator
        refreshIndicator.style.transform = `translateY(${Math.min(pullDistance / 2, threshold)}px)`;
        refreshIndicator.style.opacity = Math.min(pullDistance / threshold, 1);
        
        if (pullDistance > threshold) {
          refreshIndicator.classList.add('ready');
        } else {
          refreshIndicator.classList.remove('ready');
        }
      }
    });
    
    document.addEventListener('touchend', () => {
      if (isPulling && pullDistance > threshold) {
        // Trigger refresh
        this.refreshPage();
      }
      
      // Reset
      refreshIndicator.style.transform = '';
      refreshIndicator.style.opacity = '';
      refreshIndicator.classList.remove('ready');
      isPulling = false;
      pullDistance = 0;
    }, { passive: true });
  }

  createRefreshIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'pull-refresh-indicator';
    indicator.innerHTML = '<i class="fas fa-sync-alt"></i>';
    indicator.style.cssText = `
      position: fixed;
      top: -50px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      background: var(--vipo-join-bg, #667eea);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
      z-index: 1000;
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(indicator);
    return indicator;
  }

  refreshPage() {
    // Add refresh animation
    const indicator = document.querySelector('.pull-refresh-indicator');
    if (indicator) {
      indicator.querySelector('i').style.animation = 'spin 1s linear infinite';
    }
    
    // Refresh the page content
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}

// Initialize mobile gestures when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize on touch devices
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    new MobileGestures();
  }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .pull-refresh-indicator.ready {
    background: var(--vipo-success-bg, #10b981) !important;
  }
  
  /* Smooth scrolling for mobile */
  html {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Prevent text selection on touch */
  .join-btn, .details-btn, .thumbnail {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
  }
`;
document.head.appendChild(style);
