import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAddress extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  label: 'Home' | 'Work' | 'Other';
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  state: string;
  isDefault: boolean;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    user:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label:     { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
    name:      { type: String, required: true, trim: true },
    phone:     { type: String, required: true, trim: true },
    line1:     { type: String, required: true, trim: true },
    line2:     { type: String, trim: true },
    city:      { type: String, required: true, trim: true },
    pincode:   { type: String, required: true, trim: true, match: /^\d{6}$/ },
    state:     { type: String, default: 'Telangana', trim: true },
    isDefault: { type: Boolean, default: false },
    location: {
      type:        { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: undefined }, // [lng, lat]
    },
  },
  {
    timestamps: true,
    toJSON: { transform(_, ret) { delete ret.__v; return ret; } },
  }
);

// Geospatial index for future nearby-delivery queries
AddressSchema.index({ location: '2dsphere' }, { sparse: true });
AddressSchema.index({ user: 1, isDefault: -1 });

export const Address: Model<IAddress> = mongoose.model<IAddress>('Address', AddressSchema);
