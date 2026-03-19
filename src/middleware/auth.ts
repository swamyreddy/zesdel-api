import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';
import { User } from '../models/User';
import { sendError } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 'No token provided', 401);
  }

  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return sendError(res, 'Invalid or expired token', 401);
  }

  const user = await User.findById(payload.userId).select('+refreshTokens');
  if (!user || !user.isActive) return sendError(res, 'User not found or inactive', 401);

  req.user = user;
  next();
});

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'Forbidden: insufficient permissions', 403);
      return;
    }
    next();
  };
