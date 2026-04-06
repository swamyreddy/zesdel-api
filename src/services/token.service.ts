import jwt from "jsonwebtoken";
import { Types } from "mongoose";

interface TokenPayload {
    userId: string;
    role: string;
}

export const generateAccessToken = (
    userId: Types.ObjectId,
    role: string,
): string =>
    jwt.sign(
        { userId: userId.toString(), role },
        process.env.JWT_SECRET as string,
        { expiresIn: "15m" } as any,
    );

export const generateRefreshToken = (userId: Types.ObjectId): string =>
    jwt.sign(
        { userId: userId.toString() },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: "7d" } as any,
    );

export const verifyAccessToken = (token: string): TokenPayload =>
    jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;

export const verifyRefreshToken = (token: string): { userId: string } =>
    jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as {
        userId: string;
    };
