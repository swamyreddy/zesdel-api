import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  subtitle: string;
  emoji: string;
  price: number;
  originalPrice?: number;
  category: mongoose.Types.ObjectId;  // ref to Category
  categorySlug: string;               // denormalized for fast filtering
  badge?: string;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  stock: number;
  images: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  discountPercent: number;
}

const ProductSchema = new Schema<IProduct>(
  {
    name:          { type: String, required: true, trim: true, index: 'text' },
    subtitle:      { type: String, required: true, trim: true },
    emoji:         { type: String, required: true },
    price:         { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    category:      { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    categorySlug:  { type: String, required: true, index: true },
    badge:         { type: String, trim: true },
    rating:        { type: Number, default: 4.5, min: 0, max: 5 },
    reviewCount:   { type: Number, default: 0, min: 0 },
    isAvailable:   { type: Boolean, default: true, index: true },
    stock:         { type: Number, default: 100, min: 0 },
    images:        { type: [String], default: [] },
    tags:          { type: [String], default: [], index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_, ret) { ret.__v = undefined; return ret; },
    },
  }
);

// Virtual: discount percentage
ProductSchema.virtual('discountPercent').get(function () {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Compound indexes for common queries
ProductSchema.index({ categorySlug: 1, isAvailable: 1, price: 1 });
ProductSchema.index({ isAvailable: 1, rating: -1 });
ProductSchema.index({ name: 'text', subtitle: 'text', tags: 'text' }); // full-text search

export const Product: Model<IProduct> = mongoose.model<IProduct>('Product', ProductSchema);
