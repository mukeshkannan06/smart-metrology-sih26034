import { Types } from 'mongoose';
import { Rule, IRule, RuleOperationalStatus } from '../../models/Rule';
import { Inspection, PackageContext } from '../../models/Inspection';
import { Sample, SampleStatus } from '../../models/Sample';
import { AIExtraction } from '../../models/AIExtraction';
import {
  RuleEvaluation,
  IRuleEvaluation,
  IRuleEvaluationItem,
  ApplicabilityStatus,
  ObservationStatus,
  ValidationResultOutcome,
} from '../../models/RuleEvaluation';
import { RuleVersionResolver } from './RuleVersionResolver';
import { RuleConditionEvaluator, EvaluationContext } from './RuleConditionEvaluator';
import { RuleValidatorRegistry } from './RuleValidatorRegistry';
import { DeclarationExtraction } from '../../ai/aiProvider.interface';
import { FindingService } from '../../services/finding.service';

// Mapping between OCR declaration categories and database ocr_field values
const DECLARATION_TO_OCR_FIELD_MAP: Record<string, string[]> = {
  PRODUCT_NAME: ['common_generic_name'],
  NET_QUANTITY: ['net_quantity', 'wholesale_package_count_or_net_quantity'],
  MRP: ['mrp'],
  DATE_OF_MANUFACTURE_PACKING: ['manufacture_pack_import_date', 'manufacture_date'],
  BEST_BEFORE_USE_BY: ['best_before_use_by_expiry'],
  MANUFACTURER_DETAILS: ['manufacturer_packer_importer'],
  COUNTRY_OF_ORIGIN: ['country_of_origin'],
  CONSUMER_CARE: ['consumer_care'],
  UNIT_SALE_PRICE: ['unit_sale_price'],
  DIMENSIONS: ['dimensions'],
};

export class RuleEngineService {
  /**
   * Deterministically evaluates all rules in the Rule Database for a specific sample.
   * Resolves context, scope exclusions, statutory exemptions, versions, and AI observations.
   */
  public static async evaluateSample(
    inspectionId: string | Types.ObjectId,
    sampleId: string | Types.ObjectId,
    evaluatorId: string
  ): Promise<IRuleEvaluation> {
    // 1. Load Inspection and Sample
    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) {
      throw new Error(`Inspection not found: ${inspectionId}`);
    }

    const sample = await Sample.findById(sampleId);
    if (!sample) {
      throw new Error(`Sample not found: ${sampleId}`);
    }

    // 2. Load latest AI Extractions (if available)
    const latestExtraction = await AIExtraction.findOne({ sampleId })
      .sort({ createdAt: -1 })
      .lean();

    const observations: DeclarationExtraction[] = latestExtraction?.declarations || [];

    // 3. Load all 33 authoritative rules from database
    const rules: IRule[] = await Rule.find({}).sort({ rule_id: 1 });
    if (rules.length === 0) {
      throw new Error('No rules found in Rule Database. Ensure database is seeded with v1.0 dataset.');
    }

    // 4. Derive Evaluation Context from Inspection metadata
    const context = this.buildEvaluationContext(inspection, sample);

    // 5. Evaluate each rule deterministically
    const evaluatedItems: IRuleEvaluationItem[] = [];

    for (const rule of rules) {
      const item = this.evaluateSingleRule(rule, context, observations);
      evaluatedItems.push(item);
    }

    // 6. Compute summary telemetry
    const summary = {
      total_rules_evaluated: evaluatedItems.length,
      applicable_count: evaluatedItems.filter(
        (i) => i.applicability_status === ApplicabilityStatus.APPLICABLE
      ).length,
      mandatory_count: evaluatedItems.filter(
        (i) => i.mandatory_status === 'MANDATORY' && i.applicability_status === ApplicabilityStatus.APPLICABLE
      ).length,
      not_applicable_count: evaluatedItems.filter(
        (i) => i.applicability_status === ApplicabilityStatus.NOT_APPLICABLE
      ).length,
      conditional_count: evaluatedItems.filter(
        (i) => i.applicability_status === ApplicabilityStatus.CONDITIONAL
      ).length,
      review_required_count: evaluatedItems.filter(
        (i) => i.requires_inspector_review || i.applicability_status === ApplicabilityStatus.REVIEW_REQUIRED
      ).length,
      observed_count: evaluatedItems.filter(
        (i) => i.observation_status === ObservationStatus.OBSERVED
      ).length,
      not_observed_count: evaluatedItems.filter(
        (i) => i.observation_status === ObservationStatus.NOT_OBSERVED
      ).length,
      potential_violations_count: evaluatedItems.filter(
        (i) => i.validation_result === ValidationResultOutcome.POTENTIAL_VIOLATION
      ).length,
    };

