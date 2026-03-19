import { Types } from 'mongoose';
import { Order, IOrder, OrderStatus } from '../models/Order';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import { Address } from '../models/Address';
import { AppError } from '../middleware/errorHandler';

const FREE_DELIVERY_THRESHOLD = 299;
const DELIVERY_FEE = 29;

// ── Delivery zone config — add more pincodes as you expand ──────────────────
const ALLOWED_PINCODES = ['502032'];
const DELIVERY_AREA_NAME = 'Ameenpur';

interface CartItem { productId: string; quantity: number }

interface PlaceOrderInput {
  userId: Types.ObjectId;
  items: CartItem[];
  addressId: string;
  couponCode?: string;
  paymentMethod: 'upi' | 'card' | 'cod';
  razorpayPaymentId?: string;
}

export const placeOrder = async (input: PlaceOrderInput): Promise<IOrder> => {
  const { userId, items, addressId, couponCode, paymentMethod, razorpayPaymentId } = input;

  // 1. Validate & fetch products (single $in query)
  const productIds = items.map((i) => new Types.ObjectId(i.productId));
  const products = await Product.find({ _id: { $in: productIds }, isAvailable: true });

  if (products.length !== items.length) {
    throw new AppError('One or more products are unavailable', 400);
  }

  // 2. Build order items with price snapshot
  const orderItems = items.map((item) => {
    const product = products.find((p) => p._id.toString() === item.productId)!;
    return {
      product: product._id,
      productName: product.name,
      emoji: product.emoji,
      price: product.price,
      quantity: item.quantity,
      subtotal: product.price * item.quantity,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);

  // 3. Apply coupon if provided
  let discount = 0;
  let validCouponCode: string | undefined;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!coupon) throw new AppError('Invalid or expired coupon', 400);
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('Coupon expired', 400);
    if (coupon.usageLimit !== -1 && coupon.usageCount >= coupon.usageLimit) {
      throw new AppError('Coupon usage limit reached', 400);
    }
    discount = coupon.computeDiscount(subtotal);
    validCouponCode = coupon.code;
    await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usageCount: 1 } });
  }

  // 4. Delivery fee
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  // 5. Fetch & snapshot address
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) throw new AppError('Address not found', 404);

  // Delivery zone check
  if (!ALLOWED_PINCODES.includes(address.pincode)) {
    throw new AppError(
      `We currently deliver only in ${DELIVERY_AREA_NAME} (${ALLOWED_PINCODES.join(', ')}). We're expanding soon!`,
      400
    );
  }

  const addressSnapshot = {
    label: address.label,
    name: address.name,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    pincode: address.pincode,
    state: address.state,
    coordinates: address.location?.coordinates,
  };

  // 6. Create order — paymentStatus depends on method
  // COD → pending until delivery
  // Razorpay (UPI/card) → paid if paymentId present, else pending
  const paymentStatus =
    paymentMethod === 'cod'              ? 'pending' :
    razorpayPaymentId                    ? 'paid'    : 'pending';

  const order = await Order.create({
    user: userId,
    items: orderItems,
    address: addressSnapshot,
    subtotal,
    deliveryFee,
    discount,
    total,
    couponCode: validCouponCode,
    paymentMethod,
    paymentStatus,
    ...(razorpayPaymentId && { razorpayPaymentId }),
    status: 'placed',
  });

  return order;
};

export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<IOrder> => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found', 404);

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    placed:           ['confirmed', 'cancelled'],
    confirmed:        ['out_for_delivery', 'cancelled'],
    out_for_delivery: ['delivered'],
    delivered:        [],
    cancelled:        [],
  };

  if (!validTransitions[order.status].includes(status)) {
    throw new AppError(`Cannot transition from ${order.status} to ${status}`, 400);
  }

  order.status = status;
  order.statusHistory.push({ status, timestamp: new Date(), note });
  if (status === 'delivered') order.deliveredAt = new Date();

  return order.save();
};
