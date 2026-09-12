import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { ReportController } from '../controllers/report.controller';

const router = Router();

// All report endpoints require valid authentication
router.use(requireAuth);

/**
 * @route   GET /api/reports/inspections/:id
 * @desc    Get consolidated inspection report data for ONE complete inspection
 * @access  Private (Owner Inspector or Assistant Controller)
 */
router.get('/inspections/:id', ReportController.getInspectionReportData);

export default router;

