import { logger } from '../utils/logger';

/**
 * SMS OTP via Zavu
 *
 * Setup:
 * 1. Sign up at https://dashboard.zavu.dev
 * 2. Get your API key from Dashboard → Settings → API Keys
 * 3. Add to .env: ZAVU_API_KEY=your_api_key
 */

let zavuClient: any = null;

function getClient() {
  if (!zavuClient) {
    const Zavu = require('@zavudev/sdk').default;
    zavuClient = new Zavu({ apiKey: process.env.ZAVU_API_KEY! });
  }
  return zavuClient;
}

export const sendSmsOTP = async (phone: string, otp: string): Promise<void> => {

  // Dev mode — just log
  if (!process.env.ZAVU_API_KEY) {
    logger.info(`[DEV] OTP for +91${phone}: ${otp}`);
    return;
  }

  try {
    const zavu = getClient();

    const message = await zavu.messages.send({
      to:      `+91${phone}`,
      channel: 'sms',
      text:    `Your ZesDel OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`,
    });

    logger.info(`OTP sent to +91${phone} via Zavu SMS — ID: ${message.id}`);
  } catch (err: any) {
    logger.error(`Zavu OTP failed for +91${phone}: ${err.message}`);
    throw new Error('Failed to send OTP. Please try again.');
  }
};
