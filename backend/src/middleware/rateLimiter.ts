import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Creates an in-memory sliding window rate limiter middleware.
 * Zero external dependencies (No Redis, No external packages).
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests. Please slow down and try again later.',
    keyGenerator = (req: Request) => {
      // Use client IP or fallback
      const forwarded = req.headers['x-forwarded-for'];
      const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
      return ip;
    },
  } = options;

  const hits = new Map<string, RateLimitEntry>();

  // Periodically cleanup expired buckets every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
      if (entry.timestamps.length === 0) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval so it does not block Node process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = hits.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      hits.set(key, entry);
    }

    // Filter out timestamps outside the active window
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= maxRequests) {
      const oldestHit = entry.timestamps[0];
      const retryAfterSeconds = Math.ceil((oldestHit + windowMs - now) / 1000);

      res.setHeader('Retry-After', String(Math.max(1, retryAfterSeconds)));
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      });
      return;
    }

    entry.timestamps.push(now);
    next();
  };

  middleware.reset = () => {
    hits.clear();
  };

  return middleware;
}

/**
 * Rate Limiter for Authentication:
 * 10 login attempts per 15 minutes per IP address.
 * Prevents credential stuffing and brute-force password guessing.
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
});

/**
 * Rate Limiter for Gemini Multimodal AI Analysis:
 * 20 analysis requests per 10 minutes per inspector.
 * Protects Gemini API quota from runaway loops or abuse.
 */
export const aiRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  message: 'AI package declaration analysis quota limit reached. Please wait a few minutes before analyzing additional packages.',
  keyGenerator: (req: Request) => {
    const userId = req.user?.id || req.user?.inspectorId;
    if (userId) return `ai:${userId}`;
    const forwarded = req.headers['x-forwarded-for'];
    return `ai:${typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || 'unknown'}`;
  },
});

/**
 * Rate Limiter for Package Photo Uploads:
 * 30 photo uploads per 10 minutes per inspector.
 * Mitigates denial-of-service via large payload flooding.
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: 'Image upload rate limit reached. Please wait a moment before uploading more package photos.',
  keyGenerator: (req: Request) => {
    const userId = req.user?.id || req.user?.inspectorId;
    if (userId) return `upload:${userId}`;
    const forwarded = req.headers['x-forwarded-for'];
    return `upload:${typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || 'unknown'}`;
  },
});

