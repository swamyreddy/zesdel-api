import { logger } from '../utils/logger';
import axios from 'axios';

/**
 * SMS OTP via Zavu REST API (no SDK needed)
 *
 * Setup:
 * 1. Sign up at https://dashboard.zavu.dev
 * 2. Settings → API Keys → copy your key
 * 3. Add to .env: ZAVU_API_KEY=your_api_key
 */

export const sendSmsOTP = async (phone: string, otp: string): Promise<void> => {

  if (!process.env.ZAVU_API_KEY) {
    logger.info(`[DEV] OTP for +91${phone}: ${otp}`);
    return;
  }

  try {
    const response = await axios.post(
      'https://api.zavu.dev/v1/messages',
      {
        to:      `+91${phone}`,
        channel: 'sms',
        text:    `Your ZesDel OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.ZAVU_API_KEY}`,
          'Content-Type':  'application/json',
        },
        timeout: 10000,
      }
    );

    logger.info(`OTP sent to +91${phone} via Zavu — ID: ${response.data?.id || response.data?.message?.id}`);
  } catch (err: any) {
    if (err.response) {
      logger.error(`Zavu ${err.response.status}: ${JSON.stringify(err.response.data)}`);
      throw new Error('Failed to send OTP. Please try again.');
    }
    logger.error(`Zavu OTP failed for +91${phone}: ${err.message}`);
    throw new Error('Failed to send OTP. Please try again.');
  }
};
