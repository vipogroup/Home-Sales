# 🏪 VIPO Sales System

מערכת מכירות משולבת עם ניהול סוכנים, לוח בקרה מתקדם וחנות אונליין מקצועית.

## 🌐 צפייה באתר

**GitHub Pages:** https://vipogroup.github.io/Home-Sales/

## ✨ תכונות עיקריות

### 🛒 חנות אונליין
- עיצוב Mobile-First מקצועי 
- דפי מוצרים אינטראקטיביים עם גלריה
- מערכת תשלומים (PayPlus)
- עגלת קניות וניהול הזמנות
- מערכת הנחות וקופונים

### 👑 לוח בקרה מנהל
- ניהול מוצרים מלא (CRUD)
- ניהול סוכנים ופמיסיות
- מערכת עיצוב דינמית עם תצוגה חיה
- דשבורד עם סטטיסטיקות
- ניהול הזמנות ותשלומים

### 🤝 פאנל סוכנים
- רישום וניהול פרופיל
- מעקב קישורי שיתוף
- דשבורד מכירות אישי
- מעקב עמלות

## 🚀 הפעלה מקומית

### דרישות
- Node.js 16+
- PostgreSQL (אופציונלי - עובד גם בלי DB)

### התקנה
```bash
# שכפול הפרויקט
git clone https://github.com/vipogroup/Home-Sales.git
cd Home-Sales

# התקנת תלויות
npm install

# העתקת קובץ הגדרות
cp .env.example .env

# הפעלת השרת
npm start
```

השרת ירוץ על http://localhost:8080

### גישה מהרשת המקומית
השרת מאזין על `0.0.0.0:8080` ומדפיס את כתובת הרשת בהפעלה:
```
Network access available at: http://192.168.x.x:8080
```

## 📱 דפים עיקריים

- **חנות:** `/shop` - דף מוצרים ראשי
- **מוצר:** `/product/:id` - דף מוצר בודד
- **תשלום:** `/shop/checkout` - דף תשלום
- **הזמנות:** `/my-orders` - מעקב הזמנות
- **אדמין:** `/admin/login` - כניסה למנהל
- **סוכן:** `/agent/login` - כניסה לסוכן

## 🎨 מערכת עיצוב

המערכת כוללת מערכת עיצוב דינמית עם:
- **משתני CSS** מרכזיים
- **תצוגה חיה** בלוח הבקרה
- **נושאים** מוגדרים מראש
- **עיצוב רספונסיבי** מלא

## 🔧 מבנה הפרויקט

```
├── public/              # קבצים סטטיים
│   ├── shop/           # דפי חנות
│   ├── admin/          # לוח בקרה
│   ├── agent/          # פאנל סוכנים
│   └── assets/         # CSS, JS, תמונות
├── src/                # קוד שרת
│   ├── routes/         # API routes
│   ├── middleware/     # Middleware
│   ├── db/            # חיבור DB
│   └── server.js      # שרת ראשי
└── package.json
```

## 🔒 אבטחה

- **Helmet.js** - הגנות HTTP headers
- **CORS** מוגדר
- **Rate Limiting** על API
- **JWT** לאימות
- **Input Validation** מלא

## 📦 טכנולוגיות

**Backend:**
- Node.js + Express.js
- PostgreSQL
- JWT Authentication
- PayPlus Integration

**Frontend:**
- Vanilla JavaScript (ES6+)
- CSS Grid/Flexbox
- Mobile-First Design
- Progressive Web App

## 🌟 תכונות מתקדמות

- **Image Lightbox** עם ניווט מקלדת
- **Sticky Buy Button** 
- **Toast Notifications**
- **Loading States** חכמים
- **Error Handling** מלא
- **SEO Optimization**

## 📄 רישיון

MIT License

## 🤝 תרומה

מוזמנים לפתוח Issues או Pull Requests

---

**VIPO Group** © 2024
