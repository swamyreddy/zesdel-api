import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { firebaseVerify } from '../controllers/firebase-auth.controller';

const router = Router();

// POST /api/auth/firebase/verify
router.post('/verify',
  [
    body('idToken').notEmpty().withMessage('Firebase ID token is required'),
  ],
  validate,
  firebaseVerify
);

export default router;
