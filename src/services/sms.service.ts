import { logger } from "../utils/logger";
import axios from "axios";

/**
 * SMS OTP via Fast2SMS Quick route
 * No DLT needed. ₹5/SMS.
 * Add FAST2SMS_API_KEY to .env
 */
export const sendSmsOTP = async (phone: string, otp: string): Promise<void> => {
    if (!process.env.FAST2SMS_API_KEY) {
        logger.info(`[DEV] OTP for +91${phone}: ${otp}`);
        return;
    }

    try {
        const response = await axios.post(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                route: "q",
                message: `Your ZesDel OTP is ${otp}. Valid for 10 minutes. Do not share.`,
                language: "english",
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
            logger.info(`OTP sent to +91${phone}`);
        } else {
            logger.error(
                `Fast2SMS full response: ${JSON.stringify(response.data)} | status: ${response.status} | headers: ${JSON.stringify(response.headers)}`,
            );
            throw new Error(
                response.data?.message?.[0] ||
                    response.data?.message ||
                    `Fast2SMS failed with status ${response.status}`,
            );
        }
    } catch (err: any) {
        if (err.response) {
            logger.error(
                `Fast2SMS ${err.response.status}: ${JSON.stringify(err.response.data)}`,
            );
            const msg =
                err.response.data?.message?.[0] ||
                "Failed to send OTP. Please try again.";
            throw new Error(
                typeof msg === "string"
                    ? msg
                    : "Failed to send OTP. Please try again.",
            );
        }
        logger.error(`OTP failed for +91${phone}: ${err.message}`);
        throw new Error("Failed to send OTP. Please try again.");
    }
};
