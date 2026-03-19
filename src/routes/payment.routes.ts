import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  razorpayWebhook,
} from '../controllers/payment.controller';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();

// ── Create Razorpay order (authenticated) ────────────────────────────────────
router.post(
  '/create-order',
  protect,
  [
    body('amount')
      .isInt({ min: 100 })
      .withMessage('Amount must be at least 100 paise (₹1)'),
    body('currency')
      .optional()
      .equals('INR')
      .withMessage('Only INR is supported'),
  ],
  validate,
  createRazorpayOrder
);

// ── Verify payment signature (authenticated) ─────────────────────────────────
router.post(
  '/verify',
  protect,
  [
    body('razorpay_order_id').notEmpty().withMessage('razorpay_order_id is required'),
    body('razorpay_payment_id').notEmpty().withMessage('razorpay_payment_id is required'),
    body('razorpay_signature').notEmpty().withMessage('razorpay_signature is required'),
  ],
  validate,
  verifyRazorpayPayment
);

// ── Webhook (no auth — Razorpay calls this directly) ─────────────────────────
// NOTE: raw body is needed for signature validation.
// Register this URL in Razorpay Dashboard → Settings → Webhooks:
//   https://yourdomain.com/api/v1/payments/webhook
router.post('/webhook', razorpayWebhook);

export default router;
