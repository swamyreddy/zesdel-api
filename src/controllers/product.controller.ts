import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// GET /api/products
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    search, category, minPrice, maxPrice, minRating,
    onSale, inStock, sort = 'relevance',
    page = '1', limit = '20',
  } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = {};

  // Partial/prefix search using regex — works without text index
  // Searches name, description and tags fields case-insensitively
  if (search) {
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name:        { $regex: escapedSearch, $options: 'i' } },
      { description: { $regex: escapedSearch, $options: 'i' } },
      { tags:        { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  // Category filter
  if (category) filter.categorySlug = category;

  // Price range
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) (filter.price as Record<string, number>).$gte = parseFloat(minPrice);
    if (maxPrice) (filter.price as Record<string, number>).$lte = parseFloat(maxPrice);
  }

  // Rating filter
  if (minRating) filter.rating = { $gte: parseFloat(minRating) };

  // On sale (has originalPrice greater than price)
  if (onSale === 'true') filter.originalPrice = { $exists: true, $gt: '$price' };

  // Stock / availability
  if (inStock === 'true') filter.isAvailable = true;
  else filter.isAvailable = { $ne: false };

  // Sort mapping
  const sortMap: Record<string, Record<string, 1 | -1>> = {
    relevance:  { createdAt: -1 },
    priceAsc:   { price: 1 },
    priceDesc:  { price: -1 },
    rating:     { rating: -1 },
    discount:   { originalPrice: -1 },
  };
  const sortObj = sortMap[sort] || sortMap.relevance;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .populate('category', 'name emoji slug'),
    Product.countDocuments(filter),
  ]);

  return sendSuccess(res, products, 'Products fetched', 200, {
    total, page: pageNum, limit: limitNum,
    pages: Math.ceil(total / limitNum),
  });
});

// GET /api/products/:id
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id).populate('category', 'name emoji slug');
  if (!product) throw new AppError('Product not found', 404);
  return sendSuccess(res, product);
});

// GET /api/products/featured
export const getFeaturedProducts = asyncHandler(async (_req: Request, res: Response) => {
  const featured = await Product.find({ isAvailable: true, badge: { $exists: true } })
    .sort({ rating: -1 })
    .limit(10)
    .populate('category', 'name emoji');
  return sendSuccess(res, featured, 'Featured products');
});

// Admin: POST /api/products
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  // Accept either categorySlug (from admin panel) or category _id
  const slug = req.body.categorySlug || req.body.category;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(slug || '');
  const category = await Category.findOne(isObjectId ? { _id: slug } : { slug });
  if (!category) throw new AppError('Category not found', 404);

  const product = await Product.create({
    ...req.body,
    category:     category._id,
    categorySlug: category.slug,
  });
  return sendSuccess(res, product, 'Product created', 201);
});

// Admin: PATCH /api/products/:id
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const slug = req.body.categorySlug || req.body.category;
  if (slug) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(slug);
    const cat = await Category.findOne(isObjectId ? { _id: slug } : { slug });
    if (!cat) throw new AppError('Category not found', 404);
    req.body.category     = cat._id;
    req.body.categorySlug = cat.slug;
  }
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) throw new AppError('Product not found', 404);
  return sendSuccess(res, product, 'Product updated');
});

// Admin: DELETE /api/products/:id
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  return sendSuccess(res, null, 'Product deleted');
});

// GET /api/categories
export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
  // Attach item counts
  const withCounts = await Promise.all(
    categories.map(async (cat) => ({
      ...cat.toJSON(),
      itemCount: await Product.countDocuments({ categorySlug: cat.slug, isAvailable: true }),
    }))
  );
  return sendSuccess(res, withCounts, 'Categories fetched');
});
