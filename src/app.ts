import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app: Application = express();

// ── Security ─────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());   // prevent NoSQL injection

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    // In development allow all origins
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    // In production allow S3, CloudFront and local origins
    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://localhost') ||
      origin.includes('.s3-website.') ||
      origin.includes('.cloudfront.net') ||
      origin.includes('.amazonaws.com')
    ) {
      return cb(null, true);
    }
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────
app.use('/api', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min
  max:       parseInt(process.env.RATE_LIMIT_MAX || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
}));

// Stricter limit for auth endpoints
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please wait 15 minutes.' },
}));

// ── Body parsing & compression ────────────────────────────
// Razorpay webhook needs raw body for HMAC signature verification
app.use(
  '/api/v1/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req: Request, _res, next) => {
    // Parse the raw buffer back to JSON for our controller
    if (Buffer.isBuffer(req.body)) {
      req.body = JSON.parse(req.body.toString());
    }
    next();
  }
);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// ── HTTP logging ──────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: () => process.env.NODE_ENV === 'test',
}));

// ── Health check ──────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── API routes ────────────────────────────────────────────
app.use('/api/v1', routes);

// ── 404 handler ───────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────
app.use(errorHandler);

export default app;
