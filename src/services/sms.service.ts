import { logger } from "../utils/logger";
import axios from "axios";

/**
 * SMS OTP via Fast2SMS Bulk SMS (Service) route
 * - No DLT registration required
 * - Cost: based on plan (much cheaper than Quick route ₹5/SMS)
 * - Uses predefined OTP templates from Fast2SMS
 *
 * Setup:
 * 1. Sign up at https://fast2sms.com → recharge ₹100+
 * 2. Go to Dev API → get your API key
 * 3. Add to .env: FAST2SMS_API_KEY=your_key
 *
 * In Fast2SMS panel → Dev API → select route "Bulk SMS (Service)"
 * → note the sender_id options (FSTSMS or SENDER)
 * → note the message template IDs shown
 */

export const sendSmsOTP = async (phone: string, otp: string): Promise<void> => {
    if (!process.env.FAST2SMS_API_KEY) {
        logger.info(`[DEV] OTP for +91${phone}: ${otp}`);
        return;
    }

    try {
        // Bulk SMS Service route — uses predefined OTP template
        // Template: "{#var#} is your OTP. Please do not share it with anyone. - FSTSMS"
        const response = await axios.post(
            "https://www.fast2sms.com/dev/bulkV2",
            {
                route: "v3", // Bulk SMS Service (implicit/transactional)
                sender_id: "FSTSMS",
                message: "163190", // Fast2SMS OTP template ID
                variables_values: otp,
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
            logger.info(`OTP sent to +91${phone} via Fast2SMS`);
        } else {
            logger.error(`Fast2SMS rejected: ${JSON.stringify(response.data)}`);
            // Fallback to quick route if service route fails
            await _sendViaQuickRoute(phone, otp);
        }
    } catch (err: any) {
        if (err.response) {
            logger.error(
                `Fast2SMS ${err.response.status}: ${JSON.stringify(err.response.data)}`,
            );
            // Try quick route as fallback
            try {
                await _sendViaQuickRoute(phone, otp);
            } catch (err2: any) {
                throw new Error("Failed to send OTP. Please try again.");
            }
            return;
        }
        logger.error(`OTP send failed for +91${phone}: ${err.message}`);
        throw err;
    }
};

// Fallback: Quick route (₹5/SMS, no template needed)
async function _sendViaQuickRoute(phone: string, otp: string): Promise<void> {
    const message = `Your ZesDel OTP is ${otp}. Valid for 10 minutes. Do not share.`;
    const response = await axios.post(
        "https://www.fast2sms.com/dev/bulkV2",
        { route: "q", message, numbers: phone, flash: 0 },
        {
            headers: {
                authorization: process.env.FAST2SMS_API_KEY!,
                "Content-Type": "application/json",
            },
            timeout: 10000,
        },
    );
    if (response.data?.return === true) {
        logger.info(`OTP sent via Fast2SMS Quick route fallback`);
    } else {
        throw new Error(response.data?.message?.[0] || "SMS failed");
    }
}
