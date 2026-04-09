import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth';
import { upload, uploadProductImage, deleteProductImage } from '../controllers/upload.controller';

const router = Router();

// POST /api/v1/admin/upload/product-image
// Accepts multipart/form-data with field "image"
router.post(
  '/product-image',
  protect,
  requireRole('admin'),
  upload.single('image'),
  uploadProductImage,
);

// DELETE /api/v1/admin/upload/product-image
router.delete(
  '/product-image',
  protect,
  requireRole('admin'),
  deleteProductImage,
);

export default router;
