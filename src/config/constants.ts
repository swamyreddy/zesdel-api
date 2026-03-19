export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const ADDRESS_LABELS = ['Home', 'Work', 'Other'] as const;
export type AddressLabel = typeof ADDRESS_LABELS[number];

export const SORT_OPTIONS = ['relevance', 'price_asc', 'price_desc', 'rating', 'discount'] as const;
export type SortOption = typeof SORT_OPTIONS[number];

export const CATEGORY_IDS = ['veg', 'fruit', 'dairy', 'bakery', 'snacks', 'care'] as const;
export type CategoryId = typeof CATEGORY_IDS[number];

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  SERVER_ERROR: 500,
} as const;

export const FREE_DELIVERY_THRESHOLD = Number(process.env.FREE_DELIVERY_THRESHOLD) || 299;
export const DELIVERY_FEE = Number(process.env.DELIVERY_FEE) || 29;
export const MAX_COUPON_DISCOUNT_PERCENT = 150; // max ₹150 on % coupons
