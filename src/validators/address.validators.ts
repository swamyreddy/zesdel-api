import { body } from 'express-validator';
import { ADDRESS_LABELS } from '../config/constants';

export const addressValidator = [
  body('label')
    .isIn(ADDRESS_LABELS)
    .withMessage(`label must be one of: ${ADDRESS_LABELS.join(', ')}`),
  body('name').trim().notEmpty().withMessage('Recipient name is required'),
  body('phone')
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage('Enter a valid 10-digit mobile number'),
  body('line1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be 6 digits'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
];
