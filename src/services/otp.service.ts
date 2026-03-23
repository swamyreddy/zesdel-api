import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

/** Generate a 6-digit OTP */
export const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const hashOTP = async (otp: string): Promise<string> =>
  bcrypt.hash(otp, 10);

export const verifyOTP = async (plain: string, hash: string): Promise<boolean> =>
  bcrypt.compare(plain, hash);

/**
 * Send OTP via SMS — stub for now.
 * Replace with MSG91 / Fast2SMS / AWS SNS in production.
 */
export const sendOTP = async (phone: string, otp: string): Promise<void> => {
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV] OTP for ${phone}: ${otp}`);
    return;
  }
  // TODO: integrate SMS gateway
  logger.info(`OTP sent to ${phone}`);
};
