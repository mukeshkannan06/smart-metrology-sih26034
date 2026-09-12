import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

// All analytics routes require authenticated Assistant Controller of Legal Metrology role
router.use(requireAuth, requireRole(UserRole.ASSISTANT_CONTROLLER));

/**
 * @route   GET /api/analytics/overview
 * @desc    Get supervisory overview analytics, KPIs, trends, and charts
 * @access  Private (Assistant Controller only)
 */
router.get('/overview', AnalyticsController.getOverview);

/**
 * @route   GET /api/analytics/inspectors
 * @desc    Get active field inspectors and their performance metrics
 * @access  Private (Assistant Controller only)
 */
router.get('/inspectors', AnalyticsController.getInspectors);

/**
 * @route   GET /api/analytics/violations
 * @desc    Get supervisory violations and observations across jurisdiction
 * @access  Private (Assistant Controller only)
 */
router.get('/violations', AnalyticsController.getViolations);

/**
 * @route   GET /api/analytics/inspections
 * @desc    Get paginated, sorted, and searchable monitored inspections
 * @access  Private (Assistant Controller only)
 */
router.get('/inspections', AnalyticsController.getInspections);

export default router;

