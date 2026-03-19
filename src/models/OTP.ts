import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  phone:     string;
  otpHash:   string;
  purpose:   'login' | 'register' | 'forgot_password';
  attempts:  number;
  expiresAt: Date;
  usedAt?:   Date;
}

const OTPSchema = new Schema<IOTP>({
  phone:     { type: String, required: true, index: true },
  otpHash:   { type: String, required: true },
  purpose:   { type: String, enum: ['login', 'register', 'forgot_password'], required: true },
  attempts:  { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  usedAt:    { type: Date },
});

// MongoDB TTL — auto-deletes expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OTPSchema.index({ phone: 1, purpose: 1 });

export const OTP = mongoose.model<IOTP>('OTP', OTPSchema);
