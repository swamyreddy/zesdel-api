import { Router } from 'express';
import * as ctrl from '../controllers/coupon.controller';
import { protect, requireRole } from '../middleware/auth';

const router = Router();

router.get ('/',          ctrl.listCoupons);
router.post('/validate',  protect, ctrl.validateCoupon);

// Admin
router.post('/',          protect, requireRole('admin'), ctrl.createCoupon);
router.patch('/:id',      protect, requireRole('admin'), ctrl.updateCoupon);
router.delete('/:id',     protect, requireRole('admin'), ctrl.deleteCoupon);

export default router;
