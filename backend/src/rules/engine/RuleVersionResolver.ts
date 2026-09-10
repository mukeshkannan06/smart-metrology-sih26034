import { IRule, RuleOperationalStatus } from '../../models/Rule';

export interface VersionResolutionResult {
  isApplicableByVersion: boolean;
  requiresInspectorReview: boolean;
  isHistoricalGuard?: boolean;
  reason: string;
}

export class RuleVersionResolver {
  /**
   * Evaluates temporal validity of a rule against the inspection date.
   * Ensures future-effective rules do not penalize current inspections,
   * expired rules are not enforced, and historical guards are respected.
   */
  public static resolve(rule: IRule, inspectionDate: Date = new Date()): VersionResolutionResult {
    const inspTime = inspectionDate.getTime();

    // 1. Future rule check
    if (rule.rule_status === RuleOperationalStatus.FUTURE) {
      if (rule.effective_from && rule.effective_from.getTime() > inspTime) {
        const effDateStr = rule.effective_from.toISOString().split('T')[0];
        const inspDateStr = inspectionDate.toISOString().split('T')[0];
        return {
          isApplicableByVersion: false,
          requiresInspectorReview: false,
          reason: `Future-effective rule under ${rule.amendment_version || 'Gazette Notification'}. Effective from ${effDateStr}; inactive for inspection date ${inspDateStr}.`,
        };
      }
    }

    // 2. Explicit effective_from check even if status is not explicitly marked FUTURE
    if (rule.effective_from && rule.effective_from.getTime() > inspTime) {
      const effDateStr = rule.effective_from.toISOString().split('T')[0];
      return {
        isApplicableByVersion: false,
        requiresInspectorReview: false,
        reason: `Rule is not yet in force. Effective date is ${effDateStr}.`,
      };
    }

    // 3. Expired rule check (effective_to)
    if (rule.effective_to && rule.effective_to.getTime() < inspTime) {
      const expDateStr = rule.effective_to.toISOString().split('T')[0];
      return {
        isApplicableByVersion: false,
        requiresInspectorReview: false,
        reason: `Statutory requirement expired on ${expDateStr}.`,
      };
    }

    // 4. Historical guard rule check (e.g. LMPC-R5-HISTORY-001)
    if (rule.rule_status === RuleOperationalStatus.HISTORICAL) {
      return {
        isApplicableByVersion: false,
        isHistoricalGuard: true,
        requiresInspectorReview: true,
        reason: rule.notes || 'Historical Rule 5/Second Schedule logic cannot be auto-enforced without current legal basis.',
      };
    }

    // 5. Inactive status
    if (rule.rule_status === RuleOperationalStatus.INACTIVE) {
      return {
        isApplicableByVersion: false,
        requiresInspectorReview: false,
        reason: 'Rule record is currently marked INACTIVE in Rule Database.',
      };
    }

    // 6. Review Required status
    if (rule.rule_status === RuleOperationalStatus.REVIEW_REQUIRED || rule.inspector_review_required) {
      return {
        isApplicableByVersion: true,
        requiresInspectorReview: true,
        reason: rule.notes || 'Statutory condition requires Assistant Controller / Legal Metrology Official review.',
      };
    }

    return {
      isApplicableByVersion: true,
      requiresInspectorReview: false,
      reason: 'Rule is active and valid for the current inspection date.',
    };
  }
}

