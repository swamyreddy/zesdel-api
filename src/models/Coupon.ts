import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICoupon extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  description: string;
  discountType: 'flat' | 'percent';
  discountValue: number;       // flat ₹ amount or percent value
  maxDiscount?: number;        // cap for percent coupons
  minOrderValue: number;
  usageLimit: number;          // total uses allowed (-1 = unlimited)
  usageCount: number;
  perUserLimit: number;        // per-user usage cap
  isActive: boolean;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  computeDiscount(subtotal: number): number;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code:          { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description:   { type: String, required: true },
    discountType:  { type: String, enum: ['flat', 'percent'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount:   { type: Number, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    usageLimit:    { type: Number, default: -1 },
    usageCount:    { type: Number, default: 0, min: 0 },
    perUserLimit:  { type: Number, default: 1 },
    isActive:      { type: Boolean, default: true, index: true },
    expiresAt:     { type: Date },
  },
  {
    timestamps: true,
    toJSON: { transform(_, ret) { ret.__v = undefined; return ret; } },
  }
);

CouponSchema.methods.computeDiscount = function (subtotal: number): number {
  if (subtotal < this.minOrderValue) return 0;
  if (this.discountType === 'flat') return this.discountValue;
  const percent = (subtotal * this.discountValue) / 100;
  return this.maxDiscount ? Math.min(percent, this.maxDiscount) : percent;
};

CouponSchema.index({ code: 1, isActive: 1 });

export const Coupon: Model<ICoupon> = mongoose.model<ICoupon>('Coupon', CouponSchema);
