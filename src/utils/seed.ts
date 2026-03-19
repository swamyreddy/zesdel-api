import 'dotenv/config';
import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Coupon } from '../models/Coupon';
import { User } from '../models/User';
import { logger } from './logger';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zesdel';

const seedCategories = async () => {
  await Category.deleteMany({});
  const cats = await Category.insertMany([
    { slug: 'veg',    name: 'Vegetables',    emoji: '🥦', colorIndex: 0, sortOrder: 1 },
    { slug: 'fruit',  name: 'Fruits',        emoji: '🍎', colorIndex: 1, sortOrder: 2 },
    { slug: 'dairy',  name: 'Dairy & Eggs',  emoji: '🥛', colorIndex: 2, sortOrder: 3 },
    { slug: 'bakery', name: 'Bakery',        emoji: '🍞', colorIndex: 3, sortOrder: 4 },
    { slug: 'snacks', name: 'Snacks',        emoji: '🍫', colorIndex: 4, sortOrder: 5 },
    { slug: 'care',   name: 'Personal Care', emoji: '🧴', colorIndex: 5, sortOrder: 6 },
  ]);
  logger.info(`Seeded ${cats.length} categories`);
  return cats;
};

const seedProducts = async (cats: any[]) => {
  await Product.deleteMany({});
  const catMap = Object.fromEntries(cats.map((c) => [c.slug, c._id]));

  const products = [
    { name: 'Organic Carrots',   subtitle: '500g · Farm fresh',     emoji: '🥕', price: 39,  originalPrice: 49,  categorySlug: 'veg',    badge: '20% OFF',    rating: 4.6, reviewCount: 320 },
    { name: 'Red Tomatoes',      subtitle: '1kg · Fresh stock',     emoji: '🍅', price: 45,  categorySlug: 'veg',    rating: 4.3, reviewCount: 210 },
    { name: 'Full Cream Milk',   subtitle: '500ml · Amul',          emoji: '🥛', price: 28,  categorySlug: 'dairy',  badge: 'Best Seller', rating: 4.8, reviewCount: 890 },
    { name: 'Bananas',           subtitle: '6 pcs · Ripe & sweet',  emoji: '🍌', price: 35,  categorySlug: 'fruit',  rating: 4.4, reviewCount: 156 },
    { name: 'Baby Spinach',      subtitle: '250g · Washed',         emoji: '🥬', price: 49,  originalPrice: 59,  categorySlug: 'veg',    badge: '15% OFF',    rating: 4.5, reviewCount: 98 },
    { name: 'Greek Yogurt',      subtitle: '400g · Creamy',         emoji: '🫙', price: 89,  originalPrice: 109, categorySlug: 'dairy',  badge: '18% OFF',    rating: 4.7, reviewCount: 445 },
    { name: 'Green Apples',      subtitle: '1kg · Crisp & fresh',   emoji: '🍏', price: 120, categorySlug: 'fruit',  rating: 4.5, reviewCount: 302 },
    { name: 'Whole Wheat Bread', subtitle: '400g · Freshly baked',  emoji: '🍞', price: 55,  categorySlug: 'bakery', rating: 4.2, reviewCount: 178 },
    { name: 'Dark Chocolate',    subtitle: '100g · 70% cocoa',      emoji: '🍫', price: 99,  originalPrice: 130, categorySlug: 'snacks', badge: '24% OFF',    rating: 4.6, reviewCount: 512 },
    { name: 'Orange Juice',      subtitle: '1L · No added sugar',   emoji: '🍊', price: 79,  categorySlug: 'fruit',  rating: 4.3, reviewCount: 234 },
    { name: 'Cucumber',          subtitle: '2 pcs · Hydrating',     emoji: '🥒', price: 25,  categorySlug: 'veg',    rating: 4.1, reviewCount: 67 },
    { name: 'Eggs (12 pack)',    subtitle: 'Free range · Large',    emoji: '🥚', price: 95,  originalPrice: 110, categorySlug: 'dairy',  rating: 4.7, reviewCount: 620 },
    { name: 'Mango',             subtitle: '2 pcs · Alphonso',      emoji: '🥭', price: 65,  categorySlug: 'fruit',  badge: 'Seasonal',   rating: 4.9, reviewCount: 841 },
    { name: 'Potato Chips',      subtitle: '150g · Salted',         emoji: '🥔', price: 40,  categorySlug: 'snacks', rating: 4.0, reviewCount: 355 },
    { name: 'Hand Wash',         subtitle: '250ml · Antibacterial', emoji: '🧴', price: 59,  originalPrice: 75,  categorySlug: 'care',   badge: '21% OFF',    rating: 4.4, reviewCount: 189 },
  ];

  const docs = products.map((p) => ({
    ...p,
    category: catMap[p.categorySlug],
    tags: [p.categorySlug, p.name.toLowerCase().split(' ')[0]],
  }));

  const created = await Product.insertMany(docs);
  logger.info(`Seeded ${created.length} products`);
};

const seedCoupons = async () => {
  await Coupon.deleteMany({});
  await Coupon.insertMany([
    { code: 'ZESDEL10', description: 'Flat ₹100 off on first order', discountType: 'flat',    discountValue: 100, minOrderValue: 199, perUserLimit: 1 },
    { code: 'FRESH20',  description: '20% off up to ₹150',           discountType: 'percent', discountValue: 20,  maxDiscount: 150,   minOrderValue: 299 },
    { code: 'SAVE50',   description: 'Flat ₹50 off on any order',    discountType: 'flat',    discountValue: 50,  minOrderValue: 149 },
    { code: 'NEWUSER',  description: 'Flat ₹75 off for new users',   discountType: 'flat',    discountValue: 75,  minOrderValue: 99,  perUserLimit: 1 },
  ]);
  logger.info('Seeded 4 coupons');
};

const seedAdmin = async () => {
  await User.deleteOne({ phone: '9999999999' });
  await User.create({ name: 'Admin User', phone: '9999999999', passwordHash: '123456', role: 'admin' });
  logger.info('Seeded admin user  phone:9999999999  pass:123456');
};

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  logger.info('Connected to MongoDB');
  const cats = await seedCategories();
  await seedProducts(cats);
  await seedCoupons();
  await seedAdmin();
  logger.info('✅ Database seeded successfully!');
  process.exit(0);
};

run().catch((err) => { logger.error(err); process.exit(1); });
