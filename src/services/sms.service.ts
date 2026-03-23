import { logger } from '../utils/logger';
import axios from 'axios';

/**
 * SMS OTP delivery via MSG91.
 *
 * Setup:
 * 1. Sign up at https://msg91.com
 * 2. Go to SMS → Templates → Create a template (must be DLT approved)
 *    Template example: "Your ZesDel OTP is ##OTP##. Valid for 10 minutes. - ZesDel"
 * 3. Note your Auth Key, Template ID, and Sender ID
 * 4. Add to .env: MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, MSG91_SENDER_ID
 */

export const sendSmsOTP = async (phone: string, otp: string): Promise<void> => {
  // Dev mode — just log the OTP
  if (process.env.NODE_ENV !== 'production' || !process.env.MSG91_AUTH_KEY) {
    logger.info(`[DEV] SMS OTP for +91${phone}: ${otp}`);
    return;
  }

  const authKey    = process.env.MSG91_AUTH_KEY!;
  const templateId = process.env.MSG91_TEMPLATE_ID!;
  const senderId   = process.env.MSG91_SENDER_ID || 'ZESDEL';

  try {
    // MSG91 Send OTP API
    const response = await axios.post(
      'https://control.msg91.com/api/v5/otp',
      {
        template_id: templateId,
        mobile:      `91${phone}`,
        authkey:     authKey,
        otp:         otp,
        sender:      senderId,
        otp_expiry:  10,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    if (response.data?.type === 'success') {
      logger.info(`SMS OTP sent to +91${phone}`);
    } else {
      logger.error(`MSG91 error for +91${phone}: ${JSON.stringify(response.data)}`);
      throw new Error(`MSG91 failed: ${response.data?.message || 'Unknown error'}`);
    }
  } catch (err: any) {
    logger.error(`SMS OTP failed for +91${phone}: ${err.message}`);
    throw err;
  }
};
