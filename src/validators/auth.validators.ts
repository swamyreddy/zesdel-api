import { body } from 'express-validator';

const phoneRule = body('phone')
  .trim()
  .notEmpty().withMessage('Phone number is required')
  .matches(/^[6-9]\d{9}$/).withMessage('Enter a valid 10-digit Indian mobile number');

const passwordRule = (field = 'password') =>
  body(field)
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters');

const otpRule = body('otp')
  .trim()
  .notEmpty().withMessage('OTP is required')
  .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
  .isNumeric().withMessage('OTP must contain only digits');

export const registerValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  phoneRule,
  passwordRule(),
];

export const loginValidator = [phoneRule, passwordRule()];

export const sendOtpValidator = [
  phoneRule,
  body('purpose')
    .isIn(['login', 'register', 'forgot_password'])
    .withMessage('Invalid OTP purpose'),
];

export const verifyOtpValidator = [phoneRule, otpRule];

export const resetPasswordValidator = [
  phoneRule,
  otpRule,
  passwordRule('newPassword'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const refreshTokenValidator = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
];
