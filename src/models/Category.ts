import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  slug: string;       // e.g. "veg", "fruit"
  name: string;
  emoji: string;
  colorIndex: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    slug:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    name:       { type: String, required: true, trim: true },
    emoji:      { type: String, required: true },
    colorIndex: { type: Number, default: 0 },
    isActive:   { type: Boolean, default: true, index: true },
    sortOrder:  { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { transform(_, ret) { ret.__v = undefined; return ret; } } }
);

CategorySchema.index({ isActive: 1, sortOrder: 1 });

export const Category: Model<ICategory> = mongoose.model<ICategory>('Category', CategorySchema);
