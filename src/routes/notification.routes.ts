import { Router } from "express";
import { protect } from "../middleware/auth";
import {
    saveFcmToken,
    removeFcmToken,
} from "../controllers/notification.controller";

const router = Router();

router.post("/fcm-token", protect, saveFcmToken);
router.delete("/fcm-token", protect, removeFcmToken);

export default router;
