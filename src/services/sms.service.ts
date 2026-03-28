import { logger } from "../utils/logger";
import axios from "axios";

/**
 * SMS OTP via Fast2SMS Quick route (no DLT, no website verification needed)
 * Sign up at https://fast2sms.com → get API key → recharge ₹50+
 */

export const sendSmsOTP = async (phone: string, otp: string): Promise<void> => {
    if (!process.env.FAST2SMS_API_KEY) {
        logger.info(`[DEV] OTP for +91${phone}: ${otp}`);
        return;
    }

    try {
        const message = `Your ZesDel OTP is ${otp}. Valid for 10 minutes. Do not share with anyone.`;

        const response = await axios.post(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                route: "q", // Quick SMS — no DLT, no website verification
                message: message,
                numbers: phone,
                flash: 0,
            },
            {
                headers: {
                    authorization: process.env.FAST2SMS_API_KEY!,
                    "Content-Type": "application/json",
                },
                timeout: 10000,
            },
        );

        if (response.data?.return === true) {
            logger.info(`OTP sent to +91${phone} via Fast2SMS Quick`);
        } else {
            logger.error(`Fast2SMS rejected: ${JSON.stringify(response.data)}`);
            const msg = response.data?.message?.[0] || "Failed to send OTP";
            throw new Error(msg);
        }
    } catch (err: any) {
        if (err.response) {
            logger.error(
                `Fast2SMS ${err.response.status}: ${JSON.stringify(err.response.data)}`,
            );
            const msg =
                err.response.data?.message?.[0] ||
                err.response.data?.message ||
                "Failed to send OTP";
            throw new Error(msg);
        }
        logger.error(`OTP send failed for +91${phone}: ${err.message}`);
        throw err;
    }
};
