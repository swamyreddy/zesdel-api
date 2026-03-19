import mongoose, { Document, Schema, Model } from 'mongoose';

export type OrderStatus = 'placed' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'cancelled';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  productName: string;   // snapshot at time of order
  emoji: string;
  price: number;         // price at time of order
  quantity: number;
  subtotal: number;
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: string;       // human-readable e.g. ZD-20240101-0001
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  address: {             // snapshot so it persists even if user deletes address
    label: string;
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    pincode: string;
    state: string;
    coordinates?: [number, number];
  };
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  couponCode?: string;
  paymentMethod: 'upi' | 'card' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: OrderStatus;
  statusHistory: { status: OrderStatus; timestamp: Date; note?: string }[];
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product:     { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    emoji:       { type: String, required: true },
    price:       { type: Number, required: true, min: 0 },
    quantity:    { type: Number, required: true, min: 1 },
    subtotal:    { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId:       { type: String, unique: true, index: true },
    user:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items:         { type: [OrderItemSchema], required: true },
    address: {
      label:       String,
      name:        { type: String, required: true },
      phone:       { type: String, required: true },
      line1:       { type: String, required: true },
      line2:       String,
      city:        { type: String, required: true },
      pincode:     { type: String, required: true },
      state:       String,
      coordinates: [Number],
    },
    subtotal:           { type: Number, required: true, min: 0 },
    deliveryFee:        { type: Number, default: 0, min: 0 },
    discount:           { type: Number, default: 0, min: 0 },
    total:              { type: Number, required: true, min: 0 },
    couponCode:         { type: String, uppercase: true },
    paymentMethod:      { type: String, enum: ['upi', 'card', 'cod'], required: true },
    paymentStatus:      { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    razorpayOrderId:    { type: String, index: true },
    razorpayPaymentId:  { type: String, index: true },
    status:             { type: String, enum: ['placed', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'], default: 'placed', index: true },
    statusHistory:      [{
      status:    { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      note:      String,
      _id: false,
    }],
    estimatedDelivery:  { type: Date },
    deliveredAt:        { type: Date },
    cancellationReason: { type: String },
  },
  {
    timestamps: true,
    toJSON: { transform(_, ret) { ret.__v = undefined; return ret; } },
  }
);

// Auto-generate human-readable orderId before saving
OrderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Order').countDocuments();
    this.orderId = `ZD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    // Add initial status history entry
    this.statusHistory = [{ status: this.status, timestamp: new Date() }];
    // Estimate 10-min delivery
    this.estimatedDelivery = new Date(Date.now() + 10 * 60 * 1000);
  }
  next();
});

// Compound indexes for order listing queries
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ user: 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });

export const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema);
