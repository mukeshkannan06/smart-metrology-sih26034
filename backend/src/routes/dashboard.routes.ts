import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();

/**
 * @route   GET /api/dashboard/inspector
 * @desc    Get dashboard metrics for authenticated Inspector
 * @access  Private (Inspector only)
 */
router.get(
  '/inspector',
  requireAuth,
  requireRole(UserRole.INSPECTOR),
  DashboardController.getInspectorDashboard
);

/**
 * @route   GET /api/dashboard/controller
 * @desc    Get supervisory dashboard metrics for Assistant Controller
 * @access  Private (Assistant Controller only)
 */
router.get(
  '/controller',
  requireAuth,
  requireRole(UserRole.ASSISTANT_CONTROLLER),
  DashboardController.getControllerDashboard
);

export default router;

