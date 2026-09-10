import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '../models/User';
import { RuleController } from '../controllers/rule.controller';

const router = Router();

// Authentication required for all rule endpoints
router.use(requireAuth);

/**
 * @route   GET /api/rules
 * @desc    List rules with filters for status, family, context, and search
 * @access  Private (Inspectors and Assistant Controllers)
 */
router.get('/', RuleController.listRules);

/**
 * @route   GET /api/rules/summary/statistics
 * @desc    Get aggregated statistical metrics for the Rule Database
 * @access  Private (Inspectors and Assistant Controllers)
 */
router.get('/summary/statistics', RuleController.getStatistics);

/**
 * @route   GET /api/rules/validation/consistency
 * @desc    Verify JSON vs CSV consistency and integrity
 * @access  Private (Inspectors and Assistant Controllers)
 */
router.get('/validation/consistency', RuleController.getConsistencyReport);

/**
 * @route   GET /api/rules/:ruleId
 * @desc    Get complete metadata for a specific statutory rule
 * @access  Private (Inspectors and Assistant Controllers)
 */
router.get('/:ruleId', RuleController.getRuleById);

/**
 * @route   PATCH /api/rules/:ruleId/status
 * @desc    Update rule operational status
 * @access  Private (Assistant Controller only)
 */
router.patch(
  '/:ruleId/status',
  requireRole(UserRole.ASSISTANT_CONTROLLER),
  RuleController.updateRuleStatus
);

export default router;

