import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { placeOrder, updateOrderStatus } from '../services/order.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// POST /api/orders
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { items, addressId, couponCode, paymentMethod, razorpayPaymentId } = req.body;
  const order = await placeOrder({
    userId: req.user!._id,
    items,
    addressId,
    couponCode,
    paymentMethod,
    razorpayPaymentId,
  });
  return sendCreated(res, order, 'Order placed successfully');
});

// GET /api/orders — paginated list for authenticated user
export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', limit = '10' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = { user: req.user!._id };
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(20, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, orders, 'Orders fetched', 200, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// GET /api/orders/:id
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user!._id });
  if (!order) throw new AppError('Order not found', 404);
  return sendSuccess(res, order);
});

// POST /api/orders/:id/cancel
export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user!._id });
  if (!order) throw new AppError('Order not found', 404);
  if (!['placed', 'confirmed'].includes(order.status)) {
    throw new AppError('Order cannot be cancelled at this stage', 400);
  }
  const updated = await updateOrderStatus(order._id.toString(), 'cancelled', req.body.reason);
  return sendSuccess(res, updated, 'Order cancelled');
});

// Admin: PATCH /api/admin/orders/:id/status
export const adminUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status, note } = req.body;
  const order = await updateOrderStatus(req.params.id, status, note);
  return sendSuccess(res, order, 'Order status updated');
});

// Admin: GET /api/admin/orders
export const adminListOrders = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, orders, 'Orders fetched', 200, {
    total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum),
  });
});

// Admin: GET /api/admin/orders/:id
export const adminGetOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await Order.findById(req.params.id).populate('user', 'name phone');
  if (!order) throw new AppError('Order not found', 404);
  return sendSuccess(res, order);
});