    // 7. Persist evaluation record
    const sampleCode = sample.sampleCode || (sample as any).code || `SMP-${sample.sampleNumber || '01'}`;
    const evaluationId = `EVAL-${sampleCode}-${Date.now()}`;
    const evaluationDoc = await RuleEvaluation.create({
      evaluation_id: evaluationId,
      inspectionId: inspection._id,
      sampleId: sample._id,
      sampleCode: sampleCode,
      package_context: inspection.packageContext,
      commodity: inspection.commodity,
      commodity_category: context.commodity_category,
      rule_database_version: '1.0',
      rules_evaluated: evaluatedItems,
      summary,
      evaluated_at: new Date(),
      evaluated_by: evaluatorId,
    });

    try {
      const { AuditService } = await import('../../services/audit.service');
      const { AuditEventType } = await import('../../models/AuditEvent');
      await AuditService.recordEvent({
        eventType: AuditEventType.RULE_EVALUATION_COMPLETED,
        entityType: 'RULE_EVALUATION',
        entityId: evaluationDoc.evaluation_id,
        inspectionId: inspection._id,
        sampleId: sample._id,
        actorUserId: evaluatorId,
        actorName: 'Rule Engine Evaluation',
        actorRole: 'SYSTEM',
        source: 'RULE_ENGINE',
        action: 'Evaluated Statutory Rules',
        description: `Evaluated ${evaluatedItems.length} statutory rules against DB v${evaluationDoc.rule_database_version || '1.0'} (${summary.applicable_count} applicable, ${summary.potential_violations_count} potential violations)`,
        afterState: summary,
        metadata: {
          evaluationId: evaluationDoc.evaluation_id,
          ruleDatabaseVersion: evaluationDoc.rule_database_version,
          applicableCount: summary.applicable_count,
          potentialViolationsCount: summary.potential_violations_count,
        },
      });
    } catch (auditErr) {
      console.warn('Audit trail logging failed for evaluateSample:', auditErr);
    }

    // 8. Phase 12: Automatically synchronize Compliance Findings
    try {
      await FindingService.syncFindingsFromEvaluation(evaluationDoc);
    } catch (findingSyncErr) {
      console.error('Failed to sync findings from evaluation:', findingSyncErr);
    }

    // 9. Auto-advance sample status to EVALUATED if not already VERIFIED
    if (sample.status !== SampleStatus.VERIFIED) {
      sample.status = SampleStatus.EVALUATED;
      await sample.save();
    }

