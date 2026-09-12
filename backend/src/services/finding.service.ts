import mongoose, { Types } from 'mongoose';
import {
  ComplianceFinding,
  IComplianceFinding,
  FindingCandidateStatus,
  InspectorVerificationDecision,
  FindingStatus,
  Inspection,
  Sample,
  SampleStatus,
  UserRole,
  IRuleEvaluation,
  IRuleEvaluationItem,
  ApplicabilityStatus,
  ObservationStatus,
  ValidationResultOutcome,
} from '../models';
import { UserContext } from './inspection.service';

export interface VerifyFindingDTO {
  decision: InspectorVerificationDecision;
  verifiedValue?: string;
  notes?: string;
}

export interface CorrectFindingDTO {
  correctedValue: string;
  notes?: string;
}

export interface FindingFilterOptions {
  sampleId?: string;
  candidateStatus?: string;
  status?: string;
  isVerified?: boolean;
  ruleFamily?: string;
}

export interface FindingsTelemetry {
  totalFindings: number;
  verifiedCount: number;
  pendingCount: number;
  percentVerified: number;
  isAllVerified: boolean;
  candidateBreakdown: {
    compliantCandidates: number;
    potentialNonCompliances: number;
    requiresReview: number;
    notApplicable: number;
  };
  verifiedBreakdown: {
    verifiedCompliant: number;
    verifiedNonCompliant: number;
    verifiedNotApplicable: number;
    verifiedRequiresFurtherReview: number;
  };
}

export class FindingService {
  /**
   * Maps a RuleEvaluation item to a Finding candidate status.
   */
  public static mapEvaluationToCandidateStatus(item: IRuleEvaluationItem): FindingCandidateStatus {
    if (
      item.applicability_status === ApplicabilityStatus.NOT_APPLICABLE ||
      item.validation_result === ValidationResultOutcome.NOT_APPLICABLE ||
      item.applicability_status === ApplicabilityStatus.INACTIVE
    ) {
      return FindingCandidateStatus.NOT_APPLICABLE;
    }

    if (
      item.requires_inspector_review ||
      item.validation_result === ValidationResultOutcome.REVIEW_REQUIRED ||
      item.applicability_status === ApplicabilityStatus.REVIEW_REQUIRED ||
      item.observation_status === ObservationStatus.UNCLEAR
    ) {
      return FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW;
    }

    if (
      item.validation_result === ValidationResultOutcome.POTENTIAL_VIOLATION ||
      item.observation_status === ObservationStatus.NOT_OBSERVED ||
      item.observation_status === ObservationStatus.LOW_CONFIDENCE
    ) {
      return FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE;
    }

    if (item.validation_result === ValidationResultOutcome.PASS) {
      return FindingCandidateStatus.COMPLIANT_CANDIDATE;
    }

    return FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW;
  }

