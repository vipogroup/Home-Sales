// Product Page Enhancements - International Standard Mobile-First
// Advanced UX features for modern e-commerce

class ProductEnhancements {
  constructor() {
    this.currentImageIndex = 0;
    this.images = [];
    this.init();
  }

  init() {
    this.initStickyBuyButton();
    this.initImageLightbox();
    this.initFAB();
    this.initProgressAnimation();
    this.initTabs();
    this.initRelatedProducts();
  }

  // Sticky Buy Button - appears when scrolling
  initStickyBuyButton() {
    const stickyBar = document.createElement('div');
    stickyBar.className = 'sticky-buy-bar';
    stickyBar.innerHTML = `
      <div class="sticky-buy-info">
        <div class="product-name" id="stickyProductName">טוען...</div>
        <div class="product-price" id="stickyProductPrice">₪0</div>
      </div>
      <button class="sticky-buy-btn" id="stickyBuyBtn">
        <i class="fas fa-shopping-cart"></i> הצטרף עכשיו
      </button>
    `;
    document.body.appendChild(stickyBar);

    // Show/hide based on scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const scrolled = window.pageYOffset;
      const mainBuyButton = document.querySelector('.join-btn');
      
      if (mainBuyButton) {
        const buttonPosition = mainBuyButton.getBoundingClientRect();
        
        // Show sticky button when main button is out of view
        if (buttonPosition.bottom < 0 && scrolled > lastScroll) {
          stickyBar.classList.add('visible');
        } else {
          stickyBar.classList.remove('visible');
        }
      }
      
      lastScroll = scrolled;
    });

    // Update sticky button with product info
    this.updateStickyButton();
  }

  updateStickyButton() {
    setTimeout(() => {
      const productName = document.querySelector('.product-title')?.textContent;
      const productPrice = document.querySelector('.current-price')?.textContent;
      
      if (productName && productPrice) {
        document.getElementById('stickyProductName').textContent = productName;
        document.getElementById('stickyProductPrice').textContent = productPrice;
      }

      // Connect sticky button to main join button
      document.getElementById('stickyBuyBtn')?.addEventListener('click', () => {
        const mainBtn = document.getElementById('btnOpenJoin') || document.querySelector('.join-btn');
        if (mainBtn) {
          mainBtn.click();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }, 1000);
  }

  // Image Gallery with Lightbox
  initImageLightbox() {
    const gallery = document.querySelector('.image-gallery');
    if (!gallery) return;

    // Add zoom icon
    const zoomIcon = document.createElement('div');
    zoomIcon.className = 'zoom-icon';
    zoomIcon.innerHTML = '<i class="fas fa-search-plus"></i>';
    gallery.appendChild(zoomIcon);

    // Create lightbox
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-modal';
    lightbox.innerHTML = `
      <div class="lightbox-content">
        <button class="lightbox-close">
          <i class="fas fa-times"></i>
        </button>
        <button class="lightbox-nav lightbox-prev">
          <i class="fas fa-chevron-right"></i>
        </button>
        <img class="lightbox-image" src="" alt="תמונת מוצר">
        <button class="lightbox-nav lightbox-next">
          <i class="fas fa-chevron-left"></i>
        </button>
      </div>
    `;
    document.body.appendChild(lightbox);

    // Collect all images
    this.images = Array.from(document.querySelectorAll('.thumbnail')).map(
      thumb => thumb.getAttribute('data-img')
    );

    // Open lightbox
    const openLightbox = (index = 0) => {
      this.currentImageIndex = index;
      this.showLightboxImage();
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    zoomIcon.addEventListener('click', () => openLightbox(0));
    gallery.addEventListener('click', (e) => {
      if (e.target.classList.contains('main-image')) {
        openLightbox(0);
      }
    });

    // Close lightbox
    lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
    });

    // Navigation
    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => {
      this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
      this.showLightboxImage();
    });

    lightbox.querySelector('.lightbox-next').addEventListener('click', () => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
      this.showLightboxImage();
    });

    // Close on background click
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      
      if (e.key === 'Escape') {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
      } else if (e.key === 'ArrowLeft') {
        this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
        this.showLightboxImage();
      } else if (e.key === 'ArrowRight') {
        this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
        this.showLightboxImage();
      }
    });
  }

  showLightboxImage() {
    const lightboxImg = document.querySelector('.lightbox-image');
    if (lightboxImg && this.images[this.currentImageIndex]) {
      lightboxImg.src = this.images[this.currentImageIndex];
    }
  }

  // Floating Action Buttons
  initFAB() {
    const fabContainer = document.createElement('div');
    fabContainer.className = 'fab-container';
    fabContainer.innerHTML = `
      <button class="fab-button wishlist" title="הוסף למועדפים" aria-label="הוסף למועדפים">
        <i class="far fa-heart"></i>
      </button>
      <button class="fab-button share" title="שתף" aria-label="שתף מוצר">
        <i class="fas fa-share-alt"></i>
      </button>
      <button class="fab-button compare" title="השווה" aria-label="השווה מוצרים">
        <i class="fas fa-balance-scale"></i>
      </button>
    `;
    document.body.appendChild(fabContainer);

    // Wishlist functionality
    const wishlistBtn = fabContainer.querySelector('.wishlist');
    wishlistBtn.addEventListener('click', () => {
      const icon = wishlistBtn.querySelector('i');
      if (icon.classList.contains('far')) {
        icon.classList.replace('far', 'fas');
        this.showToast('✅ נוסף למועדפים');
        // Add haptic feedback
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        icon.classList.replace('fas', 'far');
        this.showToast('הוסר מהמועדפים');
      }
    });

    // Share functionality
    fabContainer.querySelector('.share').addEventListener('click', () => {
      this.shareProduct();
    });

    // Compare functionality
    fabContainer.querySelector('.compare').addEventListener('click', () => {
      this.showToast('📊 נוסף להשוואה');
      if (navigator.vibrate) navigator.vibrate(50);
    });
  }

  // Enhanced Progress Bar with Animation
  initProgressAnimation() {
    const progressBars = document.querySelectorAll('.progress-fill');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const width = bar.className.match(/w-(\d+)/)?.[1] || 0;
          bar.style.width = '0%';
          
          setTimeout(() => {
            bar.style.width = `${width}%`;
          }, 100);
          
          observer.unobserve(bar);
        }
      });
    }, { threshold: 0.5 });

    progressBars.forEach(bar => observer.observe(bar));
  }

  // Customer Reviews Section
  initReviews() {
    const productInfo = document.querySelector('.product-info');
    if (!productInfo) return;

    const reviewsSection = document.createElement('div');
    reviewsSection.className = 'reviews-section';
    reviewsSection.innerHTML = `
      <div class="reviews-header">
        <div class="reviews-summary">
          <div class="overall-rating">4.8</div>
          <div>
            <div class="rating-stars">★★★★★</div>
            <div class="rating-count">מבוסס על 124 ביקורות</div>
          </div>
        </div>
        <button class="btn-secondary" onclick="alert('פתיחת טופס ביקורת')">
          <i class="fas fa-edit"></i> כתוב ביקורת
        </button>
      </div>
      <div class="reviews-list">
        ${this.generateReviews()}
      </div>
    `;

    // Add after product info
    productInfo.parentElement.insertBefore(reviewsSection, productInfo.nextSibling);
  }

  generateReviews() {
    const reviews = [
      { name: 'דוד כהן', rating: 5, text: 'מוצר מעולה! הגיע במהירות והאיכות מדהימה. בדיוק מה שחיפשתי.', date: 'לפני 3 ימים', verified: true },
      { name: 'שרה לוי', rating: 5, text: 'שירות לקוחות מצוין, המוצר בדיוק כמו בתמונה. ממליצה בחום!', date: 'לפני שבוע', verified: true },
      { name: 'יוסי מזרחי', rating: 4, text: 'מוצר טוב, יחס מחיר איכות מצוין. המשלוח היה מהיר.', date: 'לפני שבועיים', verified: true }
    ];

    return reviews.map(review => `
      <div class="review-item">
        <div class="review-header">
          <div class="reviewer-name">${review.name}</div>
          <div class="review-date">${review.date}</div>
        </div>
        <div class="review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
        <div class="review-text">${review.text}</div>
        ${review.verified ? '<div class="verified-purchase"><i class="fas fa-check-circle"></i> קנייה מאומתת</div>' : ''}
      </div>
    `).join('');
  }

  // Related Products
  initRelatedProducts() {
    const container = document.querySelector('.product-container');
    if (!container) return;

    const relatedSection = document.createElement('div');
    relatedSection.className = 'related-products';
    relatedSection.innerHTML = `
      <h2 class="section-heading">מוצרים דומים שעשויים לעניין אותך</h2>
      <div class="products-carousel">
        ${this.generateRelatedProducts()}
      </div>
    `;

    container.parentElement.appendChild(relatedSection);
  }

  generateRelatedProducts() {
    const products = [
      { id: 2, name: 'Samsung 4-Door Fridge', price: 2800, image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400' },
      { id: 3, name: 'LG 55" 4K TV', price: 2200, image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400' }
    ];

    return products.map(p => `
      <div class="related-product-card" onclick="window.location.href='/product/${p.id}'">
        <img src="${p.image}" alt="${p.name}" class="related-product-image">
        <div class="related-product-info">
          <div class="related-product-name">${p.name}</div>
          <div class="related-product-price">₪${p.price.toLocaleString()}</div>
        </div>
      </div>
    `).join('');
  }

  // Breadcrumbs Navigation
  initBreadcrumbs() {
    const container = document.querySelector('.container');
    if (!container) return;

    const breadcrumbs = document.createElement('div');
    breadcrumbs.className = 'breadcrumbs';
    breadcrumbs.innerHTML = `
      <a href="/shop/">דף הבית</a>
      <span class="separator">›</span>
      <a href="/shop/?category=electronics">מחשבים ולפטופים</a>
      <span class="separator">›</span>
      <span>מוצר נוכחי</span>
    `;

    container.insertBefore(breadcrumbs, container.firstChild);
  }

  // Share Functionality
  async shareProduct() {
    const productName = document.querySelector('.product-title')?.textContent || 'מוצר מעניין';
    const shareData = {
      title: productName,
      text: `צפה במוצר המדהים הזה: ${productName}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        this.showToast('✅ שותף בהצלחה!');
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(window.location.href);
        this.showToast('📋 הקישור הועתק ללוח');
      }
    } catch (err) {
      console.log('Error sharing:', err);
    }
  }

  // Tabs System - MOVED TO BOTTOM
  initTabs() {
    const container = document.querySelector('.product-container');
    if (!container) return;

    // Add Info Box First (Green box with shipping, warranty, delivery)
    this.addInfoBox();

    // Create tabs container AT THE BOTTOM
    const tabsHTML = `
      <div class="product-tabs-container" style="margin-top: 3rem;">
        <div class="tabs-header">
          <button class="tab-button active" data-tab="description">
            <i class="fas fa-align-right"></i>
            תיאור
          </button>
          <button class="tab-button" data-tab="specifications">
            <i class="fas fa-list"></i>
            מפרטים
          </button>
          <button class="tab-button" data-tab="reviews">
            <i class="fas fa-star"></i>
            ביקורות
          </button>
          <button class="tab-button" data-tab="faq">
            <i class="fas fa-question-circle"></i>
            שאלות נפוצות
          </button>
        </div>
        <div class="tabs-content">
          <div class="tab-panel active" id="tab-description">
            ${this.getDescriptionContent()}
          </div>
          <div class="tab-panel" id="tab-specifications">
            ${this.getSpecificationsContent()}
          </div>
          <div class="tab-panel" id="tab-reviews">
            ${this.getReviewsContent()}
          </div>
          <div class="tab-panel" id="tab-faq">
            ${this.getFAQContent()}
          </div>
        </div>
      </div>
    `;

    // Add at the bottom, before accordion
    const tabsContainer = document.createElement('div');
    tabsContainer.innerHTML = tabsHTML;
    container.parentElement.appendChild(tabsContainer);

    // Activate tabs
    this.activateTabs();
  }

  // Add Clean Info Box (like the green box in the example)
  addInfoBox() {
    const productInfo = document.querySelector('.product-info');
    if (!productInfo) return;

    const infoBoxHTML = `
      <div class="clean-info-box" style="
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        border: 2px solid #4caf50;
        border-radius: 15px;
        padding: 1.5rem;
        margin: 1.5rem 0;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        box-shadow: 0 4px 15px rgba(76, 175, 80, 0.2);
      ">
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <i class="fas fa-shipping-fast" style="font-size: 1.8rem; color: #2e7d32;"></i>
          <div>
            <div style="font-weight: 700; color: #1b5e20; font-size: 0.9rem;">משלוח מהיר</div>
            <div style="font-size: 0.85rem; color: #388e3c;">2-3 ימי עסקים</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <i class="fas fa-shield-alt" style="font-size: 1.8rem; color: #2e7d32;"></i>
          <div>
            <div style="font-weight: 700; color: #1b5e20; font-size: 0.9rem;">אחריות יצרן</div>
            <div style="font-size: 0.85rem; color: #388e3c;">3 שנים מלאות</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.8rem;">
          <i class="fas fa-undo" style="font-size: 1.8rem; color: #2e7d32;"></i>
          <div>
            <div style="font-weight: 700; color: #1b5e20; font-size: 0.9rem;">החזרה חינם</div>
            <div style="font-size: 0.85rem; color: #388e3c;">14 ימים להחזרה</div>
          </div>
        </div>
      </div>
    `;

    const infoBox = document.createElement('div');
    infoBox.innerHTML = infoBoxHTML;
    productInfo.appendChild(infoBox);
  }

  activateTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.remove('active'));

        // Add active class to clicked
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(`tab-${tabId}`).classList.add('active');
      });
    });
  }

  getDescriptionContent() {
    return `
      <h3 style="color: #2c3e50; font-size: 1.5rem; margin-bottom: 1rem;">תיאור המוצר</h3>
      <p style="line-height: 1.8; color: #34495e; margin-bottom: 1.5rem;">
        מוצר איכותי מהשורה הראשונה, מעוצב בקפידה ומיוצר מחומרים מהשורה הראשונה. 
        מתאים לשימוש יומיומי ומספק ערך מעולה תמורת המחיר.
      </p>
      <div class="features-list">
        <div class="feature-item">
          <div class="feature-icon">✅</div>
          <div class="feature-text">איכות פרימיום מובטחת</div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🚚</div>
          <div class="feature-text">משלוח מהיר לכל הארץ</div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">🔒</div>
          <div class="feature-text">תשלום מאובטח 100%</div>
        </div>
        <div class="feature-item">
          <div class="feature-icon">⭐</div>
          <div class="feature-text">שירות לקוחות מעולה</div>
        </div>
      </div>
    `;
  }

  getSpecificationsContent() {
    return `
      <h3 style="color: #2c3e50; font-size: 1.5rem; margin-bottom: 1rem;">מפרטים טכניים</h3>
      <table class="specs-table">
        <tr>
          <td>יצרן</td>
          <td>יצרן מוביל בתחום</td>
        </tr>
        <tr>
          <td>דגם</td>
          <td>דגם 2024 מעודכן</td>
        </tr>
        <tr>
          <td>משקל</td>
          <td>1.5 ק"ג</td>
        </tr>
        <tr>
          <td>מידות</td>
          <td>30 x 20 x 10 ס"מ</td>
        </tr>
        <tr>
          <td>צבעים זמינים</td>
          <td>שחור, לבן, כסוף</td>
        </tr>
        <tr>
          <td>אחריות</td>
          <td>3 שנים אחריות יצרן</td>
        </tr>
        <tr>
          <td>ארץ ייצור</td>
          <td>ייצור איכותי</td>
        </tr>
      </table>
    `;
  }

  getReviewsContent() {
    return `
      <div class="reviews-header" style="margin-bottom: 2rem;">
        <div class="reviews-summary">
          <div class="overall-rating" style="font-size: 3rem; font-weight: 900; color: #2c3e50;">4.8</div>
          <div>
            <div class="rating-stars" style="color: #f39c12; font-size: 1.5rem;">★★★★★</div>
            <div class="rating-count" style="color: #7f8c8d; font-size: 0.9rem;">מבוסס על 124 ביקורות</div>
          </div>
        </div>
      </div>
      <div class="reviews-list">
        ${this.generateReviewsHTML()}
      </div>
    `;
  }

  generateReviewsHTML() {
    const reviews = [
      { name: 'דוד כהן', rating: 5, text: 'מוצר מעולה! הגיע במהירות והאיכות מדהימה. בדיוק מה שחיפשתי.', date: 'לפני 3 ימים', verified: true },
      { name: 'שרה לוי', rating: 5, text: 'שירות לקוחות מצוין, המוצר בדיוק כמו בתמונה. ממליצה בחום!', date: 'לפני שבוע', verified: true },
      { name: 'יוסי מזרחי', rating: 4, text: 'מוצר טוב, יחס מחיר איכות מצוין. המשלוח היה מהיר.', date: 'לפני שבועיים', verified: true }
    ];

    return reviews.map(review => `
      <div class="review-item" style="padding: 1.5rem; border-bottom: 1px solid #ecf0f1;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
          <div style="font-weight: 700; color: #2c3e50;">${review.name}</div>
          <div style="color: #95a5a6; font-size: 0.85rem;">${review.date}</div>
        </div>
        <div style="color: #f39c12; margin-bottom: 0.5rem;">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
        <div style="color: #34495e; line-height: 1.6;">${review.text}</div>
        ${review.verified ? '<div style="color: #27ae60; font-size: 0.85rem; margin-top: 0.5rem;"><i class="fas fa-check-circle"></i> קנייה מאומתת</div>' : ''}
      </div>
    `).join('');
  }

  getFAQContent() {
    return `
      <h3 style="color: #2c3e50; font-size: 1.5rem; margin-bottom: 1.5rem;">שאלות נפוצות</h3>
      <div class="faq-item">
        <div class="faq-question">
          <i class="fas fa-question-circle"></i>
          האם יש אפשרות להחזיר את המוצר?
        </div>
        <div class="faq-answer">
          כן, ניתן להחזיר את המוצר תוך 14 ימים מיום הקנייה, בתנאי שהמוצר במצב חדש ובאריזה מקורית.
        </div>
      </div>
      <div class="faq-item">
        <div class="faq-question">
          <i class="fas fa-question-circle"></i>
          כמה זמן לוקח המשלוח?
        </div>
        <div class="faq-answer">
          המשלוח אורך 2-3 ימי עסקים לכל הארץ. במקרים חריגים עד 5 ימי עסקים.
        </div>
      </div>
      <div class="faq-item">
        <div class="faq-question">
          <i class="fas fa-question-circle"></i>
          האם יש תמיכה טכנית?
        </div>
        <div class="faq-answer">
          כן, אנחנו מציעים תמיכה טכנית מלאה 24/7 בעברית, דרך WhatsApp, טלפון ואימייל.
        </div>
      </div>
      <div class="faq-item">
        <div class="faq-question">
          <i class="fas fa-question-circle"></i>
          מה כלול באחריות?
        </div>
        <div class="faq-answer">
          האחריות כוללת תיקון או החלפה של המוצר במקרה של תקלה, למשך 3 שנים מיום הרכישה.
        </div>
      </div>
    `;
  }

  // Accordion System - REMOVED FROM TOP (Info is now in green box and tabs)

  activateAccordion() {
    const headers = document.querySelectorAll('.accordion-header');
    
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        const isActive = header.classList.contains('active');

        // Close all other accordions
        document.querySelectorAll('.accordion-header').forEach(h => {
          h.classList.remove('active');
          h.nextElementSibling.classList.remove('active');
        });

        // Toggle current accordion
        if (!isActive) {
          header.classList.add('active');
          content.classList.add('active');
        }
      });
    });
  }

  // Related Products
  initRelatedProducts() {
    const container = document.querySelector('.product-container');
    if (!container) return;

    const relatedSection = document.createElement('div');
    relatedSection.className = 'related-products';
    relatedSection.innerHTML = `
      <h2 style="font-size: 1.8rem; font-weight: 700; color: #2c3e50; margin-bottom: 1.5rem; text-align: center;">
        מוצרים דומים שעשויים לעניין אותך
      </h2>
      <div class="products-carousel" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
        ${this.generateRelatedProducts()}
      </div>
    `;

    container.parentElement.appendChild(relatedSection);
  }

  generateRelatedProducts() {
    const products = [
      { id: 2, name: 'Samsung 4-Door Fridge', price: 2800, image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400' },
      { id: 3, name: 'LG 55" 4K TV', price: 2200, image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400' },
      { id: 4, name: 'Apple MacBook Air', price: 4999, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400' }
    ];

    return products.map(p => `
      <div class="related-product-card" style="background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); transition: all 0.3s ease; cursor: pointer;" 
           onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)'"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.08)'"
           onclick="window.location.href='/shop/product/${p.id}'">
        <img src="${p.image}" alt="${p.name}" style="width: 100%; height: 200px; object-fit: cover;">
        <div style="padding: 1.2rem;">
          <div style="font-weight: 600; color: #2c3e50; margin-bottom: 0.5rem; font-size: 1rem;">${p.name}</div>
          <div style="font-size: 1.3rem; font-weight: 700; color: #667eea;">₪${p.price.toLocaleString()}</div>
          <button style="width: 100%; margin-top: 1rem; padding: 0.8rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;"
                  onmouseover="this.style.transform='scale(1.05)'"
                  onmouseout="this.style.transform='scale(1)'">
            צפה במוצר
          </button>
        </div>
      </div>
    `).join('');
  }

  // Toast Notification
  showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 7rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.9);
      color: white;
      padding: 1rem 2rem;
      border-radius: 50px;
      z-index: 10000;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ProductEnhancements();
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      transform: translate(-50%, 100%);
      opacity: 0;
    }
    to {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  }
  
  @keyframes slideDown {
    from {
      transform: translate(-50%, 0);
      opacity: 1;
    }
    to {
      transform: translate(-50%, 100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
