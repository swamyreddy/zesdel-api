import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  registerValidator, loginValidator, sendOtpValidator,
  verifyOtpValidator, resetPasswordValidator,
} from '../validators/auth.validators';

const router = Router();

router.post('/register',                    registerValidator,      validate, ctrl.register);
router.post('/login',                       loginValidator,         validate, ctrl.login);
router.post('/refresh',                                                       ctrl.refreshTokens);
router.post('/logout',                      protect,                          ctrl.logout);
router.post('/forgot-password/send-otp',    sendOtpValidator,       validate, ctrl.sendForgotOTP);
router.post('/forgot-password/verify-otp',  verifyOtpValidator,     validate, ctrl.verifyForgotOTP);
router.post('/forgot-password/reset',       resetPasswordValidator, validate, ctrl.resetPassword);
router.get ('/me',                          protect,                          ctrl.getMe);
router.patch('/me',                         protect,                          ctrl.updateMe);

export default router;
