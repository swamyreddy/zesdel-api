import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { verifyFirebaseToken } from '../services/firebase.service';
import { generateAccessToken, generateRefreshToken } from '../services/token.service';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// ── POST /api/auth/firebase/verify ────────────────────────────────────────────
// Flutter sends Firebase ID token → we verify → return our own JWT tokens
export const firebaseVerify = asyncHandler(async (req: Request, res: Response) => {
  const { idToken, name } = req.body as {
    idToken: string;
    name?:   string;
  };

  if (!idToken) throw new AppError('Firebase ID token is required', 400);

  // Verify token with Google
  const { phone, uid } = await verifyFirebaseToken(idToken);

  // Find or create user
  let user = await User.findOne({ phone });

  if (!user) {
    // New user — name is required
    // Return 404 so Flutter knows to show the name field
    if (!name || name.trim().length < 2) {
      throw new AppError('Please provide your name to complete registration', 404);
    }
    // Create user with a dummy password hash (Firebase users don't need passwords)
    const dummyHash = await bcrypt.hash(uid + Math.random().toString(36), 12);
    user = await User.create({
      name:         name.trim(),
      phone,
      passwordHash: dummyHash,
      role:         'customer',
    });
  } else if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Contact support.', 403);
  }

  // Issue our JWT tokens
  const accessToken  = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: refreshToken },
  });

  const userObj = await User.findById(user._id);
  return sendSuccess(res, { user: userObj, accessToken, refreshToken },
    user.createdAt === user.updatedAt ? 'Registration successful' : 'Login successful');
});
