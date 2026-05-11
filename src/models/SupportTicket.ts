import mongoose, { Document, Schema, Model } from "mongoose";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketProblem =
    | "OTP not received"
    | "Cannot login"
    | "App not loading"
    | "Order not placed"
    | "Payment issue"
    | "Others";

export interface ISupportTicket extends Document {
    _id: mongoose.Types.ObjectId;
    ticketId: string; // human-readable e.g. TKT-0001
    name: string;
    phone: string;
    problem: TicketProblem;
    description?: string; // filled when problem is "Others"
    status: TicketStatus;
    adminNote?: string; // internal note from admin
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
    {
        ticketId: { type: String, unique: true, index: true },
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        problem: {
            type: String,
            required: true,
            enum: [
                "OTP not received",
                "Cannot login",
                "App not loading",
                "Order not placed",
                "Payment issue",
                "Others",
            ],
        },
        description: { type: String, trim: true },
        status: {
            type: String,
            enum: ["open", "in_progress", "resolved", "closed"],
            default: "open",
            index: true,
        },
        adminNote: { type: String, trim: true },
        resolvedAt: { type: Date },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_, ret) {
                delete (ret as any).__v;
                return ret;
            },
        },
    },
);

// Auto-generate ticketId
SupportTicketSchema.pre("save", async function (next) {
    if (this.isNew && !this.ticketId) {
        const count = await mongoose.model("SupportTicket").countDocuments();
        this.ticketId = `TKT-${String(count + 1).padStart(4, "0")}`;
    }
    next();
});

SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ phone: 1 });

export const SupportTicket: Model<ISupportTicket> =
    mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);
