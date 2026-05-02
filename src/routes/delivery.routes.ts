// ── src/routes/delivery.routes.ts ────────────────────────────────────────────
import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth';
import {
  getMyOrders,
  updateOrderStatus,
  updateAgentLocation,
  getAgentStats,
  getDeliveryAgents,
  assignOrderToAgent,
} from '../controllers/delivery.controller';

const router = Router();

// ── Delivery agent routes (requires delivery or admin role) ───────────────────
router.get('/my-orders',          protect, requireRole('delivery', 'admin'), getMyOrders);
router.patch('/orders/:id/status',protect, requireRole('delivery', 'admin'), updateOrderStatus);
router.post('/location',          protect, requireRole('delivery', 'admin'), updateAgentLocation);
router.get('/stats',              protect, requireRole('delivery', 'admin'), getAgentStats);

// ── Admin only routes ─────────────────────────────────────────────────────────
router.get('/agents',             protect, requireRole('admin'), getDeliveryAgents);
router.patch('/assign/:id',       protect, requireRole('admin'), assignOrderToAgent);

export default router;

// ── Add to src/routes/index.ts ────────────────────────────────────────────────
// import deliveryRoutes from './delivery.routes';
// router.use('/delivery', deliveryRoutes);
// router.use('/admin/delivery', deliveryRoutes);
