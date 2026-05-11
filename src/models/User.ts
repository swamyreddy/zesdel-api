import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    email?: string;
    passwordHash: string;
    role: "customer" | "admin" | "delivery";
    referredBy?: string; // ← agent code e.g. "4821"
    lastLocation?: {
        type: "Point";
        coordinates: [number, number];
    };
    isActive: boolean;
    refreshTokens: string[];
    fcmTokens: string[];
    otpHash?: string;
    otpExpiry?: Date;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(plain: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        phone: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        email: {
            type: String,
            sparse: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: { type: String, required: false, select: false },
        role: {
            type: String,
            enum: ["customer", "admin", "delivery"],
            default: "customer",
        },
        referredBy: { type: String, default: null }, // ← agent code saved at registration
        isActive: { type: Boolean, default: true },
        refreshTokens: { type: [String], select: false, default: [] },
        fcmTokens: { type: [String], default: [] },
        otpHash: { type: String, select: false },
        otpExpiry: { type: Date, select: false },
        lastLocation: {
            type: { type: String, enum: ["Point"], required: false },
            coordinates: { type: [Number], required: false },
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_, ret) {
                delete (ret as any).passwordHash;
                delete (ret as any).refreshTokens;
                delete (ret as any).otpHash;
                delete (ret as any).otpExpiry;
                delete (ret as any).__v;
                return ret;
            },
        },
    },
);

UserSchema.pre("save", async function (next) {
    if (!this.isModified("passwordHash")) return next();
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
});

UserSchema.methods.comparePassword = async function (
    plain: string,
): Promise<boolean> {
    return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.index({ phone: 1, isActive: 1 });
UserSchema.index({ lastLocation: "2dsphere" }, { sparse: true });

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
