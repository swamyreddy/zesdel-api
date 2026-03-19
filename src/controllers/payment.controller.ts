import { Request, Response } from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { Order } from '../models/Order';
import { logger } from '../utils/logger';

// ── Lazily instantiate Razorpay so missing env vars fail at call-time, not boot ──
let _rzp: Razorpay | null = null;
function getRazorpay(): Razorpay {
  if (!_rzp) {
    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env');
    }
    _rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _rzp;
}

// ── POST /api/v1/payments/create-order ───────────────────────────────────────
// Called by Flutter before opening the Razorpay checkout sheet.
// Creates a Razorpay order and returns its id/amount to the app.
export const createRazorpayOrder = asyncHandler(async (req: Request, res: Response) => {
  const { amount, currency = 'INR', receipt } = req.body;

  if (!amount || typeof amount !== 'number' || amount < 100) {
    return sendError(res, 'Invalid amount. Must be a number in paise (min ₹1 = 100 paise).', 400);
  }

  const rzp = getRazorpay();

  const order = await rzp.orders.create({
    amount:   Math.round(amount),   // paise, must be integer
    currency,
    receipt:  receipt || `zesdel_${Date.now()}`,
    notes: {
      userId: req.user!._id.toString(),
      source: 'zesdel_app',
    },
  });

  logger.info(`Razorpay order created: ${order.id} for ₹${amount / 100}`);

  return sendSuccess(res, { order }, 'Razorpay order created');
});

// ── POST /api/v1/payments/verify ─────────────────────────────────────────────
// Called after payment succeeds to verify the HMAC signature.
// This is the security step — without it anyone could fake a payment.
export const verifyRazorpayPayment = asyncHandler(async (req: Request, res: Response) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderId,              // our internal MongoDB order _id (optional — update if provided)
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return sendError(res, 'Missing payment verification fields.', 400);
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return sendError(res, 'Payment configuration error.', 500);

  // ── HMAC-SHA256 signature check ───────────────────────────────────────────
  // Razorpay signs: razorpay_order_id + "|" + razorpay_payment_id
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    logger.warn(`Payment signature mismatch for order ${razorpay_order_id}`);
    return sendError(res, 'Payment verification failed. Invalid signature.', 400);
  }

  logger.info(`Payment verified: ${razorpay_payment_id} for Razorpay order ${razorpay_order_id}`);

  // ── Optionally update our order record ───────────────────────────────────
  // If the client sends the internal orderId, mark it as paid.
  if (orderId) {
    await Order.findByIdAndUpdate(orderId, {
      paymentStatus:      'paid',
      razorpayOrderId:    razorpay_order_id,
      razorpayPaymentId:  razorpay_payment_id,
    });
  }

  return sendSuccess(res, {
    verified:          true,
    razorpayPaymentId: razorpay_payment_id,
    razorpayOrderId:   razorpay_order_id,
  }, 'Payment verified successfully');
});

// ── POST /api/v1/payments/webhook ────────────────────────────────────────────
// Razorpay sends events here (payment.captured, payment.failed, refund.processed…)
// Register this URL in the Razorpay dashboard → Webhooks.
// This handles cases where the app closed before verifyRazorpayPayment was called.
export const razorpayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Validate webhook signature
  if (webhookSecret) {
    const receivedSignature = req.headers['x-razorpay-signature'] as string;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (receivedSignature !== expectedSignature) {
      logger.warn('Invalid Razorpay webhook signature');
      return sendError(res, 'Invalid webhook signature', 400);
    }
  }

  const event   = req.body.event as string;
  const payload = req.body.payload;

  logger.info(`Razorpay webhook: ${event}`);

  switch (event) {
    case 'payment.captured': {
      // Payment successfully captured — mark order as paid
      const payment   = payload?.payment?.entity;
      const rzpOrderId = payment?.order_id;
      const paymentId  = payment?.id;
      if (rzpOrderId && paymentId) {
        await Order.findOneAndUpdate(
          { razorpayOrderId: rzpOrderId },
          { paymentStatus: 'paid', razorpayPaymentId: paymentId }
        );
        logger.info(`Order paid via webhook: ${rzpOrderId}`);
      }
      break;
    }

    case 'payment.failed': {
      // Payment failed — mark order payment as failed
      const payment    = payload?.payment?.entity;
      const rzpOrderId = payment?.order_id;
      if (rzpOrderId) {
        await Order.findOneAndUpdate(
          { razorpayOrderId: rzpOrderId },
          { paymentStatus: 'failed' }
        );
        logger.info(`Payment failed for order: ${rzpOrderId}`);
      }
      break;
    }

    case 'refund.processed': {
      // Refund completed — mark order as refunded
      const refund     = payload?.refund?.entity;
      const paymentId  = refund?.payment_id;
      if (paymentId) {
        await Order.findOneAndUpdate(
          { razorpayPaymentId: paymentId },
          { paymentStatus: 'refunded' }
        );
        logger.info(`Refund processed for payment: ${paymentId}`);
      }
      break;
    }

    default:
      logger.info(`Unhandled Razorpay event: ${event}`);
  }

  // Always return 200 to Razorpay or it will retry
  return res.status(200).json({ received: true });
});
