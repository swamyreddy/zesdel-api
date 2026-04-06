import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { saveFcmToken, removeFcmToken } from '../controllers/notification.controller';

const router = Router();

router.post('/fcm-token',    authenticate, saveFcmToken);
router.delete('/fcm-token',  authenticate, removeFcmToken);

export default router;
