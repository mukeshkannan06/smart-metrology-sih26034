import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models';

import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public Authentication Endpoints (Rate limited against brute force)
router.post('/login', authRateLimiter, AuthController.login);
router.post('/logout', AuthController.logout);

// Protected Authentication Verification Endpoint
router.get('/me', requireAuth, AuthController.getMe);

// Role-Based Authorization Testing Endpoints
router.get('/test/inspector-only', requireAuth, requireRole(UserRole.INSPECTOR), AuthController.testInspectorOnly);
router.get('/test/controller-only', requireAuth, requireRole(UserRole.ASSISTANT_CONTROLLER), AuthController.testControllerOnly);

export default router;

