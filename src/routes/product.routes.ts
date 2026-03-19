import { Router } from 'express';
import * as ctrl from '../controllers/product.controller';
import { protect, requireRole } from '../middleware/auth';

const router = Router();

router.get ('/',           ctrl.listProducts);
router.get ('/featured',   ctrl.getFeaturedProducts);
router.get ('/:id',        ctrl.getProduct);

// Admin only
router.post('/',           protect, requireRole('admin'), ctrl.createProduct);
router.patch('/:id',       protect, requireRole('admin'), ctrl.updateProduct);
router.delete('/:id',      protect, requireRole('admin'), ctrl.deleteProduct);

export default router;
