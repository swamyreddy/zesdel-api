import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { OTP } from '../models/OTP';
import { generateAccessToken, generateRefreshToken } from '../services/token.service';
import { generateOTP } from '../services/otp.service';
import { sendWhatsAppOTP } from '../services/whatsapp.service';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

const OTP_EXPIRY_MS  = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS   = 5;

// ── Helper: issue tokens and return user ────────────────────────────────────
async function issueTokens(userId: mongoose.Types.ObjectId | string, role: string, res: Response, message: string) {
  const accessToken  = generateAccessToken(userId as any, role);
  const refreshToken = generateRefreshToken(userId as any);
  await User.findByIdAndUpdate(userId, { $push: { refreshTokens: refreshToken } });
  const user = await User.findById(userId);
  return sendSuccess(res, { user, accessToken, refreshToken }, message);
}

// Bring in mongoose for ObjectId type
import mongoose from 'mongoose';

// ── POST /api/auth/whatsapp/send-otp ────────────────────────────────────────
// Sends a WhatsApp OTP. Works for both login and register.
// If purpose=register and phone exists → error.
// If purpose=login and phone not found → error.
export const sendWhatsAppOTPHandler = asyncHandler(async (req: Request, res: Response) => {
  const { phone, purpose } = req.body as { phone: string; purpose: 'login' | 'register' | 'forgot_password' };

  // Rate limit: max 3 OTPs per phone per 10 minutes
  const recentCount = await OTP.countDocuments({
    phone,
    purpose,
    expiresAt: { $gt: new Date() },
  });
  if (recentCount >= 3) {
    return sendError(res, 'Too many OTP requests. Please wait 10 minutes.', 429);
  }

  if (purpose === 'register') {
    const exists = await User.findOne({ phone });
    if (exists) throw new AppError('Phone number already registered. Please sign in.', 409);
  }

  if (purpose === 'login') {
    const user = await User.findOne({ phone, isActive: true });
    if (!user) throw new AppError('Phone number not registered. Please sign up.', 404);
  }

  // Generate and hash OTP
  const otp     = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);

  // Delete any existing OTP for this phone+purpose
  await OTP.deleteMany({ phone, purpose });

  // Save new OTP
  await OTP.create({
    phone,
    otpHash,
    purpose,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  // Send via WhatsApp
  await sendWhatsAppOTP(phone, otp);

  return sendSuccess(res, null, 'OTP sent to your WhatsApp number');
});

// ── POST /api/auth/whatsapp/verify-login ────────────────────────────────────
// Verify OTP → log user in → return tokens
export const verifyLoginOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body as { phone: string; otp: string };

  const otpDoc = await OTP.findOne({ phone, purpose: 'login' });
  if (!otpDoc) throw new AppError('OTP not found or expired. Request a new one.', 400);

  if (otpDoc.expiresAt < new Date()) {
    await otpDoc.deleteOne();
    throw new AppError('OTP expired. Request a new one.', 400);
  }

  if (otpDoc.attempts >= MAX_ATTEMPTS) {
    await otpDoc.deleteOne();
    throw new AppError('Too many incorrect attempts. Request a new OTP.', 400);
  }

  const valid = await bcrypt.compare(otp, otpDoc.otpHash);
  if (!valid) {
    await OTP.findByIdAndUpdate(otpDoc._id, { $inc: { attempts: 1 } });
    const remaining = MAX_ATTEMPTS - otpDoc.attempts - 1;
    throw new AppError(`Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`, 400);
  }

  // Mark used and delete
  await otpDoc.deleteOne();

  const user = await User.findOne({ phone, isActive: true });
  if (!user) throw new AppError('Account not found or deactivated.', 404);

  return issueTokens(user._id, user.role, res, 'Login successful');
});

// ── POST /api/auth/whatsapp/verify-register ─────────────────────────────────
// Verify OTP → create user → return tokens
export const verifyRegisterOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp, name } = req.body as { phone: string; otp: string; name: string };

  if (!name || name.trim().length < 2) {
    throw new AppError('Full name is required (min 2 characters).', 400);
  }

  const otpDoc = await OTP.findOne({ phone, purpose: 'register' });
  if (!otpDoc) throw new AppError('OTP not found or expired. Request a new one.', 400);

  if (otpDoc.expiresAt < new Date()) {
    await otpDoc.deleteOne();
    throw new AppError('OTP expired. Request a new one.', 400);
  }

  if (otpDoc.attempts >= MAX_ATTEMPTS) {
    await otpDoc.deleteOne();
    throw new AppError('Too many incorrect attempts. Request a new OTP.', 400);
  }

  const valid = await bcrypt.compare(otp, otpDoc.otpHash);
  if (!valid) {
    await OTP.findByIdAndUpdate(otpDoc._id, { $inc: { attempts: 1 } });
    const remaining = MAX_ATTEMPTS - otpDoc.attempts - 1;
    throw new AppError(`Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`, 400);
  }

  // Check phone not taken (race condition guard)
  const existing = await User.findOne({ phone });
  if (existing) throw new AppError('Phone number already registered.', 409);

  // Delete OTP
  await otpDoc.deleteOne();

  // Create user — no password needed for WhatsApp login users
  // Use a random hash so the required field is satisfied
  const dummyHash = await bcrypt.hash(Math.random().toString(36), 12);
  const user = await User.create({
    name: name.trim(),
    phone,
    passwordHash: dummyHash,
    role: 'customer',
  });

  return issueTokens(user._id, user.role, res, 'Registration successful');
});

// ── POST /api/auth/whatsapp/verify-forgot-password ──────────────────────────
// Same as existing forgot-password flow but via WhatsApp OTP
export const verifyForgotPasswordOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body as { phone: string; otp: string };

  const otpDoc = await OTP.findOne({ phone, purpose: 'forgot_password' });
  if (!otpDoc) throw new AppError('OTP not found or expired. Request a new one.', 400);

  if (otpDoc.expiresAt < new Date()) {
    await otpDoc.deleteOne();
    throw new AppError('OTP expired. Request a new one.', 400);
  }

  if (otpDoc.attempts >= MAX_ATTEMPTS) {
    await otpDoc.deleteOne();
    throw new AppError('Too many incorrect attempts. Request a new OTP.', 400);
  }

  const valid = await bcrypt.compare(otp, otpDoc.otpHash);
  if (!valid) {
    await OTP.findByIdAndUpdate(otpDoc._id, { $inc: { attempts: 1 } });
    const remaining = MAX_ATTEMPTS - otpDoc.attempts - 1;
    throw new AppError(`Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`, 400);
  }

  await otpDoc.deleteOne();

  // Issue a short-lived reset token
  const user = await User.findOne({ phone });
  if (!user) throw new AppError('User not found.', 404);

  const resetToken = generateAccessToken(user._id, 'reset');
  return sendSuccess(res, { resetToken }, 'OTP verified. You may now reset your password.');
});
