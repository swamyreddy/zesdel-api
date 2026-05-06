import bcrypt from "bcryptjs";
import { logger } from "../utils/logger";

// ── Generate / hash / verify ──────────────────────────────────────────────────
export const generateOTP = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

export const hashOTP = async (otp: string): Promise<string> =>
    bcrypt.hash(otp, 10);

export const verifyOTP = async (
    plain: string,
    hash: string,
): Promise<boolean> => bcrypt.compare(plain, hash);

// ── MSG91 SMS ─────────────────────────────────────────────────────────────────
export const sendOTP = async (phone: string, otp: string): Promise<void> => {
    // Always log in dev
    logger.info(`OTP for ${phone}: ${otp}`);

    if (process.env.NODE_ENV !== "production") return;

    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    const senderId = process.env.MSG91_SENDER_ID || "ZESDEL";

    if (!authKey || !templateId) {
        logger.warn(
            "MSG91_AUTH_KEY or MSG91_TEMPLATE_ID not set — OTP not sent via SMS",
        );
        return;
    }

    // MSG91 expects phone without + e.g. 919876543210
    const mobileNumber = phone.replace(/^\+/, "");

    try {
        const res = await fetch("https://api.msg91.com/api/v5/otp", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                authkey: authKey,
            },
            body: JSON.stringify({
                template_id: templateId,
                mobile: mobileNumber,
                authkey: authKey,
                otp,
            }),
        });

        const data = (await res.json()) as { type: string; message: string };

        if (data.type === "success") {
            logger.info(`MSG91 OTP sent to ${phone}`);
        } else {
            logger.error(`MSG91 error: ${data.message}`);
            throw new Error(`MSG91: ${data.message}`);
        }
    } catch (err) {
        logger.error(`Failed to send OTP via MSG91: ${err}`);
        throw err;
    }
};

// ── MSG91 OTP Verify (optional — you can verify on MSG91 side too) ────────────
// If you want MSG91 to verify the OTP instead of your DB:
export const verifyOTPViaMSG91 = async (
    phone: string,
    otp: string,
): Promise<boolean> => {
    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey) return false;

    const mobileNumber = phone.replace(/^\+/, "");

    try {
        const res = await fetch(
            `https://api.msg91.com/api/v5/otp/verify?mobile=${mobileNumber}&otp=${otp}`,
            { method: "GET", headers: { authkey: authKey } },
        );
        const data = (await res.json()) as { type: string; message: string };
        return data.type === "success";
    } catch {
        return false;
    }
};
