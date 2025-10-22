import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

export function applySecurityMiddleware(app) {
  const payplusOrigin = process.env.PAYPLUS_ORIGIN;
  const scriptSrc = ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'];
  const styleSrc = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'];
  const imgSrc = ["'self'", 'data:', 'https:', 'https://images.unsplash.com'];
  const fontSrc = ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'];
  const connectSrc = ["'self'", 'https:'];
  const frameSrc = ["'self'", 'https:', 'https://www.youtube.com'];
  
  if (payplusOrigin) {
    try {
      scriptSrc.push(payplusOrigin);
      connectSrc.push(payplusOrigin);
      frameSrc.push(payplusOrigin);
    } catch {}
  }

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc,
        styleSrc,
        imgSrc,
        fontSrc,
        connectSrc,
        frameSrc,
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'https:'],
        manifestSrc: ["'self'"],
        workerSrc: ["'self'"],
        childSrc: ["'self'", 'https:'],
        formAction: ["'self'"],
        upgradeInsecureRequests: []
      }
    }
  }));

  const allowed = [
    'http://localhost:11000',
    'http://127.0.0.1:11000',
    'http://localhost:10000',
    'http://127.0.0.1:10000'
  ];

  app.use(cors({
    origin: function (origin, cb) {
      if (!origin) return cb(null, true); // allow non-browser tools
      if (allowed.includes(origin)) return cb(null, true);
      // Dev-friendly: allow others; tighten in production
      return cb(null, true);
    },
    credentials: true
  }));

  const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
  app.use('/api', apiLimiter);
}
