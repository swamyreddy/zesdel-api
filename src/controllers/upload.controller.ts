import { Request, Response } from 'express';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/apiResponse';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import crypto from 'crypto';

// ── S3 Client ─────────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET  = process.env.AWS_S3_BUCKET || 'zesdel.com';
const FOLDER  = 'products';
const CDN_URL = process.env.CDN_URL || `https://${BUCKET}.s3.ap-south-1.amazonaws.com`;

// ── Multer — memory storage (no disk writes) ──────────────────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG and WebP images are allowed'));
  },
});

// ── Helper: upload buffer to S3 ───────────────────────────────────────────────
async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         `${FOLDER}/${filename}`,
    Body:        buffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000', // 1 year cache
  }));
  return `${CDN_URL}/${FOLDER}/${filename}`;
}

// ── POST /api/v1/admin/upload/product-image ───────────────────────────────────
// Accepts: multipart/form-data with field "image"
// Returns: { url, thumbnailUrl }
export const uploadProductImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) return sendError(res, 'No image file provided', 400);

  try {
    const uniqueName = crypto.randomBytes(16).toString('hex');

    // ── Resize to 800x800 webp (main image) ──────────────────────────────────
    const mainBuffer = await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // ── Resize to 200x200 webp (thumbnail) ───────────────────────────────────
    const thumbBuffer = await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    const [url, thumbnailUrl] = await Promise.all([
      uploadToS3(mainBuffer,  `${uniqueName}.webp`,  'image/webp'),
      uploadToS3(thumbBuffer, `${uniqueName}_thumb.webp`, 'image/webp'),
    ]);

    return sendSuccess(res, { url, thumbnailUrl }, 'Image uploaded successfully');
  } catch (err: any) {
    return sendError(res, `Image upload failed: ${err.message}`, 500);
  }
});

// ── DELETE /api/v1/admin/upload/product-image ─────────────────────────────────
// Body: { url: "https://..." }
export const deleteProductImage = asyncHandler(async (req: Request, res: Response) => {
  const { url } = req.body as { url: string };
  if (!url) return sendError(res, 'Image URL is required', 400);

  try {
    // Extract S3 key from URL
    const key = url.replace(`${CDN_URL}/`, '');
    const thumbKey = key.replace('.webp', '_thumb.webp');

    await Promise.all([
      s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })),
      s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: thumbKey })).catch(() => {}),
    ]);

    return sendSuccess(res, null, 'Image deleted');
  } catch (err: any) {
    return sendError(res, `Delete failed: ${err.message}`, 500);
  }
});
