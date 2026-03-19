import { Request, Response } from 'express';
import { Coupon } from '../models/Coupon';
import { Order } from '../models/Order';
import { sendSuccess } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// POST /api/coupons/validate
export const validateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
  if (!coupon) throw new AppError('Invalid coupon code', 404);
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('Coupon has expired', 400);
  if (coupon.usageLimit !== -1 && coupon.usageCount >= coupon.usageLimit) {
    throw new AppError('Coupon usage limit reached', 400);
  }
  if (subtotal < coupon.minOrderValue) {
    throw new AppError(`Minimum order value ₹${coupon.minOrderValue} required`, 400);
  }

  // Per-user limit check
  if (coupon.perUserLimit > 0) {
    const usedCount = await Order.countDocuments({ user: req.user!._id, couponCode: coupon.code });
    if (usedCount >= coupon.perUserLimit) throw new AppError('You have already used this coupon', 400);
  }

  const discount = coupon.computeDiscount(subtotal);
  return sendSuccess(res, {
    code: coupon.code,
    description: coupon.description,
    discount,
    discountType: coupon.discountType,
  }, 'Coupon applied successfully');
});

// GET /api/coupons — list active coupons (for display)
export const listCoupons = asyncHandler(async (_req: Request, res: Response) => {
  const coupons = await Coupon.find({
    isActive: true,
    $or: [{ expiresAt: { $gt: new Date() } }, { expiresAt: { $exists: false } }],
  }).select('-usageCount -usageLimit -perUserLimit');
  return sendSuccess(res, coupons);
});

// Admin CRUD
export const createCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.create(req.body);
  return sendSuccess(res, coupon, 'Coupon created', 201);
});

export const updateCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!coupon) throw new AppError('Coupon not found', 404);
  return sendSuccess(res, coupon, 'Coupon updated');
});

export const deleteCoupon = asyncHandler(async (req: Request, res: Response) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw new AppError('Coupon not found', 404);
  return sendSuccess(res, null, 'Coupon deleted');
});
