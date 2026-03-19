import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import {
  sendWhatsAppOTPHandler,
  verifyLoginOTP,
  verifyRegisterOTP,
  verifyForgotPasswordOTP,
} from '../controllers/whatsapp-auth.controller';

const router = Router();

const phoneRule = body('phone')
  .trim()
  .notEmpty().withMessage('Phone number is required')
  .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number');

const otpRule = body('otp')
  .trim()
  .notEmpty().withMessage('OTP is required')
  .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
  .isNumeric().withMessage('OTP must contain only digits');

// ── POST /api/auth/whatsapp/send-otp ────────────────────────────────────────
router.post('/send-otp',
  [
    phoneRule,
    body('purpose')
      .isIn(['login', 'register', 'forgot_password'])
      .withMessage('Purpose must be login, register or forgot_password'),
  ],
  validate,
  sendWhatsAppOTPHandler
);

// ── POST /api/auth/whatsapp/verify-login ────────────────────────────────────
router.post('/verify-login',
  [phoneRule, otpRule],
  validate,
  verifyLoginOTP
);

// ── POST /api/auth/whatsapp/verify-register ─────────────────────────────────
router.post('/verify-register',
  [
    phoneRule,
    otpRule,
    body('name').trim().notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  ],
  validate,
  verifyRegisterOTP
);

// ── POST /api/auth/whatsapp/verify-forgot-password ──────────────────────────
router.post('/verify-forgot-password',
  [phoneRule, otpRule],
  validate,
  verifyForgotPasswordOTP
);

export default router;
