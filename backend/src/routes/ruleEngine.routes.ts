import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { RuleController } from '../controllers/rule.controller';

const router = Router();

router.use(requireAuth);

/**
 * @route   POST /api/rule-engine/evaluate/:sampleId
 * @desc    Run deterministic rule engine evaluation on a package sample
 * @access  Private (Inspector only)
 */
router.post(
  '/evaluate/:sampleId',
  requireRole(UserRole.INSPECTOR),
  RuleController.evaluateSample
);

/**
 * @route   GET /api/rule-engine/samples/:sampleId/evaluations
 * @desc    Get rule evaluation history for a sample
 * @access  Private (Inspector and Assistant Controller)
 */
router.get(
  '/samples/:sampleId/evaluations',
  RuleController.getSampleEvaluations
);

export default router;

