import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse';
import { HTTP_STATUS } from '../config/constants';

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max:      Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  handler: (_, res) =>
    sendError(res, 'Too many requests, please try again later.', HTTP_STATUS.TOO_MANY_REQUESTS),
});

// Strict limiter for auth routes (OTP abuse prevention)
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  keyGenerator: (req) => req.body?.phone || req.ip || 'unknown',
  handler: (_, res) =>
    sendError(
      res,
      'Too many auth attempts from this number. Try again after 1 hour.',
      HTTP_STATUS.TOO_MANY_REQUESTS
    ),
});
