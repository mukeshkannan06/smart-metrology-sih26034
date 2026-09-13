import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models';
import { InspectionController } from '../controllers/inspection.controller';
import sampleRoutes from './sample.routes';

const router = Router();

// Require valid authentication for all inspection endpoints
router.use(requireAuth);

/**
 * @route   POST /api/inspections
 * @desc    Initiate a new inspection workflow
 * @access  Private (Inspector only; Assistant Controller gets 403)
 */
router.post('/', requireRole(UserRole.INSPECTOR), InspectionController.createInspection);

/**
 * @route   GET /api/inspections
 * @desc    List inspections (Inspectors see only their own; Controllers see all)
 * @access  Private (Authenticated users)
 */
router.get('/', InspectionController.listInspections);

/**
 * @route   GET /api/inspections/:id
 * @desc    Get inspection details by ID or inspectionNumber (with ownership check)
 * @access  Private (Owner Inspector or Assistant Controller)
 */
router.get('/:id', InspectionController.getInspectionById);

/**
 * @route   PATCH /api/inspections/:id/finalize
 * @desc    Formally finalize and seal an inspection case with status COMPLETED
 * @access  Private (Owner Inspector only; Controller gets 403)
 */
router.patch('/:id/finalize', requireRole(UserRole.INSPECTOR), InspectionController.finalizeInspection);

// Mount Sample sub-routes under /:inspectionId/samples
router.use('/:inspectionId/samples', sampleRoutes);

export default router;

