import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * Verify Firebase ID token using Google's public API.
 * No Firebase Admin SDK needed — uses the REST API.
 */
export const verifyFirebaseToken = async (idToken: string): Promise<{
  phone: string;
  uid:   string;
}> => {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_WEB_API_KEY not set in .env');

  try {
    const res = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      { idToken },
      { timeout: 10000 }
    );

    const user = res.data?.users?.[0];
    if (!user) throw new Error('Firebase token invalid');

    const phone = user.phoneNumber?.replace('+91', '').trim();
    if (!phone) throw new Error('No phone number in Firebase token');

    return { phone, uid: user.localId };
  } catch (err: any) {
    logger.error(`Firebase token verify failed: ${err.message}`);
    throw new Error('Invalid or expired OTP. Please try again.');
  }
};
