import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

interface TokenPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (userId: Types.ObjectId, role: string): string =>
  jwt.sign(
    { userId: userId.toString(), role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

export const generateRefreshToken = (userId: Types.ObjectId): string =>
  jwt.sign(
    { userId: userId.toString() },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;

export const verifyRefreshToken = (token: string): { userId: string } =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { userId: string };
