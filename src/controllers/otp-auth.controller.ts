import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../models/User";
import { OTP } from "../models/OTP";
import {
    generateAccessToken,
    generateRefreshToken,
} from "../services/token.service";
import { generateOTP } from "../services/otp.service";
// import { sendSmsOTP } from "../services/sms.service";
import { sendOTP } from "../services/otp.service";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/errorHandler";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// ── Helper: issue tokens ──────────────────────────────────────────────────────
async function issueTokens(
    userId: any,
    role: string,
    res: Response,
    message: string,
) {
    const accessToken = generateAccessToken(userId, role);
    const refreshToken = generateRefreshToken(userId);
    await User.findByIdAndUpdate(userId, {
        $push: { refreshTokens: refreshToken },
    });
    const user = await User.findById(userId);
    return sendSuccess(res, { user, accessToken, refreshToken }, message);
}

// ── POST /api/auth/otp/send ───────────────────────────────────────────────────
export const sendOtpHandler = asyncHandler(
    async (req: Request, res: Response) => {
        const { phone, purpose } = req.body as {
            phone: string;
            purpose: "login" | "register" | "forgot_password";
        };

        // Rate limit: max 3 OTPs per 10 minutes per phone+purpose
        const recentCount = await OTP.countDocuments({
            phone,
            purpose,
            expiresAt: { $gt: new Date() },
        });
        if (recentCount >= 3) {
            return sendError(
                res,
                "Too many OTP requests. Please wait 10 minutes.",
                429,
            );
        }

        if (purpose === "register") {
            const exists = await User.findOne({ phone });
            if (exists)
                throw new AppError(
                    "Phone number already registered. Please sign in.",
                    409,
                );
        }

        if (purpose === "login") {
            const user = await User.findOne({ phone, isActive: true });
            if (!user)
                throw new AppError(
                    "Phone number not registered. Please sign up.",
                    404,
                );
        }

        if (purpose === "forgot_password") {
            const user = await User.findOne({ phone, isActive: true });
            if (!user) throw new AppError("Phone number not registered.", 404);
        }

        const otp = generateOTP();
        const otpHash = await bcrypt.hash(otp, 10);

        await OTP.deleteMany({ phone, purpose });
        await OTP.create({
            phone,
            otpHash,
            purpose,
            expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
        });

        // await sendSmsOTP(phone, otp);
        await sendOTP(phone, otp);

        return sendSuccess(res, null, "OTP sent to your mobile number");
    },
);

// ── POST /api/auth/otp/verify-login ──────────────────────────────────────────
export const verifyLoginOtp = asyncHandler(
    async (req: Request, res: Response) => {
        const { phone, otp } = req.body as { phone: string; otp: string };

        const otpDoc = await OTP.findOne({ phone, purpose: "login" });
        if (!otpDoc)
            throw new AppError(
                "OTP not found or expired. Request a new one.",
                400,
            );
        if (otpDoc.expiresAt < new Date()) {
            await otpDoc.deleteOne();
            throw new AppError("OTP expired. Request a new one.", 400);
        }
        if (otpDoc.attempts >= MAX_ATTEMPTS) {
            await otpDoc.deleteOne();
            throw new AppError(
                "Too many incorrect attempts. Request a new OTP.",
                400,
            );
        }

        const valid = await bcrypt.compare(otp, otpDoc.otpHash);
        if (!valid) {
            await OTP.findByIdAndUpdate(otpDoc._id, { $inc: { attempts: 1 } });
            const rem = MAX_ATTEMPTS - otpDoc.attempts - 1;
            throw new AppError(
                `Invalid OTP. ${rem} attempt${rem !== 1 ? "s" : ""} remaining.`,
                400,
            );
        }

        await otpDoc.deleteOne();
        const user = await User.findOne({ phone, isActive: true });
        if (!user) throw new AppError("Account not found or deactivated.", 404);

        return issueTokens(user._id, user.role, res, "Login successful");
    },
);

