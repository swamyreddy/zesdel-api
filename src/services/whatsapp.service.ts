import { logger } from '../utils/logger';

/**
 * WhatsApp OTP delivery via Twilio WhatsApp API.
 *
 * Setup steps:
 * 1. Sign up at https://www.twilio.com
 * 2. Go to Messaging → Try it out → Send a WhatsApp message
 * 3. Join the sandbox by sending "join <your-word>" to +1 415 523 8886
 * 4. Copy your Account SID, Auth Token, and sandbox number to .env
 *
 * For production: apply for a WhatsApp Business Account through Twilio.
 */

let twilioClient: any = null;

function getClient() {
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in .env');
    }
    // Lazy require so missing env vars don't crash at startup
    const Twilio = require('twilio');
    twilioClient = new Twilio(accountSid, authToken);
  }
  return twilioClient;
}

export const sendWhatsAppOTP = async (phone: string, otp: string): Promise<void> => {
  // In dev mode just log — no Twilio needed
  if (process.env.NODE_ENV !== 'production' && !process.env.TWILIO_ACCOUNT_SID) {
    logger.info(`[DEV] WhatsApp OTP for +91${phone}: ${otp}`);
    return;
  }

  const from = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'}`;
  const to   = `whatsapp:+91${phone}`;

  const message =
    `🛒 *ZesDel* — Your verification code is:\n\n` +
    `*${otp}*\n\n` +
    `Valid for 10 minutes. Do not share this with anyone.\n` +
    `— ZesDel Team ⚡`;

  try {
    const client = getClient();
    const result = await client.messages.create({ from, to, body: message });
    logger.info(`WhatsApp OTP sent to +91${phone} — SID: ${result.sid}`);
  } catch (err: any) {
    logger.error(`WhatsApp OTP failed for +91${phone}: ${err.message}`);
    throw err;
  }
};
