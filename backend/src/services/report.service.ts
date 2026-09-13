import mongoose from 'mongoose';
import fs from 'fs';
import crypto from 'crypto';
import {
  Inspection,
  IInspection,
  Sample,
  ISample,
  ISampleImage,
  AIExtraction,
  IAIExtraction,
  RuleEvaluation,
  IRuleEvaluation,
  ComplianceFinding,
  IComplianceFinding,
  UserRole,
  InspectionStatus,
  PackageContext,
  FindingStatus,
  SampleStatus,
} from '../models';
import { UserContext } from './inspection.service';
import { resolveTemporaryImagePath } from '../utils/tempStorage';

export interface ReportInspectionMetadata {
  inspectionId: string;
  inspectionNumber: string;
  reportNumber: string;
  commodity: string;
  brand?: string;
  packageContext: PackageContext;
  location: string;
  market?: string;
  samplesCount: number;
  status: InspectionStatus;
  remarks?: string;
  inspectorId: string;
  inspectorName: string;
  createdAt: Date;
  reportGeneratedAt: Date;
}

export interface ReportImageDetail {
  imageId: string;
  sequence: number;
  fileName?: string;
  sizeBytes: number;
  mimeType: string;
  availabilityState: 'AVAILABLE' | 'UNAVAILABLE_LIFECYCLE';
  streamUrl: string | null;
  capturedAt: Date;
}

export interface ReportFindingDetail {
  findingId: string;
  ruleId: string;
  ruleReference: string;
  declarationType: string;
  requirementDescription: string;
  aiValue: string | null;
  verifiedValue: string | null;
  isCorrected: boolean;
  decision: string | null;
  status: string;
  notes: string | null;
  verifiedByName: string | null;
  verifiedAt: Date | null;
}

export interface ReportSampleDetail {
  sampleId: string;
  sampleNumber: number;
  sampleCode: string;
  status: SampleStatus;
  notes?: string;
  createdAt: Date;
  images: ReportImageDetail[];
  aiExtraction?: {
    extractionId: string;
    aiModel: string;
    promptVersion?: string;
    overallConfidence: number;
    warnings: string[];
    declarations: Array<{
      category: string;
      state: string;
      extractedValue: string | null;
      normalizedValue: string | null;
      confidence: number;
    }>;
  };
  ruleEvaluation?: {
    evaluationId: string;
    ruleDatabaseVersion: string;
    evaluatedAt: Date;
    summary: {
      total_rules_evaluated: number;
      applicable_count: number;
      potential_violations_count: number;
    };
  };
  findings: ReportFindingDetail[];
}

export interface InspectionReportDTO {
  metadata: ReportInspectionMetadata;
  summary: {
    totalSamplesExpected: number;
    totalSamplesActual: number;
    samplesReviewed: number;
    totalFindings: number;
    verifiedCompliantCount: number;
    verifiedNonCompliantCount: number;
    verifiedNotApplicableCount: number;
    verifiedRequiresReviewCount: number;
    officerCorrectionsCount: number;
    overallComplianceRate: number;
    finalStatus: string;
  };
  samples: ReportSampleDetail[];
  legalDisclaimer: string;
  systemIdentity: {
    appName: string;
    problemStatement: string;
    ruleDatabaseVersion: string;
    verificationHash: string;
  };
}

