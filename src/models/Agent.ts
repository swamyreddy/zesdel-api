import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAgent extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    code: string; // unique 4-digit code e.g. "4821"
    upiId?: string; // for payouts
    isActive: boolean;
    totalOrders: number; // total orders referred
    totalEarnings: number; // total commission earned (₹)
    pendingPayout: number; // unpaid commission
    paidOut: number; // total paid out so far
    createdAt: Date;
    updatedAt: Date;
}

const AgentSchema = new Schema<IAgent>(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        code: {
            type: String,
            required: true,
            unique: true,
            index: true,
            length: 4,
        },
        upiId: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
        totalOrders: { type: Number, default: 0 },
        totalEarnings: { type: Number, default: 0 },
        pendingPayout: { type: Number, default: 0 },
        paidOut: { type: Number, default: 0 },
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

// Generate unique 4-digit code
export const generateUniqueAgentCode = async (): Promise<string> => {
    let code: string;
    let exists = true;
    do {
        // Random 4-digit number between 1000-9999
        code = String(Math.floor(1000 + Math.random() * 9000));
        exists = !!(await mongoose.model("Agent").findOne({ code }));
    } while (exists);
    return code;
};

export const Agent: Model<IAgent> = mongoose.model<IAgent>(
    "Agent",
    AgentSchema,
);
