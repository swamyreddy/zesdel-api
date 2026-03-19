import { Request, Response } from 'express';
import { Address } from '../models/Address';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// GET /api/addresses
export const listAddresses = asyncHandler(async (req: Request, res: Response) => {
  const addresses = await Address.find({ user: req.user!._id }).sort({ isDefault: -1, createdAt: -1 });
  return sendSuccess(res, addresses);
});

// POST /api/addresses
export const createAddress = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, isDefault, ...rest } = req.body;

  // If marking as default, unset all others first
  if (isDefault) {
    await Address.updateMany({ user: req.user!._id }, { isDefault: false });
  }

  // Check: if this is the first address, make it default automatically
  const count = await Address.countDocuments({ user: req.user!._id });

  const addressData: Record<string, unknown> = {
    ...rest,
    user: req.user!._id,
    isDefault: isDefault || count === 0,
  };

  if (latitude && longitude) {
    addressData.location = { type: 'Point', coordinates: [longitude, latitude] };
  }

  const address = await Address.create(addressData);
  return sendCreated(res, address, 'Address added');
});

// PATCH /api/addresses/:id
export const updateAddress = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, isDefault, ...rest } = req.body;

  const address = await Address.findOne({ _id: req.params.id, user: req.user!._id });
  if (!address) throw new AppError('Address not found', 404);

  if (isDefault) {
    await Address.updateMany({ user: req.user!._id }, { isDefault: false });
  }

  Object.assign(address, rest);
  if (typeof isDefault === 'boolean') address.isDefault = isDefault;
  if (latitude && longitude) {
    address.location = { type: 'Point', coordinates: [longitude, latitude] };
  }

  await address.save();
  return sendSuccess(res, address, 'Address updated');
});

// DELETE /api/addresses/:id
export const deleteAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user!._id });
  if (!address) throw new AppError('Address not found', 404);

  // If deleted address was default, promote most recent
  if (address.isDefault) {
    const next = await Address.findOne({ user: req.user!._id }).sort({ createdAt: -1 });
    if (next) { next.isDefault = true; await next.save(); }
  }

  return sendSuccess(res, null, 'Address deleted');
});

// PATCH /api/addresses/:id/set-default
export const setDefaultAddress = asyncHandler(async (req: Request, res: Response) => {
  const address = await Address.findOne({ _id: req.params.id, user: req.user!._id });
  if (!address) throw new AppError('Address not found', 404);

  await Address.updateMany({ user: req.user!._id }, { isDefault: false });
  address.isDefault = true;
  await address.save();

  return sendSuccess(res, address, 'Default address updated');
});
