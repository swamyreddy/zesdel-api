import { Request, Response } from "express";
import { SupportTicket } from "../models/SupportTicket";
import { sendSuccess, sendCreated, sendError } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../middleware/errorHandler";

// ── Public: POST /api/v1/support — create ticket ─────────────────────────────
export const createTicket = asyncHandler(
    async (req: Request, res: Response) => {
        const { name, phone, problem, description } = req.body;

        if (!name || name.trim().length < 2)
            throw new AppError("Name is required (min 2 characters)", 400);
        if (!phone || phone.replace(/\D/g, "").length < 10)
            throw new AppError("Valid phone number is required", 400);
        if (!problem) throw new AppError("Problem type is required", 400);
        if (
            problem === "Others" &&
            (!description || description.trim().length < 5)
        )
            throw new AppError(
                "Please describe your problem (min 5 characters)",
                400,
            );

        const ticket = await SupportTicket.create({
            name: name.trim(),
            phone: phone.replace(/\D/g, "").slice(-10),
            problem,
            description: description?.trim(),
        });

        return sendCreated(
            res,
            ticket,
            `Ticket ${ticket.ticketId} created. We'll contact you shortly.`,
        );
    },
);

// ── Admin: GET /api/v1/admin/support — list tickets ───────────────────────────
export const listTickets = asyncHandler(async (req: Request, res: Response) => {
    const {
        status,
        page = "1",
        limit = "20",
    } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const [tickets, total] = await Promise.all([
        SupportTicket.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
        SupportTicket.countDocuments(filter),
    ]);

    return sendSuccess(res, tickets, "Tickets fetched", 200, {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
    });
});

// ── Admin: GET /api/v1/admin/support/:id — get ticket ────────────────────────
export const getTicket = asyncHandler(async (req: Request, res: Response) => {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) throw new AppError("Ticket not found", 404);
    return sendSuccess(res, ticket, "Ticket fetched");
});

// ── Admin: PATCH /api/v1/admin/support/:id — update status/note ──────────────
export const updateTicket = asyncHandler(
    async (req: Request, res: Response) => {
        const { status, adminNote } = req.body;

        const ticket = await SupportTicket.findById(req.params.id);
        if (!ticket) throw new AppError("Ticket not found", 404);

        if (status) ticket.status = status;
        if (adminNote !== undefined) ticket.adminNote = adminNote;
        if (status === "resolved" && !ticket.resolvedAt)
            ticket.resolvedAt = new Date();

        await ticket.save();
        return sendSuccess(res, ticket, "Ticket updated");
    },
);

// ── Admin: DELETE /api/v1/admin/support/:id — delete ticket ──────────────────
export const deleteTicket = asyncHandler(
    async (req: Request, res: Response) => {
        const ticket = await SupportTicket.findByIdAndDelete(req.params.id);
        if (!ticket) throw new AppError("Ticket not found", 404);
        return sendSuccess(res, null, "Ticket deleted");
    },
);

// ── Admin: GET /api/v1/admin/support/stats — ticket stats ────────────────────
export const getTicketStats = asyncHandler(
    async (req: Request, res: Response) => {
        const [open, in_progress, resolved, closed, total] = await Promise.all([
            SupportTicket.countDocuments({ status: "open" }),
            SupportTicket.countDocuments({ status: "in_progress" }),
            SupportTicket.countDocuments({ status: "resolved" }),
            SupportTicket.countDocuments({ status: "closed" }),
            SupportTicket.countDocuments(),
        ]);
        return sendSuccess(
            res,
            { open, in_progress, resolved, closed, total },
            "Stats fetched",
        );
    },
);
