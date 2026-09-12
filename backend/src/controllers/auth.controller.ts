import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, UserStatus } from '../models';

export class AuthController {
  /**
   * POST /api/auth/login
   * Authenticates demo user using username & password, sets HTTP-only cookie, returns safe user.
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Username and password are required.',
        });
        return;
      }

      const normalizedUsername = username.trim().toLowerCase();

      // Find user and explicitly select passwordHash (which is excluded by default)
      const user = await User.findOne({ username: normalizedUsername }).select('+passwordHash');

      if (!user || user.status !== UserStatus.ACTIVE) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid username or password.',
        });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid username or password.',
        });
        return;
      }

      // Generate signed JWT
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          role: user.role,
        },
        config.jwtSecret,
        {
          expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
        }
      );

      // Set secure HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: config.isProduction ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        user: {
          id: user._id.toString(),
          username: user.username,
          name: user.name,
          role: user.role,
          inspectorId: user.inspectorId,
          isDemo: user.isDemo,
        },
        token, // Provided for non-cookie HTTP client flexibility
      });
    } catch (error) {
      console.error('[AUTH_CONTROLLER] Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'An error occurred during authentication.',
      });
    }
  }

  /**
   * POST /api/auth/logout
   * Revokes the current session by clearing the HTTP-only cookie.
   */
  public static logout(_req: Request, res: Response): void {
    res.clearCookie('token', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  }

  /**
   * GET /api/auth/me
   * Returns current authenticated user context.
   */
  public static getMe(req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  }

  /**
   * GET /api/auth/test/inspector-only
   * Protected endpoint used for automated RBAC testing.
   */
  public static testInspectorOnly(req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      message: 'Inspector-only authorized endpoint reached successfully.',
      user: req.user,
    });
  }

  /**
   * GET /api/auth/test/controller-only
   * Protected endpoint used for automated RBAC testing.
   */
  public static testControllerOnly(req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      message: 'Assistant Controller authorized endpoint reached successfully.',
      user: req.user,
    });
  }
}