  /**
   * Synchronizes compliance findings for a sample from a completed RuleEvaluation.
   * Ensures idempotency: existing inspector verifications are NEVER wiped out.
   */
  public static async syncFindingsFromEvaluation(
    evaluation: IRuleEvaluation
  ): Promise<IComplianceFinding[]> {
    const results: IComplianceFinding[] = [];

    for (const item of evaluation.rules_evaluated) {
      const candidateStatus = this.mapEvaluationToCandidateStatus(item);
      const findingId = `FND-${evaluation.sampleCode}-${item.rule_id}`;

      let finding = await ComplianceFinding.findOne({
        sampleId: evaluation.sampleId,
        ruleId: item.rule_id,
      });

      if (!finding) {
        finding = new ComplianceFinding({
          findingId,
          inspectionId: evaluation.inspectionId,
          sampleId: evaluation.sampleId,
          sampleCode: evaluation.sampleCode,
          ruleId: item.rule_id,
          ruleReference: item.rule_reference,
          ruleFamily: item.rule_family,
          declarationType: item.declaration_type,
          requirementDescription: item.requirement_description,
          candidateStatus,
          status: candidateStatus as unknown as FindingStatus,
          isVerified: false,
          isCorrected: false,
          aiObservation: {
            state: item.observation_status,
            extractedValue: item.observed_value,
            normalizedValue: item.normalized_value,
            confidence: item.confidence,
            evidenceImageIds: item.evidence_image_ids || [],
            evidenceDescriptions: item.evidence_descriptions || [],
          },
          ruleEngineResult: {
            outcome: item.validation_result,
            reason: item.reason,
            applicabilityExplanation: item.applicability_explanation,
            requiresInspectorReview: item.requires_inspector_review,
            ruleDatabaseVersion: item.rule_database_version,
            amendmentVersion: item.amendment_version,
            evaluatedAt: evaluation.evaluated_at || new Date(),
          },
          inspectorVerification: {
            isVerified: false,
            decision: null,
            verifiedValue: null,
            originalAiValuePreserved: null,
            isCorrected: false,
            notes: null,
            verifiedBy: null,
            verifiedByName: null,
            verifiedAt: null,
          },
        });
      } else {
        // Update rule engine layer
        finding.ruleEngineResult = {
          outcome: item.validation_result,
          reason: item.reason,
          applicabilityExplanation: item.applicability_explanation,
          requiresInspectorReview: item.requires_inspector_review,
          ruleDatabaseVersion: item.rule_database_version,
          amendmentVersion: item.amendment_version,
          evaluatedAt: evaluation.evaluated_at || new Date(),
        };

        finding.candidateStatus = candidateStatus;

        // Only update AI observation and status if not yet verified by Inspector
        if (!finding.isVerified) {
          finding.aiObservation = {
            state: item.observation_status,
            extractedValue: item.observed_value,
            normalizedValue: item.normalized_value,
            confidence: item.confidence,
            evidenceImageIds: item.evidence_image_ids || [],
            evidenceDescriptions: item.evidence_descriptions || [],
          };
          finding.status = candidateStatus as unknown as FindingStatus;
        }
      }

      await finding.save();
      results.push(finding);
    }

    try {
      const { AuditService } = await import('./audit.service');
      const { AuditEventType } = await import('../models/AuditEvent');
      await AuditService.recordEvent({
        eventType: AuditEventType.FINDINGS_GENERATED,
        entityType: 'FINDING',
        entityId: `FINDINGS-${evaluation.sampleCode}`,
        inspectionId: evaluation.inspectionId,
        sampleId: evaluation.sampleId,
        actorUserId: evaluation.evaluated_by || 'SYSTEM',
        actorName: 'Finding Sync Engine',
        actorRole: 'SYSTEM',
        source: 'RULE_ENGINE',
        action: 'Generated Compliance Findings',
        description: `Generated/synchronized ${results.length} compliance findings for sample ${evaluation.sampleCode}`,
        metadata: {
          sampleCode: evaluation.sampleCode,
          totalFindings: results.length,
          ruleDatabaseVersion: evaluation.rule_database_version || '1.0',
        },
      });
    } catch (auditErr) {
      console.warn('Audit trail logging failed for syncFindingsFromEvaluation:', auditErr);
    }

    return results;
  }

  /**
   * Calculates telemetry summary from an array of findings.
   */
  public static calculateTelemetry(findings: IComplianceFinding[]): FindingsTelemetry {
    const totalFindings = findings.length;
    let verifiedCount = 0;
    let compliantCandidates = 0;
    let potentialNonCompliances = 0;
    let requiresReview = 0;
    let notApplicable = 0;

    let verifiedCompliant = 0;
    let verifiedNonCompliant = 0;
    let verifiedNotApplicable = 0;
    let verifiedRequiresFurtherReview = 0;

    for (const f of findings) {
      if (f.isVerified) {
        verifiedCount++;
        if (f.status === FindingStatus.VERIFIED_COMPLIANT) verifiedCompliant++;
        else if (f.status === FindingStatus.VERIFIED_NON_COMPLIANT) verifiedNonCompliant++;
        else if (f.status === FindingStatus.VERIFIED_NOT_APPLICABLE) verifiedNotApplicable++;
        else if (f.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW) verifiedRequiresFurtherReview++;
      }

      if (f.candidateStatus === FindingCandidateStatus.COMPLIANT_CANDIDATE) compliantCandidates++;
      else if (f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE) potentialNonCompliances++;
      else if (f.candidateStatus === FindingCandidateStatus.REQUIRES_INSPECTOR_REVIEW) requiresReview++;
      else if (f.candidateStatus === FindingCandidateStatus.NOT_APPLICABLE) notApplicable++;
    }

    const pendingCount = totalFindings - verifiedCount;
    const percentVerified = totalFindings > 0 ? Math.round((verifiedCount / totalFindings) * 100) : 0;
    const isAllVerified = totalFindings > 0 && verifiedCount === totalFindings;

    return {
      totalFindings,
      verifiedCount,
      pendingCount,
      percentVerified,
      isAllVerified,
      candidateBreakdown: {
        compliantCandidates,
        potentialNonCompliances,
        requiresReview,
        notApplicable,
      },
      verifiedBreakdown: {
        verifiedCompliant,
        verifiedNonCompliant,
        verifiedNotApplicable,
        verifiedRequiresFurtherReview,
      },
    };
  }

