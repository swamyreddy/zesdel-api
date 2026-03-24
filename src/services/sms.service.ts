import { logger } from '../utils/logger';
import axios from 'axios';

/**
 * SMS OTP via Fast2SMS (no DLT needed for testing)
 *
 * Setup:
 * 1. Sign up at https://fast2sms.com
 * 2. Go to Dev API → API Authorization → copy your API key
 * 3. Recharge minimum ₹50 to activate
 * 4. Add to .env: FAST2SMS_API_KEY=your_key
 */

export const sendSmsOTP = async (phone: string, otp: string): Promise<void> => {

  // Dev mode — just log OTP to console
  if (!process.env.FAST2SMS_API_KEY) {
    logger.info(`[DEV] SMS OTP for +91${phone}: ${otp}`);
    return;
  }

  try {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route:            'otp',
        variables_values: otp,
        numbers:          phone,
        flash:            0,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY!,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (response.data?.return === true) {
      logger.info(`SMS OTP sent to +91${phone} via Fast2SMS`);
    } else {
      logger.error(`Fast2SMS error: ${JSON.stringify(response.data)}`);
      throw new Error(response.data?.message?.[0] || 'Fast2SMS failed');
    }
  } catch (err: any) {
    logger.error(`SMS OTP failed for +91${phone}: ${err.message}`);
    throw err;
  }
};
