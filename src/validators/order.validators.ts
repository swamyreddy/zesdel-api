import { body } from 'express-validator';

export const placeOrderValidator = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId')
    .notEmpty().withMessage('productId is required for each item')
    .isMongoId().withMessage('Invalid productId'),
  body('items.*.quantity')
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be between 1 and 50'),
  body('addressId')
    .notEmpty().withMessage('Delivery address is required')
    .isMongoId().withMessage('Invalid addressId'),
  body('paymentMethod')
    .isIn(['upi', 'card', 'cod'])
    .withMessage('paymentMethod must be upi, card or cod'),
  body('couponCode')
    .optional()
    .trim()
    .toUpperCase()
    .isLength({ max: 20 })
    .withMessage('Invalid coupon code'),
];

export const updateOrderStatusValidator = [
  body('status')
    .isIn(['confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
  body('note').optional().trim().isLength({ max: 200 }),
];
