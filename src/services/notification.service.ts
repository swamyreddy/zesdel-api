import axios from 'axios';
import { logger } from '../utils/logger';

/**
 * FCM Push Notifications via Firebase HTTP v1 API
 *
 * Setup:
 * 1. Firebase Console → Project Settings → Service Accounts
 * 2. Generate new private key → download JSON
 * 3. Add to .env:
 *    FIREBASE_PROJECT_ID=your_project_id
 *    FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@xxx.iam.gserviceaccount.com
 *    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 */

// ── Get OAuth2 access token for FCM v1 API ────────────────────────────────────
async function getAccessToken(): Promise<string> {
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const client = await auth.getClient();
  const token  = await client.getAccessToken();
  return token.token!;
}

// ── Send notification to a single device ─────────────────────────────────────
export async function sendPushNotification({
  fcmToken,
  title,
  body,
  data = {},
}: {
  fcmToken: string;
  title:    string;
  body:     string;
  data?:    Record<string, string>;
}): Promise<void> {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    logger.info(`[DEV] Push: ${title} — ${body}`);
    return;
  }
  try {
    const accessToken = await getAccessToken();
    await axios.post(
      `https://fcm.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/messages:send`,
      {
        message: {
          token:        fcmToken,
          notification: { title, body },
          data,
          webpush: {
            notification: { title, body, icon: '/icons/Icon-192.png' },
          },
        },
      },
      {
        headers: {
          Authorization:  `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    logger.info(`Push sent: ${title}`);
  } catch (err: any) {
    logger.error(`Push failed: ${err.response?.data?.error?.message || err.message}`);
    // Don't throw — notifications are non-critical
  }
}

// ── Send to multiple tokens ───────────────────────────────────────────────────
export async function sendPushToMany({
  fcmTokens,
  title,
  body,
  data = {},
}: {
  fcmTokens: string[];
  title:     string;
  body:      string;
  data?:     Record<string, string>;
}): Promise<void> {
  await Promise.all(
    fcmTokens.map(token => sendPushNotification({ fcmToken: token, title, body, data }))
  );
}