  /**
   * Retrieves findings for an inspection with role-based data isolation.
   */
  public static async getInspectionFindings(
    inspectionId: string,
    user: UserContext,
    filters: FindingFilterOptions = {}
  ): Promise<{
    inspection: any;
    findings: IComplianceFinding[];
    telemetry: FindingsTelemetry;
  }> {
    const inspection = await Inspection.findById(inspectionId);
    if (!inspection) {
      throw new Error(`Inspection not found: ${inspectionId}`);
    }

    // Role-based authorization
    if (user.role === UserRole.INSPECTOR) {
      const userBadge = user.inspectorId;
      const userMongoId = user.id;
      const isOwner =
        inspection.inspectorId === userBadge || inspection.inspectorId === userMongoId;

      if (!isOwner) {
        const error = new Error('Access denied: You cannot view findings for another inspector\'s case.');
        (error as any).statusCode = 403;
        throw error;
      }
    }

    const query: Record<string, any> = { inspectionId: inspection._id };

    if (filters.sampleId) {
      query.sampleId = new Types.ObjectId(filters.sampleId);
    }
    if (filters.candidateStatus) {
      query.candidateStatus = filters.candidateStatus;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (typeof filters.isVerified === 'boolean') {
      query.isVerified = filters.isVerified;
    }
    if (filters.ruleFamily) {
      query.ruleFamily = filters.ruleFamily;
    }

    // Fetch all inspection findings to compute aggregate telemetry
    const allInspectionFindings = await ComplianceFinding.find({ inspectionId: inspection._id });
    const telemetry = this.calculateTelemetry(allInspectionFindings);

    // Fetch filtered list for current view
    const findings = await ComplianceFinding.find(query).sort({ ruleId: 1 });

    return {
      inspection,
      findings,
      telemetry,
    };
  }

  /**
   * Retrieves findings for a specific sample.
   * If findings do not yet exist, attempts to generate them from the latest RuleEvaluation.
   */
  public static async getSampleFindings(
    sampleId: string,
    user: UserContext
  ): Promise<{
    sample: any;
    findings: IComplianceFinding[];
    telemetry: FindingsTelemetry;
  }> {
    const sample = await Sample.findById(sampleId);
    if (!sample) {
      throw new Error(`Sample not found: ${sampleId}`);
    }

    const inspection = await Inspection.findById(sample.inspectionId);
    if (!inspection) {
      throw new Error(`Parent inspection not found for sample: ${sampleId}`);
    }

    // Authorization
    if (user.role === UserRole.INSPECTOR) {
      const userBadge = user.inspectorId;
      const userMongoId = user.id;
      const isOwner =
        inspection.inspectorId === userBadge || inspection.inspectorId === userMongoId;

      if (!isOwner) {
        const error = new Error('Access denied: You cannot view findings for another inspector\'s sample.');
        (error as any).statusCode = 403;
        throw error;
      }
    }

    let findings: any[] = await ComplianceFinding.find({ sampleId: sample._id }).sort({ ruleId: 1 });

    // Fallback sync if findings haven't been generated yet
    if (findings.length === 0) {
      const { RuleEvaluation } = await import('../models');
      const latestEvaluation = await RuleEvaluation.findOne({ sampleId: sample._id }).sort({
        createdAt: -1,
      });

      if (latestEvaluation) {
        findings = await this.syncFindingsFromEvaluation(latestEvaluation);
      }
    }

    const telemetry = this.calculateTelemetry(findings);

    return {
      sample,
      findings,
      telemetry,
    };
  }

  /**
   * Submits human inspector verification for a finding.
   * Strictly enforces:
   * 1. Only inspectors can verify findings (Controllers get 403 Forbidden).
   * 2. Inspector must be the assigned owner of the inspection case.
   * 3. Immutability of original AI observation.
   * 4. Updates sample status to VERIFIED when all findings are verified.
   */
  public static async verifyFinding(
    findingId: string,
    user: UserContext,
    dto: VerifyFindingDTO
  ): Promise<{
    finding: IComplianceFinding;
    telemetry: FindingsTelemetry;
    allSampleFindingsVerified: boolean;
  }> {
    // 1. Controller Guard: Supervisory role is read-only
    if (user.role === UserRole.ASSISTANT_CONTROLLER) {
      const error = new Error('Supervisory action restricted: Assistant Controllers have read-only audit access.');
      (error as any).statusCode = 403;
      throw error;
    }

    // 2. Validate decision
    if (!Object.values(InspectorVerificationDecision).includes(dto.decision)) {
      const error = new Error(`Invalid verification decision: ${dto.decision}`);
      (error as any).statusCode = 400;
      throw error;
    }

    // 3. Find Finding
    const finding = await ComplianceFinding.findById(findingId);
    if (!finding) {
      const error = new Error(`Finding not found: ${findingId}`);
      (error as any).statusCode = 404;
      throw error;
    }

    // 4. Validate ownership of parent inspection
    const inspection = await Inspection.findById(finding.inspectionId);
    if (!inspection) {
      throw new Error(`Parent inspection not found for finding: ${findingId}`);
    }

    const userBadge = user.inspectorId;
    const userMongoId = user.id;
    const isOwner =
      inspection.inspectorId === userBadge || inspection.inspectorId === userMongoId;

    if (!isOwner) {
      const error = new Error('Access denied: You can only verify findings for your own assigned inspections.');
      (error as any).statusCode = 403;
      throw error;
    }

    // 5. Apply verification & value correction (if provided)
    const originalAiValue = finding.aiObservation.extractedValue;
    let verifiedValue = finding.inspectorVerification.verifiedValue || originalAiValue;
    let isCorrected = finding.isCorrected;

    if (dto.verifiedValue !== undefined && dto.verifiedValue !== null) {
      const trimmed = dto.verifiedValue.trim();
      if (trimmed !== (originalAiValue || '')) {
        isCorrected = true;
        finding.inspectorVerification.originalAiValuePreserved = originalAiValue;
        verifiedValue = trimmed;
      }
    }

    finding.isVerified = true;
    finding.isCorrected = isCorrected;
    finding.status = dto.decision as unknown as FindingStatus;

    finding.inspectorVerification = {
      isVerified: true,
      decision: dto.decision,
      verifiedValue: verifiedValue,
      originalAiValuePreserved: isCorrected
        ? (finding.inspectorVerification.originalAiValuePreserved || originalAiValue)
        : null,
      isCorrected,
      notes: dto.notes ? dto.notes.trim() : finding.inspectorVerification.notes,
      verifiedBy: user.inspectorId || user.id,
      verifiedByName: user.name,
      verifiedAt: new Date(),
    };

    await finding.save();

    try {
      const { AuditService } = await import('./audit.service');
      const { AuditEventType } = await import('../models/AuditEvent');
      await AuditService.recordEvent({
        eventType: AuditEventType.FINDING_VERIFIED,
        entityType: 'FINDING',
        entityId: finding.findingId,
        inspectionId: finding.inspectionId,
        sampleId: finding.sampleId,
        findingId: finding._id,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        source: 'USER',
        action: 'Verified Finding Decision',
        description: `Inspector verified rule ${finding.ruleId} (${finding.ruleReference}) as ${dto.decision}${finding.isCorrected ? ' with corrected value' : ''}`,
        beforeState: {
          status: finding.candidateStatus,
          isVerified: false,
        },
        afterState: {
          decision: dto.decision,
          status: finding.status,
          verifiedValue: finding.inspectorVerification.verifiedValue,
          isCorrected: finding.isCorrected,
          notes: finding.inspectorVerification.notes,
        },
        metadata: {
          ruleId: finding.ruleId,
          ruleReference: finding.ruleReference,
          decision: dto.decision,
          originalAiValue: originalAiValue,
          verifiedValue: verifiedValue,
        },
      });
    } catch (auditErr) {
      console.warn('Audit trail logging failed for verifyFinding:', auditErr);
    }

    // 6. Check if all findings for this sample are now verified
    const allSampleFindings = await ComplianceFinding.find({ sampleId: finding.sampleId });
    const telemetry = this.calculateTelemetry(allSampleFindings);

    let allSampleFindingsVerified = false;
    if (telemetry.isAllVerified) {
      allSampleFindingsVerified = true;
      await Sample.findByIdAndUpdate(finding.sampleId, {
        status: SampleStatus.VERIFIED,
      });
    }

    return {
      finding,
      telemetry,
      allSampleFindingsVerified,
    };
  }

  /**
   * Corrects the extracted declaration value while preserving the original AI extraction intact.
   */
  public static async correctFinding(
    findingId: string,
    user: UserContext,
    dto: CorrectFindingDTO
  ): Promise<IComplianceFinding> {
    if (user.role === UserRole.ASSISTANT_CONTROLLER) {
      const error = new Error('Supervisory action restricted: Assistant Controllers cannot modify observations.');
      (error as any).statusCode = 403;
      throw error;
    }

    if (!dto.correctedValue || dto.correctedValue.trim() === '') {
      const error = new Error('Corrected value cannot be empty.');
      (error as any).statusCode = 400;
      throw error;
    }

    const finding = await ComplianceFinding.findById(findingId);
    if (!finding) {
      const error = new Error(`Finding not found: ${findingId}`);
      (error as any).statusCode = 404;
      throw error;
    }

    const inspection = await Inspection.findById(finding.inspectionId);
    if (!inspection) {
      throw new Error(`Parent inspection not found for finding: ${findingId}`);
    }

    const userBadge = user.inspectorId;
    const userMongoId = user.id;
    const isOwner =
      inspection.inspectorId === userBadge || inspection.inspectorId === userMongoId;

    if (!isOwner) {
      const error = new Error('Access denied: You can only edit observations for your own assigned inspections.');
      (error as any).statusCode = 403;
      throw error;
    }

    const originalAiValue = finding.aiObservation.extractedValue;
    finding.isCorrected = true;
    finding.inspectorVerification.isCorrected = true;
    finding.inspectorVerification.originalAiValuePreserved = originalAiValue;
    finding.inspectorVerification.verifiedValue = dto.correctedValue.trim();

    if (dto.notes) {
      finding.inspectorVerification.notes = dto.notes.trim();
    }

    await finding.save();

    try {
      const { AuditService } = await import('./audit.service');
      const { AuditEventType } = await import('../models/AuditEvent');
      await AuditService.recordEvent({
        eventType: AuditEventType.FINDING_CORRECTED,
        entityType: 'FINDING',
        entityId: finding.findingId,
        inspectionId: finding.inspectionId,
        sampleId: finding.sampleId,
        findingId: finding._id,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        source: 'USER',
        action: 'Corrected Extracted Value',
        description: `Inspector corrected value for rule ${finding.ruleId} (${finding.ruleReference}) from "${originalAiValue || 'N/A'}" to "${dto.correctedValue.trim()}"`,
        beforeState: {
          extractedValue: originalAiValue,
          isCorrected: false,
        },
        afterState: {
          verifiedValue: dto.correctedValue.trim(),
          originalAiValuePreserved: originalAiValue,
          isCorrected: true,
          notes: finding.inspectorVerification.notes,
        },
        metadata: {
          ruleId: finding.ruleId,
          ruleReference: finding.ruleReference,
          previousValue: originalAiValue,
          newValue: dto.correctedValue.trim(),
        },
      });
    } catch (auditErr) {
      console.warn('Audit trail logging failed for correctFinding:', auditErr);
    }

    return finding;
  }
}
