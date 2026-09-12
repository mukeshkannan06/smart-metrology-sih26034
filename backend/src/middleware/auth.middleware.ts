import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, UserRole, UserStatus } from '../models';

export interface AuthenticatedUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  inspectorId?: string;
  isDemo: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

interface CachedUserEntry {
  user: AuthenticatedUser;
  expiresAt: number;
}

const authUserCache = new Map<string, CachedUserEntry>();

export const clearAuthUserCache = (userId?: string): void => {
  if (userId) {
    authUserCache.delete(userId);
  } else {
    authUserCache.clear();
  }
};

/**
 * Authentication Middleware: Validates JWT from HTTP-only cookie or Authorization header.
 * Rejects unauthenticated requests with HTTP 401.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract token from HTTP-only cookie or Bearer Authorization header
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Please log in.',
      });
      return;
    }

    // 2. Verify JWT signature
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    } catch {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired authentication session. Please log in again.',
      });
      return;
    }

    // 3. Find user and verify active status (with fast 60s memory cache to avoid redundant cloud DB round-trips)
    const now = Date.now();
    const cached = authUserCache.get(decoded.userId);
    if (cached && now < cached.expiresAt) {
      req.user = cached.user;
      next();
      return;
    }

    const user = await User.findById(decoded.userId);

    if (!user || user.status !== UserStatus.ACTIVE) {
      authUserCache.delete(decoded.userId);
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Account not found or has been deactivated.',
      });
      return;
    }

    // 4. Attach safe user context to request and cache for 60s
    req.user = {
      id: user._id.toString(),
      username: user.username,
      name: user.name,
      role: user.role,
      inspectorId: user.inspectorId,
      isDemo: user.isDemo,
    };
    authUserCache.set(decoded.userId, {
      user: req.user,
      expiresAt: now + 60 * 1000,
    });

    next();
  } catch (error) {
    console.error('[AUTH_MIDDLEWARE] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to authenticate request.',
    });
  }
};

/**
 * Role Authorization Middleware: Verifies authenticated user has one of the required roles.
 * Rejects unauthorized requests with HTTP 403.
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Access denied: insufficient permissions.',
      });
      return;
    }

    next();
  };
};

