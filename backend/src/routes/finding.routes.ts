import { Router } from 'express';
import { FindingController } from '../controllers/finding.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models';

const router = Router();

// Protect all finding routes with authentication
router.use(requireAuth);

// GET findings for an inspection (Inspectors isolated to own cases, Controllers supervisory view)
router.get('/inspections/:inspectionId', FindingController.getInspectionFindings);

// GET findings for a specific sample
router.get('/samples/:sampleId', FindingController.getSampleFindings);

// GET a single finding by ID
router.get('/:findingId', FindingController.getFindingById);

// POST verify a finding (Restricted to field INSPECTOR role)
router.post(
  '/:findingId/verify',
  requireRole(UserRole.INSPECTOR),
  FindingController.verifyFinding
);

// POST correct a finding's observed value (Restricted to field INSPECTOR role)
router.post(
  '/:findingId/correct',
  requireRole(UserRole.INSPECTOR),
  FindingController.correctFinding
);

export default router;

