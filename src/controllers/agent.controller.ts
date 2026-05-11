import { Request, Response } from "express";
import { Agent, generateUniqueAgentCode } from "../models/Agent";
import { User } from "../models/User";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/errorHandler";

const COMMISSION_PER_ORDER = 10; // ₹10 per order

// ── Public: GET /api/v1/r/:code — verify agent code exists ──────────────────
export const resolveAgentCode = asyncHandler(
    async (req: Request, res: Response) => {
        const agent = await Agent.findOne({
            code: req.params.code,
            isActive: true,
        });
        if (!agent) throw new AppError("Invalid referral code", 404);
        return sendSuccess(
            res,
            { code: agent.code, valid: true },
            "Valid referral code",
        );
    },
);

// ── Admin: POST /api/v1/admin/agents — create agent ─────────────────────────
export const createAgent = asyncHandler(async (req: Request, res: Response) => {
    const { name, phone, upiId } = req.body;
    if (!name || !phone) throw new AppError("Name and phone are required", 400);

    // Check if agent with same phone already exists
    const existing = await Agent.findOne({ phone });
    if (existing)
        throw new AppError("Agent with this phone already exists", 400);

    const code = await generateUniqueAgentCode();
    const agent = await Agent.create({ name, phone, upiId, code });

    return sendCreated(res, agent, `Agent created with code ${code}`);
});

// ── Admin: GET /api/v1/admin/agents — list all agents ───────────────────────
export const listAgents = asyncHandler(async (req: Request, res: Response) => {
    const agents = await Agent.find().sort({ createdAt: -1 });

    // For each agent get referred user count
    const agentsWithUsers = await Promise.all(
        agents.map(async (agent) => {
            const userCount = await User.countDocuments({
                referredBy: agent.code,
            });
            return { ...agent.toJSON(), referredUsers: userCount };
        }),
    );

    return sendSuccess(res, agentsWithUsers, "Agents fetched");
});

// ── Admin: GET /api/v1/admin/agents/:id — get agent ─────────────────────────
export const getAgent = asyncHandler(async (req: Request, res: Response) => {
    const agent = await Agent.findById(req.params.id);
    if (!agent) throw new AppError("Agent not found", 404);

    const referredUsers = await User.countDocuments({ referredBy: agent.code });
    return sendSuccess(
        res,
        { ...agent.toJSON(), referredUsers },
        "Agent fetched",
    );
});

// ── Admin: PATCH /api/v1/admin/agents/:id — update agent ────────────────────
export const updateAgent = asyncHandler(async (req: Request, res: Response) => {
    const { name, phone, upiId, isActive } = req.body;
    const agent = await Agent.findByIdAndUpdate(
        req.params.id,
        {
            ...(name && { name }),
            ...(phone && { phone }),
            ...(upiId !== undefined && { upiId }),
            ...(isActive !== undefined && { isActive }),
        },
        { new: true },
    );
    if (!agent) throw new AppError("Agent not found", 404);
    return sendSuccess(res, agent, "Agent updated");
});

// ── Admin: POST /api/v1/admin/agents/:id/payout — mark commission as paid ───
export const markAgentPaid = asyncHandler(
    async (req: Request, res: Response) => {
        const agent = await Agent.findById(req.params.id);
        if (!agent) throw new AppError("Agent not found", 404);
        if (agent.pendingPayout === 0)
            throw new AppError("No pending payout", 400);

        const amount = agent.pendingPayout;
        agent.paidOut += amount;
        agent.pendingPayout = 0;
        await agent.save();

        return sendSuccess(
            res,
            agent,
            `Marked ₹${amount} as paid to ${agent.name}`,
        );
    },
);

// ── Admin: DELETE /api/v1/admin/agents/:id — delete agent ───────────────────
export const deleteAgent = asyncHandler(async (req: Request, res: Response) => {
    const agent = await Agent.findByIdAndDelete(req.params.id);
    if (!agent) throw new AppError("Agent not found", 404);
    return sendSuccess(res, null, "Agent deleted");
});

// ── Internal: credit commission to agent ────────────────────────────────────
export const creditAgentCommission = async (
    agentCode: string,
): Promise<void> => {
    await Agent.findOneAndUpdate(
        { code: agentCode, isActive: true },
        {
            $inc: {
                totalOrders: 1,
                totalEarnings: COMMISSION_PER_ORDER,
                pendingPayout: COMMISSION_PER_ORDER,
            },
        },
    );
};
