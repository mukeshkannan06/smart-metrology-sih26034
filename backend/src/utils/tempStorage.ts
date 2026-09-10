import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Temporary directory configuration
const UPLOADS_DIR = path.resolve(__dirname, '../../tmp/uploads');

// Ensure upload directory exists synchronously on load
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export interface SavedImageResult {
  imageId: string;
  fileName: string;
  relativeReference: string;
  fullPath: string;
  sizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * Validates image buffer magic bytes against declared MIME type.
 * Rejects corrupt, spoofed, or non-image payloads.
 */
export function validateImageMagicBytes(buffer: Buffer, declaredMimeType: string): boolean {
  if (!buffer || buffer.length < 12) {
    return false;
  }

  const normalizedMime = declaredMimeType.toLowerCase().trim();

  // JPEG: FF D8 FF
  if (normalizedMime === 'image/jpeg' || normalizedMime === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (normalizedMime === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WEBP: 'RIFF' .... 'WEBP'
  if (normalizedMime === 'image/webp') {
    const isRiff =
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

/**
 * Lightweight dimensions parser from raw image header buffers without heavy dependencies.
 */
export function extractDimensions(
  buffer: Buffer,
  mimeType: string
): { width?: number; height?: number } {
  try {
    const norm = mimeType.toLowerCase();
    if (norm === 'image/png' && buffer.length >= 24) {
      // PNG width at offset 16, height at offset 20 (big-endian 32-bit unsigned int)
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }

    if (norm === 'image/webp' && buffer.length >= 30) {
      // VP8 simple lossy format
      if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
        const width = buffer.readUInt16LE(26) & 0x3fff;
        const height = buffer.readUInt16LE(28) & 0x3fff;
        return { width, height };
      }
    }

    // JPEG markers search
    if (norm === 'image/jpeg' || norm === 'image/jpg') {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          // SOF0 or SOF2
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const length = buffer.readUInt16BE(offset + 2);
        offset += 2 + length;
      }
    }
  } catch {
    // Dimension extraction is non-critical telemetry
  }

  return {};
}

/**
 * Parses raw base64 or Data URL string into Buffer, MIME type, and dimensions.
 */
export function parseImagePayload(
  rawInput: string,
  hintMimeType?: string
): { buffer: Buffer; mimeType: string } {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Image data must be provided as a non-empty base64 string or data URL.');
  }

  let mimeType = hintMimeType || 'image/jpeg';
  let base64Content = rawInput.trim();

  // Parse data URL scheme: data:<mime>;base64,<payload>
  const matches = rawInput.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    mimeType = matches[1];
    base64Content = matches[2];
  }

  const normalizedMime = mimeType.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    throw new Error(
      `Unsupported image MIME type '${mimeType}'. Allowed formats: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }

  const buffer = Buffer.from(base64Content, 'base64');

  if (buffer.length === 0) {
    throw new Error('Decoded image payload is empty or invalid base64.');
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Image file size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 15.00 MB.`
    );
  }

  // Validate magic bytes to protect against corrupted or forged image data
  const isValid = validateImageMagicBytes(buffer, normalizedMime);
  if (!isValid) {
    throw new Error(
      `Corrupted or invalid image data: file header magic bytes do not match declared format '${normalizedMime}'.`
    );
  }

  return { buffer, mimeType: normalizedMime };
}

/**
 * Writes an image buffer temporarily to the backend filesystem.
 */
export function saveTemporaryImage(
  buffer: Buffer,
  mimeType: string,
  originalFileName?: string
): SavedImageResult {
  const imageId = crypto.randomUUID();
  const ext = mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg';
  const fileName = `img_${imageId}${ext}`;
  const fullPath = path.join(UPLOADS_DIR, fileName);

  fs.writeFileSync(fullPath, buffer);

  const dimensions = extractDimensions(buffer, mimeType);

  return {
    imageId,
    fileName: originalFileName || fileName,
    relativeReference: fileName,
    fullPath,
    sizeBytes: buffer.length,
    mimeType,
    width: dimensions.width,
    height: dimensions.height,
  };
}

/**
 * Resolves absolute path to a temporary image reference.
 */
export function resolveTemporaryImagePath(relativeReference: string): string | null {
  // Prevent directory traversal attacks
  const safeName = path.basename(relativeReference);
  const fullPath = path.join(UPLOADS_DIR, safeName);
  return fs.existsSync(fullPath) ? fullPath : null;
}

/**
 * Deletes temporary image file from disk.
 */
export function removeTemporaryImage(relativeReference: string): boolean {
  try {
    const safeName = path.basename(relativeReference);
    const fullPath = path.join(UPLOADS_DIR, safeName);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch {
    // Ignore cleanup failure
  }
  return false;
}

