import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import {
    adminListOrders,
    adminUpdateStatus,
    adminGetOrder,
    adminDeleteAllOrders,
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
import {
    listAgents,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    markAgentPaid,
} from "../controllers/agent.controller";
import {
    listTickets,
    getTicket,
    updateTicket,
    deleteTicket,
    getTicketStats,
} from "../controllers/support.controller";
import { body } from "express-validator";
import { validate } from "../middleware/validate";

const router = Router();
router.use(protect, requireRole("admin"));

// ── Dashboard & reports ───────────────────────────────────────────────────────
router.get("/dashboard/stats", getDashboardStats);
router.get("/reports/revenue", getRevenueChart);
router.get("/reports/category-sales", getCategorySales);

// ── Orders ────────────────────────────────────────────────────────────────────
router.get("/orders", adminListOrders);
router.get("/orders/:id", adminGetOrder);
router.patch(
    "/orders/:id/status",
    [body("status").notEmpty(), body("note").optional().trim()],
    validate,
    adminUpdateStatus,
);
router.delete("/orders/all", adminDeleteAllOrders);

// ── Users ─────────────────────────────────────────────────────────────────────
router.get("/users", listUsers);
router.patch("/users/:id/toggle-status", toggleUserStatus);
router.post("/users", createUser);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// ── Categories ────────────────────────────────────────────────────────────────
router.post("/categories", adminCreateCategory);
router.patch("/categories/:id", adminUpdateCategory);
router.delete("/categories/:id", adminDeleteCategory);

// ── Products ──────────────────────────────────────────────────────────────────
router.post("/products/bulk", bulkImportProducts);

// ── Agents ───────────────────────────────────────────────────────────────────
router.get("/agents", listAgents);
router.get("/agents/:id", getAgent);
router.post(
    "/agents",
    [
        body("name").notEmpty().trim(),
        body("phone").notEmpty().trim(),
        body("upiId").optional().trim(),
    ],
    validate,
    createAgent,
);
router.patch("/agents/:id", updateAgent);
router.delete("/agents/:id", deleteAgent);
router.post("/agents/:id/payout", markAgentPaid);

router.get("/support/stats", getTicketStats);
router.get("/support", listTickets);
router.get("/support/:id", getTicket);
router.patch("/support/:id", updateTicket);
router.delete("/support/:id", deleteTicket);
export default router;
