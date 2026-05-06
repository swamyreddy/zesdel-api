// ── src/controllers/delivery.controller.ts ───────────────────────────────────
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { Order } from "../models/Order";
import { User } from "../models/User";

// ── GET /api/v1/delivery/my-orders ───────────────────────────────────────────
export const getMyOrders = asyncHandler(async (req: Request, res: Response) => {
    const agentId = req.user!._id; // ← non-null assertion

    const orders = await Order.find({
        $or: [
            { deliveryAgent: agentId },
            {
                deliveryAgent: { $exists: false },
                status: { $in: ["confirmed", "preparing", "out_for_delivery"] },
            },
        ],
    })
        .populate("user", "name phone")
        .sort({ createdAt: -1 })
        .limit(50);

    return sendSuccess(res, orders);
});

// ── PATCH /api/v1/delivery/orders/:id/status ─────────────────────────────────
export const updateOrderStatus = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { status, note } = req.body as { status: string; note?: string };
        const agentId = req.user!._id; // ← non-null assertion

        const allowedStatuses = [
            "out_for_delivery",
            "delivered",
            "failed_delivery",
        ];
        if (!allowedStatuses.includes(status)) {
            return sendError(
                res,
                `Invalid status. Allowed: ${allowedStatuses.join(", ")}`,
                400,
            );
        }

        const order = await Order.findById(id);
        if (!order) return sendError(res, "Order not found", 404);

        if (
            order.deliveryAgent &&
            order.deliveryAgent.toString() !== agentId.toString()
        ) {
            return sendError(
                res,
                "This order is assigned to another agent",
                403,
            );
        }

        if (status === "out_for_delivery") {
            order.deliveryAgent = agentId as any;
        }

        const previousStatus = order.status;
        order.status = status as any;

        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
            status,
            timestamp: new Date(),
            note: note || `Updated by delivery agent`,
            updatedBy: agentId,
        } as any);

        if (status === "delivered") {
            (order as any).deliveredAt = new Date();
        }

        await order.save();
        await order.populate("user", "name phone");

        return sendSuccess(res, order, `Order status updated to ${status}`);
    },
);

// ── POST /api/v1/delivery/location ───────────────────────────────────────────
export const updateAgentLocation = asyncHandler(
    async (req: Request, res: Response) => {
        const { latitude, longitude } = req.body as {
            latitude: number;
            longitude: number;
        };
        const agentId = req.user!._id; // ← non-null assertion

        if (!latitude || !longitude) {
            return sendError(res, "latitude and longitude are required", 400);
        }

        await User.findByIdAndUpdate(agentId, {
            lastLocation: {
                type: "Point",
                coordinates: [longitude, latitude],
            },
            lastLocationAt: new Date(),
        });

        return sendSuccess(res, { latitude, longitude }, "Location updated");
    },
);

// ── GET /api/v1/delivery/stats ────────────────────────────────────────────────
export const getAgentStats = asyncHandler(
    async (req: Request, res: Response) => {
        const agentId = req.user!._id; // ← non-null assertion
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [totalDelivered, totalActive, totalFailed] = await Promise.all([
            Order.countDocuments({
                deliveryAgent: agentId,
                status: "delivered",
                updatedAt: { $gte: todayStart },
            }),
            Order.countDocuments({
                deliveryAgent: agentId,
                status: { $in: ["confirmed", "preparing", "out_for_delivery"] },
            }),
            Order.countDocuments({
                deliveryAgent: agentId,
                status: "failed_delivery",
                updatedAt: { $gte: todayStart },
            }),
        ]);

        const deliveredOrders = await Order.find({
            deliveryAgent: agentId,
            status: "delivered",
            updatedAt: { $gte: todayStart },
        }).select("total");

        const todayEarnings = deliveredOrders.reduce(
            (sum, o) => sum + o.total * 0.05,
            0,
        );

        return sendSuccess(res, {
            totalDelivered,
            totalActive,
            totalFailed,
            todayEarnings: Math.round(todayEarnings),
        });
    },
);

// ── GET /api/v1/delivery/agents (admin) ───────────────────────────────────────
export const getDeliveryAgents = asyncHandler(
    async (req: Request, res: Response) => {
        const agents = await User.find({ role: "delivery" })
            .select("name phone lastLocation lastLocationAt isActive createdAt")
            .sort({ lastLocationAt: -1 });

        return sendSuccess(res, agents);
    },
);

// ── PATCH /api/v1/delivery/assign/:id (admin) ─────────────────────────────────
export const assignOrderToAgent = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const { agentId } = req.body as { agentId: string };

        const [order, agent] = await Promise.all([
            Order.findById(id),
            User.findById(agentId),
        ]);

        if (!order) return sendError(res, "Order not found", 404);
        if (!agent || agent.role !== "delivery")
            return sendError(res, "Delivery agent not found", 404);

        order.deliveryAgent = agentId as any;
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({
            status: order.status,
            timestamp: new Date(),
            note: `Assigned to ${agent.name}`,
        } as any);

        await order.save();
        return sendSuccess(res, order, `Order assigned to ${agent.name}`);
    },
);
