import { Router } from 'express';
import * as ctrl from '../controllers/address.controller';
import { protect } from '../middleware/auth';

const router = Router();

router.use(protect);
router.get ('/',               ctrl.listAddresses);
router.post('/',               ctrl.createAddress);
router.patch('/:id',           ctrl.updateAddress);
router.delete('/:id',          ctrl.deleteAddress);
router.patch('/:id/set-default', ctrl.setDefaultAddress);

export default router;
