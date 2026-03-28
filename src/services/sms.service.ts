import { logger } from "../utils/logger";
import axios from "axios";

/**
 * SMS OTP via Fast2SMS OTP route (no DLT needed)
 *
 * Setup:
 * 1. Sign up at https://fast2sms.com
 * 2. Recharge minimum ₹100
 * 3. Go to Dev API → API Authorization → copy your API key
 * 4. Add to .env: FAST2SMS_API_KEY=your_key
 *
 * OTP is delivered as: "XXXXXX is your verification code."
 * Cost: ₹0.35 per SMS, no DLT registration needed.
 */

export const sendSmsOTP = async (phone: string, otp: string): Promise<void> => {
    // Dev mode — just log
    if (!process.env.FAST2SMS_API_KEY) {
        logger.info(`[DEV] OTP for +91${phone}: ${otp}`);
        return;
    }

    try {
        const response = await axios.get(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                params: {
                    authorization: process.env.FAST2SMS_API_KEY,
                    variables_values: otp,
                    route: "otp",
                    numbers: phone,
                },
                headers: { "cache-control": "no-cache" },
                timeout: 10000,
            },
        );

        if (response.data?.return === true) {
            logger.info(`OTP sent to +91${phone} via Fast2SMS`);
        } else {
            logger.error(`Fast2SMS rejected: ${JSON.stringify(response.data)}`);
            throw new Error(response.data?.message?.[0] || "Fast2SMS failed");
        }
    } catch (err: any) {
        // Log the actual response body from Fast2SMS for debugging
        if (err.response) {
            logger.error(
                `Fast2SMS ${err.response.status}: ${JSON.stringify(err.response.data)}`,
            );
            const msg =
                err.response.data?.message?.[0] ||
                err.response.data?.message ||
                "SMS failed";
            throw new Error(msg);
        }
        logger.error(`OTP send failed for +91${phone}: ${err.message}`);
        throw err;
    }
};
