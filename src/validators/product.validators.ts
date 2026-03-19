import { query } from 'express-validator';
import { CATEGORY_IDS, SORT_OPTIONS } from '../config/constants';

export const productListValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be 1–50').toInt(),
  query('category')
    .optional()
    .isIn(CATEGORY_IDS)
    .withMessage(`category must be one of: ${CATEGORY_IDS.join(', ')}`),
  query('sort')
    .optional()
    .isIn(SORT_OPTIONS)
    .withMessage(`sort must be one of: ${SORT_OPTIONS.join(', ')}`),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be >= 0').toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be >= 0').toFloat(),
  query('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('minRating must be 0–5').toFloat(),
  query('onSale').optional().isBoolean().withMessage('onSale must be true or false').toBoolean(),
  query('inStock').optional().isBoolean().withMessage('inStock must be true or false').toBoolean(),
  query('q').optional().trim().isLength({ max: 100 }).withMessage('Search query too long'),
];
