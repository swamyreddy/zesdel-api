import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import {
    adminListOrders,
    adminUpdateStatus,
    adminGetOrder,
} from "../controllers/order.controller";
import {
    getDashboardStats,
    getRevenueChart,
    getCategorySales,
    listUsers,
    toggleUserStatus,
    adminCreateCategory,
    adminUpdateCategory,
    adminDeleteCategory,
    bulkImportProducts,
    createUser,
    updateUser,
    deleteUser,
} from "../controllers/admin.controller";
import { body } from "express-validator";
import { validate } from "../middleware/validate";

const router = Router();
router.use(protect, requireRole("admin"));

// Dashboard & reports
router.get("/dashboard/stats", getDashboardStats);
router.get("/reports/revenue", getRevenueChart);
router.get("/reports/category-sales", getCategorySales);

// Orders
router.get("/orders", adminListOrders);
router.get("/orders/:id", adminGetOrder);
router.patch(
    "/orders/:id/status",
    [body("status").notEmpty(), body("note").optional().trim()],
    validate,
    adminUpdateStatus,
);

// Users
router.get("/users", listUsers);
router.patch("/users/:id/toggle-status", toggleUserStatus);

// Categories (admin CRUD)
router.post("/categories", adminCreateCategory);
router.patch("/categories/:id", adminUpdateCategory);
router.delete("/categories/:id", adminDeleteCategory);
router.post(
    "/products/bulk",
    protect,
    requireRole("admin"),
    bulkImportProducts,
);
router.post("/users", protect, requireRole("admin"), createUser);
router.patch("/users/:id", protect, requireRole("admin"), updateUser);
router.delete("/users/:id", protect, requireRole("admin"), deleteUser);
export default router;
