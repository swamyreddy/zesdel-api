import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { Order }    from '../models/Order';
import { Product }  from '../models/Product';
import { User }     from '../models/User';
import { Category } from '../models/Category';

// ── Dashboard Stats ────────────────────────────────────────────────────────
export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
  const now   = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  const prev  = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalOrders, monthOrders, prevMonthOrders,
    totalUsers,  monthUsers,  prevMonthUsers,
    totalProducts, activeProducts,
    revenueAgg, prevRevenueAgg,
    pendingOrders, deliveredToday, cancelledOrders,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: month } }),
    Order.countDocuments({ createdAt: { $gte: prev, $lt: month } }),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: month } }),
    User.countDocuments({ role: 'customer', createdAt: { $gte: prev, $lt: month } }),
    Product.countDocuments(),
    Product.countDocuments({ isAvailable: true }),
    Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { createdAt: { $gte: prev, $lt: month }, status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.countDocuments({ status: { $in: ['placed', 'confirmed'] } }),
    Order.countDocuments({ status: 'delivered', updatedAt: { $gte: new Date(now.toDateString()) } }),
    Order.countDocuments({ status: 'cancelled' }),
  ]);

  const totalRevenue  = revenueAgg[0]?.total ?? 0;
  const prevRevenue   = prevRevenueAgg[0]?.total ?? 0;
  const avgOrderValue = revenueAgg[0]?.count ? totalRevenue / revenueAgg[0].count : 0;
  const revenueGrowth = prevRevenue     ? +(((totalRevenue - prevRevenue)     / prevRevenue)     * 100).toFixed(1) : 0;
  const ordersGrowth  = prevMonthOrders ? +(((monthOrders  - prevMonthOrders) / prevMonthOrders) * 100).toFixed(1) : 0;
  const usersGrowth   = prevMonthUsers  ? +(((monthUsers   - prevMonthUsers)  / prevMonthUsers)  * 100).toFixed(1) : 0;

  return sendSuccess(res, {
    totalRevenue, revenueGrowth,
    totalOrders,  ordersGrowth,
    totalUsers,   usersGrowth,
    totalProducts, activeProducts,
    avgOrderValue: +avgOrderValue.toFixed(0),
    pendingOrders, deliveredToday, cancelledOrders,
  });
});

// ── Revenue Chart ──────────────────────────────────────────────────────────
export const getRevenueChart = asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as string) || '30d';
  const days   = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const from   = new Date();
  from.setDate(from.getDate() - days);

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: from }, status: { $ne: 'cancelled' } } },
    { $group: {
        _id:     { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$total' },
        orders:  { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]);

  // Fill missing dates so chart has no gaps
  const map = new Map(rows.map(r => [r._id, r]));
  const data = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().split('T')[0];
    data.push({ date: key, revenue: map.get(key)?.revenue ?? 0, orders: map.get(key)?.orders ?? 0 });
  }

  return sendSuccess(res, data);
});

// ── Category Sales ─────────────────────────────────────────────────────────
export const getCategorySales = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await Order.aggregate([
    { $unwind: '$items' },
    { $lookup: { from: 'products', localField: 'items.product', foreignField: '_id', as: 'prod' } },
    { $unwind: { path: '$prod', preserveNullAndEmptyArrays: true } },
    { $group: {
        _id:     '$prod.categorySlug',
        sales:   { $sum: '$items.quantity' },
        revenue: { $sum: '$items.subtotal' },
    }},
    { $sort: { revenue: -1 } },
    { $limit: 8 },
  ]);

  const categories = await Category.find({}, 'slug name emoji');
  const catMap = new Map(categories.map(c => [c.slug, c]));
  const total  = rows.reduce((s, r) => s + r.revenue, 0) || 1;

  const data = rows.map(r => ({
    category: catMap.get(r._id)?.name  ?? r._id ?? 'Other',
    emoji:    catMap.get(r._id)?.emoji ?? '📦',
    sales:    r.sales,
    revenue:  r.revenue,
    percent:  +(r.revenue / total * 100).toFixed(1),
  }));

  return sendSuccess(res, data);
});

// ── Users List ─────────────────────────────────────────────────────────────
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page  = Number(req.query.page)  || 1;
  const limit = Number(req.query.limit) || 50;
  const sort  = (req.query.sort as string) || '-createdAt';

  const query: any = {};
  if (req.query.search) {
    const s = req.query.search as string;
    query.$or = [{ name: new RegExp(s, 'i') }, { phone: new RegExp(s) }];
  }

  const [users, total] = await Promise.all([
    User.find(query, '-password -refreshTokens').sort(sort).skip((page - 1) * limit).limit(limit),
    User.countDocuments(query),
  ]);

  return sendSuccess(res, users, 'Users fetched', 200, {
    total, page, limit, pages: Math.ceil(total / limit),
  });
});

// ── Toggle User Status ─────────────────────────────────────────────────────
export const toggleUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) return sendError(res, 'User not found', 404);
  user.isActive = !user.isActive;
  await user.save();
  const u = user.toObject() as any;
  delete u.password;
  delete u.refreshTokens;
  return sendSuccess(res, u, `User ${user.isActive ? 'activated' : 'deactivated'}`);
});

// ── Category CRUD (admin) ─────────────────────────────────────────────────
export const adminCreateCategory = asyncHandler(async (req: Request, res: Response) => {
  const cat = await Category.create(req.body);
  return sendSuccess(res, cat, 'Category created', 201);
});

export const adminUpdateCategory = asyncHandler(async (req: Request, res: Response) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!cat) return sendError(res, 'Category not found', 404);
  return sendSuccess(res, cat, 'Category updated');
});

export const adminDeleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) return sendError(res, 'Category not found', 404);
  return sendSuccess(res, null, 'Category deleted');
});
