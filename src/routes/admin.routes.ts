import { Router } from 'express';
import { protect, requireRole } from '../middleware/auth';
import { adminListOrders, adminUpdateStatus, adminGetOrder } from '../controllers/order.controller';
import {
  getDashboardStats, getRevenueChart, getCategorySales,
  listUsers, toggleUserStatus,
  adminCreateCategory, adminUpdateCategory, adminDeleteCategory,
} from '../controllers/admin.controller';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';

const router = Router();
router.use(protect, requireRole('admin'));

// Dashboard & reports
router.get('/dashboard/stats',        getDashboardStats);
router.get('/reports/revenue',        getRevenueChart);
router.get('/reports/category-sales', getCategorySales);

// Orders
router.get('/orders',        adminListOrders);
router.get('/orders/:id',    adminGetOrder);
router.patch('/orders/:id/status',
  [body('status').notEmpty(), body('note').optional().trim()],
  validate,
  adminUpdateStatus
);

// Users
router.get('/users',                  listUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);

// Categories (admin CRUD)
router.post('/categories',            adminCreateCategory);
router.patch('/categories/:id',       adminUpdateCategory);
router.delete('/categories/:id',      adminDeleteCategory);

export default router;
