import crypto from 'crypto';
import { OTP } from '../models/OTP';
import logger from './logger';

const OTP_LENGTH = Number(process.env.OTP_LENGTH) || 6;
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
const MAX_ATTEMPTS = 3;

export const generateOTP = (): string => {
  // Cryptographically secure random OTP
  const max = Math.pow(10, OTP_LENGTH);
  const otp = crypto.randomInt(Math.pow(10, OTP_LENGTH - 1), max);
  return otp.toString();
};

export const createOTP = async (
  phone: string,
  purpose: 'login' | 'register' | 'forgot_password'
): Promise<string> => {
  // Invalidate any existing OTP for same phone+purpose
  await OTP.deleteMany({ phone, purpose });

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await OTP.create({ phone, otp, purpose, expiresAt });

  // In production: send via Twilio / MSG91 / Fast2SMS
  // For development: log to console
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`📱 OTP for ${phone} [${purpose}]: ${otp}`);
  }

  return otp;
};

export const verifyOTP = async (
  phone: string,
  otp: string,
  purpose: 'login' | 'register' | 'forgot_password'
): Promise<{ valid: boolean; message: string }> => {
  const record = await OTP.findOne({ phone, purpose, usedAt: null });

  if (!record) {
    return { valid: false, message: 'OTP not found or already used. Please request a new one.' };
  }

  if (record.expiresAt < new Date()) {
    await OTP.deleteOne({ _id: record._id });
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await OTP.deleteOne({ _id: record._id });
    return { valid: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  if (record.otp !== otp) {
    await OTP.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    const remaining = MAX_ATTEMPTS - record.attempts - 1;
    return { valid: false, message: `Incorrect OTP. ${remaining} attempt(s) remaining.` };
  }

  // Mark as used
  await OTP.updateOne({ _id: record._id }, { usedAt: new Date() });
  return { valid: true, message: 'OTP verified successfully.' };
};
