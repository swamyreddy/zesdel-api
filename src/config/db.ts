import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI!;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(uri, {
        maxPoolSize: 10,       // connection pool for concurrency
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.info(`MongoDB connected: ${mongoose.connection.host}`);

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected — attempting reconnect...');
      });
      return;
    } catch (err) {
      attempt++;
      logger.error(`MongoDB connection attempt ${attempt} failed:`, err);
      if (attempt < MAX_RETRIES) {
        logger.info(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  throw new Error('MongoDB connection failed after max retries');
};