// ── POST /api/auth/otp/verify-register ───────────────────────────────────────
export const verifyRegisterOtp = asyncHandler(
    async (req: Request, res: Response) => {
        const { phone, otp, name } = req.body as {
            phone: string;
            otp: string;
            name: string;
        };

        if (!name || name.trim().length < 2) {
            throw new AppError(
                "Full name is required (min 2 characters).",
                400,
            );
        }

        const otpDoc = await OTP.findOne({ phone, purpose: "register" });
        if (!otpDoc)
            throw new AppError(
                "OTP not found or expired. Request a new one.",
                400,
            );
        if (otpDoc.expiresAt < new Date()) {
            await otpDoc.deleteOne();
            throw new AppError("OTP expired. Request a new one.", 400);
        }
        if (otpDoc.attempts >= MAX_ATTEMPTS) {
            await otpDoc.deleteOne();
            throw new AppError(
                "Too many incorrect attempts. Request a new OTP.",
                400,
            );
        }

        const valid = await bcrypt.compare(otp, otpDoc.otpHash);
        if (!valid) {
            await OTP.findByIdAndUpdate(otpDoc._id, { $inc: { attempts: 1 } });
            const rem = MAX_ATTEMPTS - otpDoc.attempts - 1;
            throw new AppError(
                `Invalid OTP. ${rem} attempt${rem !== 1 ? "s" : ""} remaining.`,
                400,
            );
        }

        const existing = await User.findOne({ phone });
        if (existing)
            throw new AppError("Phone number already registered.", 409);

        await otpDoc.deleteOne();

        const dummyHash = await bcrypt.hash(Math.random().toString(36), 12);
        const user = await User.create({
            name: name.trim(),
            phone,
            passwordHash: dummyHash,
            role: "customer",
        });

        return issueTokens(user._id, user.role, res, "Registration successful");
    },
);

// ── POST /api/auth/otp/verify-forgot-password ────────────────────────────────
export const verifyForgotPasswordOtp = asyncHandler(
    async (req: Request, res: Response) => {
        const { phone, otp } = req.body as { phone: string; otp: string };

        const otpDoc = await OTP.findOne({ phone, purpose: "forgot_password" });
        if (!otpDoc)
            throw new AppError(
                "OTP not found or expired. Request a new one.",
                400,
            );
        if (otpDoc.expiresAt < new Date()) {
            await otpDoc.deleteOne();
            throw new AppError("OTP expired. Request a new one.", 400);
        }
        if (otpDoc.attempts >= MAX_ATTEMPTS) {
            await otpDoc.deleteOne();
            throw new AppError(
                "Too many incorrect attempts. Request a new OTP.",
                400,
            );
        }

        const valid = await bcrypt.compare(otp, otpDoc.otpHash);
        if (!valid) {
            await OTP.findByIdAndUpdate(otpDoc._id, { $inc: { attempts: 1 } });
            const rem = MAX_ATTEMPTS - otpDoc.attempts - 1;
            throw new AppError(
                `Invalid OTP. ${rem} attempt${rem !== 1 ? "s" : ""} remaining.`,
                400,
            );
        }

        await otpDoc.deleteOne();
        const user = await User.findOne({ phone });
        if (!user) throw new AppError("User not found.", 404);

        const resetToken = generateAccessToken(user._id, "reset");
        return sendSuccess(
            res,
            { resetToken },
            "OTP verified. You may now reset your password.",
        );
    },
);
export const verifyWidgetToken = asyncHandler(
    async (req: Request, res: Response) => {
        const { token, phone } = req.body as { token: string; phone: string };

        if (!token || !phone)
            return sendError(res, "token and phone are required", 400);

        // Normalize — handle all formats:
        // 9876543210      → +919876543210
        // 919876543210    → +919876543210
        // +919876543210   → +919876543210
        const cleaned = String(phone).replace(/\D/g, ""); // digits only
        const rawPhone =
            cleaned.length === 12 && cleaned.startsWith("91")
                ? cleaned.slice(2)
                : cleaned.length === 10
                  ? cleaned
                  : cleaned.replace(/^91/, "");
        const normalized = `${rawPhone}`;

        // Find existing user — do NOT auto-create
        const user = await User.findOne({ phone: normalized });

        if (!user) {
            const newUser = await User.create({
                name: "",
                phone,
                //  passwordHash: dummyHash,
                role: "customer",
            });
            const accessToken = generateAccessToken(
                newUser._id as any,
                newUser.role,
            );
            const refreshToken = generateRefreshToken(newUser._id as any);
            return sendSuccess(
                res,
                {
                    user: {
                        _id: newUser._id,
                        name: newUser.name,
                        phone: newUser.phone,
                        role: newUser.role,
                    },
                    accessToken,
                    refreshToken,
                },
                "Login successful",
            );
            // return sendError(
            //     res,
            //     `Phone ${normalized} not registered. Please contact admin.`,
            //     404,
            // );
        }

        if (!user.isActive)
            return sendError(res, "Account is deactivated", 403);

        const accessToken = generateAccessToken(user._id as any, user.role);
        const refreshToken = generateRefreshToken(user._id as any);

        user.refreshTokens = [
            ...(user.refreshTokens || []).slice(-4),
            refreshToken,
        ];
        await user.save();

        return sendSuccess(
            res,
            {
                user: {
                    _id: user._id,
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                },
                accessToken,
                refreshToken,
            },
            "Login successful",
        );
    },
);