export class ReportService {
  /**
   * Prepares and normalizes consolidated inspection report data for an inspection.
   * Consumes existing stored records — strictly read-only (zero AI re-analysis, zero rule re-evaluation).
   * Enforces role-based data isolation: Inspectors can only access their own cases; Assistant Controllers
   * have jurisdiction-wide supervisory review.
   */
  public static async buildReportData(
    inspectionIdOrNumber: string,
    user: UserContext
  ): Promise<{ reportData: InspectionReportDTO | null; forbidden: boolean }> {
    let inspection: IInspection | null = null;

    if (mongoose.Types.ObjectId.isValid(inspectionIdOrNumber)) {
      inspection = await Inspection.findById(inspectionIdOrNumber);
    }

    if (!inspection) {
      inspection = await Inspection.findOne({ inspectionNumber: inspectionIdOrNumber.toUpperCase() });
    }

    if (!inspection) {
      return { reportData: null, forbidden: false };
    }

    // Role-based authorization: Inspector must own the inspection record
    if (user.role === UserRole.INSPECTOR) {
      const userBadge = user.inspectorId;
      const userMongoId = user.id;
      const isOwner =
        inspection.inspectorId === userBadge || inspection.inspectorId === userMongoId;

      if (!isOwner) {
        return { reportData: null, forbidden: true };
      }
    }

    // Load child entities in deterministic order
    const [rawSamples, extractions, ruleEvaluations, findings] = await Promise.all([
      Sample.find({ inspectionId: inspection._id }).sort({ sampleNumber: 1 }).lean(),
      AIExtraction.find({ inspectionId: inspection._id }).sort({ createdAt: -1 }).lean(),
      RuleEvaluation.find({ inspectionId: inspection._id }).sort({ evaluated_at: -1 }).lean(),
      ComplianceFinding.find({ inspectionId: inspection._id }).sort({ ruleId: 1 }).lean(),
    ]);

    // Build per-sample detailed sections in deterministic sequence (Sample 1, Sample 2, ...)
    const processedSamples: ReportSampleDetail[] = rawSamples.map((sample: any) => {
      const sampleIdStr = sample._id.toString();

      // Sample Images
      const images: ReportImageDetail[] = (sample.images || []).map((img: ISampleImage) => {
        let availabilityState: 'AVAILABLE' | 'UNAVAILABLE_LIFECYCLE' = 'UNAVAILABLE_LIFECYCLE';
        let streamUrl: string | null = null;

        if (img.temporaryReference) {
          const fullPath = resolveTemporaryImagePath(img.temporaryReference);
          if (fullPath && fs.existsSync(fullPath)) {
            availabilityState = 'AVAILABLE';
            streamUrl = `/api/samples/${sample._id}/images/${img.imageId}/file`;
          }
        }

        return {
          imageId: img.imageId,
          sequence: img.sequence,
          fileName: img.fileName,
          sizeBytes: img.sizeBytes,
          mimeType: img.mimeType,
          availabilityState,
          streamUrl,
          capturedAt: img.capturedAt || new Date(),
        };
      });

      // Sample AI Extraction (latest for this sample)
      const sampleExtraction = extractions.find(
        (ext: any) => ext.sampleId && ext.sampleId.toString() === sampleIdStr
      );

      let aiExtractionData: ReportSampleDetail['aiExtraction'] | undefined = undefined;
      if (sampleExtraction) {
        aiExtractionData = {
          extractionId: sampleExtraction.extractionId || `EXT-${sample.sampleCode}`,
          aiModel: sampleExtraction.aiModel || 'Gemini 2.5 Flash',
          promptVersion: sampleExtraction.promptVersion,
          overallConfidence: typeof sampleExtraction.overallConfidence === 'number'
            ? sampleExtraction.overallConfidence
            : sampleExtraction.overallConfidence === 'HIGH'
            ? 0.95
            : sampleExtraction.overallConfidence === 'MEDIUM'
            ? 0.75
            : 0.5,
          warnings: sampleExtraction.warnings || [],
          declarations: (sampleExtraction.declarations || []).map((d: any) => ({
            category: d.category,
            state: d.state,
            extractedValue: d.extractedValue || d.rawValue || null,
            normalizedValue: d.normalizedValue || null,
            confidence: typeof d.confidence === 'number' ? d.confidence : d.confidence === 'HIGH' ? 0.95 : 0.7,
          })),
        };
      }

      // Sample Rule Evaluation (latest for this sample)
      const sampleRuleEval = ruleEvaluations.find(
        (rev: any) => rev.sampleId && rev.sampleId.toString() === sampleIdStr
      );

      let ruleEvaluationData: ReportSampleDetail['ruleEvaluation'] | undefined = undefined;
      if (sampleRuleEval) {
        ruleEvaluationData = {
          evaluationId: sampleRuleEval.evaluation_id || `EVAL-${sample.sampleCode}`,
          ruleDatabaseVersion: sampleRuleEval.rule_database_version || '1.0',
          evaluatedAt: sampleRuleEval.evaluated_at || new Date(),
          summary: {
            total_rules_evaluated: sampleRuleEval.summary?.total_rules_evaluated || 0,
            applicable_count: sampleRuleEval.summary?.applicable_count || 0,
            potential_violations_count: sampleRuleEval.summary?.potential_violations_count || 0,
          },
        };
      }

      // Sample Compliance Findings
      const sampleFindings = findings.filter(
        (f: any) => f.sampleId && f.sampleId.toString() === sampleIdStr
      );

      const formattedFindings: ReportFindingDetail[] = sampleFindings.map((f: any) => ({
        findingId: f.findingId,
        ruleId: f.ruleId,
        ruleReference: f.ruleReference,
        declarationType: f.declarationType,
        requirementDescription: f.requirementDescription,
        aiValue: f.aiObservation?.extractedValue || null,
        verifiedValue: f.inspectorVerification?.verifiedValue || f.aiObservation?.extractedValue || null,
        isCorrected: f.isCorrected || f.inspectorVerification?.isCorrected || false,
        decision: f.inspectorVerification?.decision || null,
        status: f.status || f.candidateStatus || 'PENDING',
        notes: f.inspectorVerification?.notes || null,
        verifiedByName: f.inspectorVerification?.verifiedByName || null,
        verifiedAt: f.inspectorVerification?.verifiedAt || null,
      }));

      return {
        sampleId: sampleIdStr,
        sampleNumber: sample.sampleNumber,
        sampleCode: sample.sampleCode,
        status: sample.status,
        notes: sample.notes,
        createdAt: sample.createdAt || new Date(),
        images,
        aiExtraction: aiExtractionData,
        ruleEvaluation: ruleEvaluationData,
        findings: formattedFindings,
      };
    });

    // Compute consolidated inspection-level telemetry
    const totalSamplesActual = processedSamples.length;
    const samplesReviewed = processedSamples.filter(
      (s) => s.status === SampleStatus.VERIFIED || (s.findings.length > 0 && s.findings.every((f) => f.decision !== null))
    ).length;

    const allFindings = findings;
    const totalFindings = allFindings.length;
    const verifiedCompliantCount = allFindings.filter(
      (f: any) => f.status === FindingStatus.VERIFIED_COMPLIANT
    ).length;
    const verifiedNonCompliantCount = allFindings.filter(
      (f: any) =>
        f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
        (!f.isVerified && f.candidateStatus === 'POTENTIAL_NON_COMPLIANCE')
    ).length;
    const verifiedNotApplicableCount = allFindings.filter(
      (f: any) =>
        f.status === FindingStatus.VERIFIED_NOT_APPLICABLE ||
        (!f.isVerified && f.candidateStatus === 'NOT_APPLICABLE')
    ).length;
    const verifiedRequiresReviewCount = allFindings.filter(
      (f: any) =>
        f.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW ||
        (!f.isVerified && f.candidateStatus === 'REQUIRES_INSPECTOR_REVIEW')
    ).length;
    const officerCorrectionsCount = allFindings.filter((f: any) => f.isCorrected).length;

    const overallComplianceRate =
      totalFindings > 0 ? Math.round((verifiedCompliantCount / totalFindings) * 100) : 100;

    // Report Number & Cryptographic Verification Hash
    const reportNumber = `REP-${inspection.inspectionNumber.replace('INS-', '')}`;
    const reportGeneratedAt = new Date();
    const inspectionCreatedIso = new Date(inspection.createdAt).toISOString();
    const hashPayload = `${inspection.inspectionNumber}:${inspectionCreatedIso}:${totalFindings}:${verifiedNonCompliantCount}`;
    const verificationHash = crypto.createHash('sha256').update(hashPayload).digest('hex').substring(0, 20);

    const reportData: InspectionReportDTO = {
      metadata: {
        inspectionId: inspection._id.toString(),
        inspectionNumber: inspection.inspectionNumber,
        reportNumber,
        commodity: inspection.commodity,
        brand: inspection.brand,
        packageContext: inspection.packageContext,
        location: inspection.location,
        market: inspection.market,
        samplesCount: inspection.samplesCount,
        status: inspection.status,
        remarks: inspection.remarks,
        inspectorId: inspection.inspectorId,
        inspectorName: user.name || 'Enforcement Officer',
        createdAt: inspection.createdAt,
        reportGeneratedAt,
      },
      summary: {
        totalSamplesExpected: inspection.samplesCount,
        totalSamplesActual,
        samplesReviewed,
        totalFindings,
        verifiedCompliantCount,
        verifiedNonCompliantCount,
        verifiedNotApplicableCount,
        verifiedRequiresReviewCount,
        officerCorrectionsCount,
        overallComplianceRate,
        finalStatus:
          verifiedNonCompliantCount > 0
            ? 'NON_COMPLIANT'
            : totalFindings > 0 && verifiedCompliantCount === totalFindings
            ? 'COMPLIANT'
            : inspection.status,
      },
      samples: processedSamples,
      legalDisclaimer:
        'This consolidated report records observations, deterministic rule evaluations, and authorized human Inspector verifications within the Smart Metrology assistive system (SIH26034). AI extractions are assistive observations and do not constitute independent statutory authority. Final inspection determinations remain strictly governed by the verified findings of the authorized Inspector under The Legal Metrology (Packaged Commodities) Rules, 2011.',
      systemIdentity: {
        appName: 'Smart Metrology',
        problemStatement: 'SIH26034',
        ruleDatabaseVersion:
          processedSamples[0]?.ruleEvaluation?.ruleDatabaseVersion || '1.0',
        verificationHash,
      },
    };

    return { reportData, forbidden: false };
  }
}

