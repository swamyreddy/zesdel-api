// ── src/controllers/settings.controller.ts ───────────────────────────────────
// Add these to your existing settings controller or create a new one

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/apiResponse';

// Simple in-memory store (or use MongoDB Settings collection)
// For persistent storage, save to a Settings model in MongoDB
let _instantDeliveryEnabled = true;
let _scheduledSlots = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM'];

// ── GET /api/v1/settings/delivery-mode ───────────────────────────────────────
// Public — Flutter app calls this on startup to check delivery mode
export const getDeliveryMode = asyncHandler(async (req: Request, res: Response) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return sendSuccess(res, {
    instantDelivery: _instantDeliveryEnabled,
    scheduledDate:   dateStr,
    scheduledSlots:  _scheduledSlots,
    message: _instantDeliveryEnabled
      ? 'Delivering in ~10 minutes'
      : 'High demand! Schedule your delivery for tomorrow.',
  });
});

// ── PATCH /api/v1/admin/settings/delivery-mode ────────────────────────────────
// Admin only — toggle instant delivery on/off
export const updateDeliveryMode = asyncHandler(async (req: Request, res: Response) => {
  const { instantDelivery, slots } = req.body as {
    instantDelivery?: boolean;
    slots?: string[];
  };

  if (instantDelivery !== undefined) {
    _instantDeliveryEnabled = instantDelivery;
  }
  if (slots && Array.isArray(slots) && slots.length > 0) {
    _scheduledSlots = slots;
  }

  return sendSuccess(res, {
    instantDelivery: _instantDeliveryEnabled,
    scheduledSlots:  _scheduledSlots,
  }, `Delivery mode updated: ${_instantDeliveryEnabled ? 'Instant' : 'Scheduled'}`);
});
