import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { HistoryController } from '../controllers/history.controller';

const router = Router();

// All history endpoints require valid authentication
router.use(requireAuth);

/**
 * @route   GET /api/history/inspections
 * @desc    List historical inspections with filtering, pagination, and KPI metrics
 * @access  Private (Inspectors see own records; Controllers see jurisdiction-wide)
 */
router.get('/inspections', HistoryController.listHistoricalInspections);

/**
 * @route   GET /api/history/inspections/:id
 * @desc    Get complete historical audit record (read-only; preserves 6-pillar integrity)
 * @access  Private (Owner Inspector or Assistant Controller)
 */
router.get('/inspections/:id', HistoryController.getHistoricalInspectionDetail);

/**
 * @route   GET /api/history/inspections/:id/audit-trail
 * @desc    Get chronological audit trail for a specific inspection
 * @access  Private (Owner Inspector or Assistant Controller)
 */
router.get('/inspections/:id/audit-trail', HistoryController.getInspectionAuditTrail);

/**
 * @route   GET /api/history/entities/:entityId/audit-trail
 * @desc    Get chronological audit trail for a specific entity
 * @access  Private (Authenticated users)
 */
router.get('/entities/:entityId/audit-trail', HistoryController.getEntityAuditTrail);

export default router;

