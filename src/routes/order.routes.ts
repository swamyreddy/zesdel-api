import { Router } from 'express';
import * as ctrl from '../controllers/order.controller';
import { protect, requireRole } from '../middleware/auth';
import { placeOrderValidator } from '../validators/order.validators';
import { validate } from '../middleware/validate';

const router = Router();

router.use(protect);
router.post('/',          placeOrderValidator, validate, ctrl.createOrder);
router.get ('/',          ctrl.listOrders);
router.get ('/:id',       ctrl.getOrder);
router.post('/:id/cancel', ctrl.cancelOrder);

export default router;