    return evaluationDoc;
  }

  /**
   * Evaluates a single rule deterministically against context and observations.
   */
  private static evaluateSingleRule(
    rule: IRule,
    context: EvaluationContext,
    observations: DeclarationExtraction[]
  ): IRuleEvaluationItem {
    const inspectionDate = context.inspection_date ? new Date(context.inspection_date) : new Date();

    // Step A: Version and Temporal Validity Check
    const versionRes = RuleVersionResolver.resolve(rule, inspectionDate);
    if (!versionRes.isApplicableByVersion) {
      return {
        rule_id: rule.rule_id,
        rule_reference: rule.rule_reference,
        declaration_type: rule.declaration_type,
        requirement_description: rule.requirement_description,
        rule_family: rule.rule_family,
        applicability_status:
          rule.rule_status === RuleOperationalStatus.FUTURE
            ? ApplicabilityStatus.INACTIVE
            : ApplicabilityStatus.NOT_APPLICABLE,
        mandatory_status: rule.mandatory_status,
        observation_status: ObservationStatus.NOT_ANALYZED,
        observed_value: null,
        normalized_value: null,
        confidence: null,
        evidence_image_ids: [],
        evidence_descriptions: [],
        reason: versionRes.reason,
        applicability_explanation: versionRes.reason,
        validation_result: ValidationResultOutcome.NOT_APPLICABLE,
        requires_inspector_review: versionRes.requiresInspectorReview,
        rule_database_version: rule.database_version,
        amendment_version: rule.amendment_version,
        effective_from: rule.effective_from,
        effective_to: rule.effective_to,
      };
    }

    // Step B: Package Context Compatibility Check
    const packageCtxStr = rule.package_context || 'ALL';
    const ruleContexts = packageCtxStr.split('|').map((c) => c.trim().toUpperCase());
    const isContextCompatible = this.isPackageContextCompatible(ruleContexts, context);

    if (!isContextCompatible) {
      return {
        rule_id: rule.rule_id,
        rule_reference: rule.rule_reference,
        declaration_type: rule.declaration_type,
        requirement_description: rule.requirement_description,
        rule_family: rule.rule_family,
        applicability_status: ApplicabilityStatus.NOT_APPLICABLE,
        mandatory_status: rule.mandatory_status,
        observation_status: ObservationStatus.NOT_ANALYZED,
        observed_value: null,
        normalized_value: null,
        confidence: null,
        evidence_image_ids: [],
        evidence_descriptions: [],
        reason: `Rule applies to contexts [${packageCtxStr}], current package context is '${context.package_context}'.`,
        applicability_explanation: `Package context exclusion: not applicable to ${context.package_context}.`,
        validation_result: ValidationResultOutcome.NOT_APPLICABLE,
        requires_inspector_review: false,
        rule_database_version: rule.database_version,
        amendment_version: rule.amendment_version,
        effective_from: rule.effective_from,
        effective_to: rule.effective_to,
      };
    }

    // Step C: Condition & Exemption Evaluation
    const conditionRes = RuleConditionEvaluator.evaluate(rule.applicability_conditions, context);
    let applicabilityStatus: ApplicabilityStatus;

    if (!conditionRes.satisfied) {
      applicabilityStatus = ApplicabilityStatus.NOT_APPLICABLE;
    } else if (rule.mandatory_status === 'CONDITIONAL') {
      applicabilityStatus = ApplicabilityStatus.CONDITIONAL;
    } else if (rule.rule_status === RuleOperationalStatus.REVIEW_REQUIRED || rule.inspector_review_required) {
      applicabilityStatus = ApplicabilityStatus.REVIEW_REQUIRED;
    } else {
      applicabilityStatus = ApplicabilityStatus.APPLICABLE;
    }

    // Step D: Match AI Observation for ocr_field
    const matchingObs = this.findObservationForRule(rule, observations);
    let observationStatus: ObservationStatus = ObservationStatus.NOT_ANALYZED;
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null = null;
    let observedVal: string | null = null;
    let normalizedVal: string | null = null;
    const evidenceImageIds: string[] = [];
    const evidenceDescriptions: string[] = [];

    if (matchingObs) {
      observedVal = matchingObs.rawValue || null;
      normalizedVal = matchingObs.normalizedValue || null;
      confidence = matchingObs.confidence;

      if (matchingObs.evidenceImageId) evidenceImageIds.push(matchingObs.evidenceImageId);
      if (matchingObs.evidenceDescription) evidenceDescriptions.push(matchingObs.evidenceDescription);

      if (matchingObs.state === 'DETECTED') observationStatus = ObservationStatus.OBSERVED;
      else if (matchingObs.state === 'NOT_DETECTED') observationStatus = ObservationStatus.NOT_OBSERVED;
      else if (matchingObs.state === 'LOW_CONFIDENCE') observationStatus = ObservationStatus.LOW_CONFIDENCE;
      else if (matchingObs.state === 'UNCLEAR') observationStatus = ObservationStatus.UNCLEAR;
      else observationStatus = ObservationStatus.NOT_ANALYZED;
    } else if (rule.ocr_field) {
      observationStatus = ObservationStatus.NOT_OBSERVED;
    }

    // Step E: Execute Safe Validator from Registry
    const valResult = RuleValidatorRegistry.execute(rule.validation_function, {
      rule,
      observation: matchingObs,
      context,
      allObservations: observations,
    });

    return {
      rule_id: rule.rule_id,
      rule_reference: rule.rule_reference,
      declaration_type: rule.declaration_type,
      requirement_description: rule.requirement_description,
      rule_family: rule.rule_family,
      applicability_status: applicabilityStatus,
      mandatory_status: rule.mandatory_status,
      observation_status: observationStatus,
      observed_value: valResult.observedValue || observedVal,
      normalized_value: valResult.normalizedValue || normalizedVal,
      confidence,
      evidence_image_ids: evidenceImageIds,
      evidence_descriptions: evidenceDescriptions,
      reason: valResult.reason,
      applicability_explanation: rule.human_condition_text,
      validation_result: valResult.outcome,
      requires_inspector_review: Boolean(
        rule.inspector_review_required || valResult.requiresInspectorReview || versionRes.requiresInspectorReview
      ),
      rule_database_version: rule.database_version,
      amendment_version: rule.amendment_version,
      effective_from: rule.effective_from,
      effective_to: rule.effective_to,
    };
  }

  private static buildEvaluationContext(
    inspection: { packageContext: PackageContext; commodity: string; createdAt: Date },
    sample: { sampleCode: string; notes?: string }
  ): EvaluationContext {
    const pkgCtx = inspection.packageContext;
    const commodity = inspection.commodity || '';

    // Commodity category classification
    let commodityCategory = 'GENERAL';
    if (/pan\s*masala|gutkha/i.test(commodity)) {
      commodityCategory = 'PAN_MASALA';
    } else if (/medical\s*device|stent|syringe|catheter/i.test(commodity)) {
      commodityCategory = 'MEDICAL_DEVICE';
    } else if (/electronic|mobile|laptop|charger|battery/i.test(commodity)) {
      commodityCategory = 'ELECTRONIC_PRODUCT';
    }

    const isRetail = pkgCtx === PackageContext.RETAIL_PACKAGE;
    const isWholesale = pkgCtx === PackageContext.WHOLESALE_PACKAGE;
    const isImported = pkgCtx === PackageContext.IMPORTED_PACKAGE;
    const isExport = pkgCtx === PackageContext.EXPORT_PACKAGE;
    const isIndInst = pkgCtx === PackageContext.INDUSTRIAL_INSTITUTIONAL_PACKAGE;

    const chapterIIApplies = isRetail || isImported;

    return {
      package_context: pkgCtx,
      commodity,
      commodity_category: commodityCategory,
      is_retail_package: isRetail,
      is_wholesale_package: isWholesale,
      wholesale_package: isWholesale,
      is_imported: isImported,
      is_imported_package: isImported,
      is_export_package: isExport,
      chapter_ii_applies: chapterIIApplies,
      rule_6_applies: chapterIIApplies,
      rule_7_applies: chapterIIApplies,
      rule_24_applies: isWholesale,
      package_is_sold_at_retail_in_india: isRetail,
      package_is_itself_retail_package: isRetail,
      offered_or_sold_in_india: !isExport,
      applicable_quantity_declaration_required: true,
      date_declaration_trigger_applies: true,
      commodity_may_become_unfit_for_human_consumption: false,
      product_specific_law_requires_date: false,
      dimensions_are_relevant: false,
      unit_sale_price_exception: false,
      rule_24_proviso_does_not_displace: true,
      similar_declarations_required_under_other_law: false,
      industrial_or_institutional_definition_satisfied: isIndInst,
      package_bears_not_for_retail_sale: isIndInst,
      specific_rule_26_clause_applies: false,
      package_is_group_combination_or_multi_piece: false,
      inner_package_is_retail_package: false,
      package_structure: 'STANDARD_SINGLE',
      qualifying_exception_conditions_met: false,
      affixed_label_used_for_required_declarations: isImported,
      actual_quantity_measured: false,
      applicable_mpe_rule_resolved: false,
      ecommerce_entity_sells_imported_product: false,
      ecommerce_order: false,
      loose_commodity_conditions_met: false,
      is_electronic_product_or_qualifying_spare: commodityCategory === 'ELECTRONIC_PRODUCT',
      package_contains_medical_device: commodityCategory === 'MEDICAL_DEVICE',
      historical_rule_5_logic_encountered: false,
      transaction_observed: false,
      applicable_retail_sale_price: null,
      evaluate_rule3_scope_conditions: true,
      aeo_tier: null,
      bonded_warehouse_pathway: false,
      inspection_date: inspection.createdAt || new Date(),
    };
  }

  private static isPackageContextCompatible(
    ruleContexts: string[],
    context: EvaluationContext
  ): boolean {
    if (ruleContexts.includes('ALL')) return true;

    const currentContext = context.package_context;
    if (!currentContext) return false;

    if (currentContext === PackageContext.RETAIL_PACKAGE && ruleContexts.includes('RETAIL')) return true;
    if (currentContext === PackageContext.WHOLESALE_PACKAGE && ruleContexts.includes('WHOLESALE')) return true;
    if (currentContext === PackageContext.IMPORTED_PACKAGE && (ruleContexts.includes('IMPORTED') || ruleContexts.includes('RETAIL'))) return true;
    if (currentContext === PackageContext.EXPORT_PACKAGE && ruleContexts.includes('EXPORT')) return true;
    if (
      currentContext === PackageContext.INDUSTRIAL_INSTITUTIONAL_PACKAGE &&
      (ruleContexts.includes('INDUSTRIAL') || ruleContexts.includes('INSTITUTIONAL'))
    ) return true;

    return false;
  }

  private static findObservationForRule(
    rule: IRule,
    observations: DeclarationExtraction[]
  ): DeclarationExtraction | null {
    if (!rule.ocr_field) return null;

    // Search matching categories for this ocr_field
    for (const [catName, fieldList] of Object.entries(DECLARATION_TO_OCR_FIELD_MAP)) {
      if (fieldList.includes(rule.ocr_field)) {
        const found = observations.find((o) => o.category === catName);
        if (found) return found;
      }
    }

    return null;
  }
}
