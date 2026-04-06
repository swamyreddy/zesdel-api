import { Request, Response } from 'express';
import { User } from '../models/User';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

// ── POST /api/users/fcm-token ─────────────────────────────────────────────────
export const saveFcmToken = asyncHandler(async (req: Request, res: Response) => {
  const { fcmToken, platform } = req.body as {
    fcmToken: string;
    platform: string;
  };

  if (!fcmToken) return sendSuccess(res, null, 'No token provided');

  // Add token if not already saved (avoid duplicates)
  await User.findByIdAndUpdate(req.user!._id, {
    $addToSet: { fcmTokens: fcmToken },
  });

  return sendSuccess(res, null, 'Token saved');
});

// ── DELETE /api/users/fcm-token ───────────────────────────────────────────────
export const removeFcmToken = asyncHandler(async (req: Request, res: Response) => {
  const { fcmToken } = req.body as { fcmToken: string };

  await User.findByIdAndUpdate(req.user!._id, {
    $pull: { fcmTokens: fcmToken },
  });

  return sendSuccess(res, null, 'Token removed');
});
