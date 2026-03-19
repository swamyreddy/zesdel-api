import { Request, Response } from 'express';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/token.service';
import { generateOTP, hashOTP, verifyOTP, sendOTP } from '../services/otp.service';
import { sendSuccess, sendError, sendCreated } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// POST /api/auth/register
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, password } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) throw new AppError('Phone number already registered', 409);

  const user = await User.create({ name, phone, passwordHash: password });

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

  return sendCreated(res, { user, accessToken, refreshToken }, 'Registration successful');
});

// POST /api/auth/login
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { phone, password } = req.body;

  const user = await User.findOne({ phone, isActive: true }).select('+passwordHash');
  if (!user) throw new AppError('Invalid credentials', 401);

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new AppError('Invalid credentials', 401);

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  await User.findByIdAndUpdate(user._id, { $push: { refreshTokens: refreshToken } });

  // Strip sensitive fields before returning
  const userObj = user.toJSON();
  return sendSuccess(res, { user: userObj, accessToken, refreshToken }, 'Login successful');
});

// POST /api/auth/refresh
export const refreshTokens = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400);

  let payload;
  try { payload = verifyRefreshToken(refreshToken); }
  catch { throw new AppError('Invalid refresh token', 401); }

  const user = await User.findById(payload.userId).select('+refreshTokens');
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    throw new AppError('Refresh token revoked', 401);
  }

  // Rotate tokens (refresh token rotation for security)
  const newAccess = generateAccessToken(user._id, user.role);
  const newRefresh = generateRefreshToken(user._id);

  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: refreshToken },
    $push: { refreshTokens: newRefresh },
  });

  return sendSuccess(res, { accessToken: newAccess, refreshToken: newRefresh }, 'Tokens refreshed');
});

// POST /api/auth/logout
export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await User.findByIdAndUpdate(req.user!._id, { $pull: { refreshTokens: refreshToken } });
  }
  return sendSuccess(res, null, 'Logged out successfully');
});

// POST /api/auth/forgot-password/send-otp
export const sendForgotOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  const user = await User.findOne({ phone, isActive: true });
  // Return same response whether user exists or not (prevent enumeration)
  if (user) {
    const otp = generateOTP();
    await sendOTP(phone, otp);
    const otpHash = await hashOTP(otp);
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
    await User.findByIdAndUpdate(user._id, {
      otpHash,
      otpExpiry: new Date(Date.now() + expiryMinutes * 60 * 1000),
    });
  }
  return sendSuccess(res, null, 'OTP sent if phone number is registered');
});

// POST /api/auth/forgot-password/verify-otp
export const verifyForgotOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  const user = await User.findOne({ phone }).select('+otpHash +otpExpiry');
  if (!user || !user.otpHash || !user.otpExpiry) throw new AppError('OTP not found or expired', 400);
  if (user.otpExpiry < new Date()) throw new AppError('OTP expired', 400);
  const valid = await verifyOTP(otp, user.otpHash);
  if (!valid) throw new AppError('Invalid OTP', 400);
  // Issue a short-lived reset token
  const resetToken = generateAccessToken(user._id, 'reset');
  return sendSuccess(res, { resetToken }, 'OTP verified');
});

// POST /api/auth/forgot-password/reset
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { resetToken, newPassword } = req.body;
  let payload;
  try { payload = verifyRefreshToken(resetToken); }
  catch { throw new AppError('Invalid or expired reset token', 400); }

  const user = await User.findById(payload.userId).select('+otpHash +otpExpiry');
  if (!user) throw new AppError('User not found', 404);

  user.passwordHash = newPassword;
  user.otpHash = undefined;
  user.otpExpiry = undefined;
  await user.save();

  return sendSuccess(res, null, 'Password reset successfully');
});

// GET /api/auth/me
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  return sendSuccess(res, req.user, 'Profile fetched');
});

// PATCH /api/auth/me
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const { name, email } = req.body;
  const updated = await User.findByIdAndUpdate(
    req.user!._id,
    { $set: { name, email } },
    { new: true, runValidators: true }
  );
  return sendSuccess(res, updated, 'Profile updated');
});
