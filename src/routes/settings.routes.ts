// ── src/routes/settings.routes.ts ────────────────────────────────────────────
import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth';
import { getDeliveryMode, updateDeliveryMode } from '../controllers/settings.controller';

const router = Router();

// Public — app checks delivery mode
router.get('/delivery-mode', getDeliveryMode);

// Admin only — toggle delivery mode
router.patch('/delivery-mode', protect, requireRole('admin'), updateDeliveryMode);

export default router;

// ── Add to your routes/index.ts ───────────────────────────────────────────────
// import settingsRoutes from './settings.routes';
// router.use('/settings', settingsRoutes);
// router.use('/admin/settings', settingsRoutes);
