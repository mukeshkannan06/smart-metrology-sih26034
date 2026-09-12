import mongoose, { Types } from 'mongoose';
import fs from 'fs';
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
  AuditEvent,
  IAuditEvent,
  UserRole,
  InspectionStatus,
  PackageContext,
  FindingStatus,
} from '../models';
import { UserContext } from './inspection.service';
import { resolveTemporaryImagePath } from '../utils/tempStorage';

export interface HistoryListOptions {
  search?: string;
  status?: string;
  packageContext?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface HistoricalImageMetadata extends ISampleImage {
  availabilityState: 'AVAILABLE' | 'UNAVAILABLE_LIFECYCLE';
  streamUrl: string | null;
}

export interface HistoricalSampleDetail {
  _id: any;
  inspectionId: any;
  sampleNumber: number;
  sampleCode: string;
  status: any;
  notes?: string;
  images: HistoricalImageMetadata[];
  findingsCount: number;
  verifiedFindingsCount: number;
  nonCompliantCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HistoricalInspectionResponse {
  inspection: any;
  samples: HistoricalSampleDetail[];
  extractions: any[];
  ruleEvaluations: any[];
  findings: any[];
  auditTrail: any[];
  summary: {
    totalSamples: number;
    samplesVerified: number;
    totalFindings: number;
    verifiedFindings: number;
    compliantFindings: number;
    nonCompliantFindings: number;
    requiresReviewFindings: number;
    correctedObservationsCount: number;
    overallComplianceRate: number;
    percentVerified: number;
    isFullyAudited: boolean;
  };
}

export class HistoryService {
  /**
   * Retrieves paginated historical inspections with dynamic filters and aggregated KPI summary.
   * Inspectors can only view their own inspections. Controllers have jurisdiction-wide visibility.
   */
  public static async listHistoricalInspections(
    user: UserContext,
    options: HistoryListOptions = {}
  ): Promise<{
    inspections: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    summaryKpis: {
      totalInspections: number;
      completedCount: number;
      inProgressCount: number;
      totalSamples: number;
      totalFindings: number;
      verifiedFindings: number;
      complianceRate: number;
    };
  }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    // 1. Role-based scoping
    if (user.role === UserRole.INSPECTOR) {
      const inspectorId = user.inspectorId || user.id;
      query.$or = [{ inspectorId }, { inspectorId: user.id }];
    }

    // 2. Status filter
    if (options.status && Object.values(InspectionStatus).includes(options.status as InspectionStatus)) {
      query.status = options.status;
    }

    // 3. Package Context filter
    if (
      options.packageContext &&
      Object.values(PackageContext).includes(options.packageContext as PackageContext)
    ) {
      query.packageContext = options.packageContext;
    }

    // 4. Date range filter
    if (options.dateFrom || options.dateTo) {
      query.createdAt = {};
      if (options.dateFrom) {
        query.createdAt.$gte = new Date(options.dateFrom);
      }
      if (options.dateTo) {
        const toDate = new Date(options.dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    // 5. Search query across commodity, brand, location, inspectionNumber
    if (options.search && options.search.trim() !== '') {
      const searchRegex = new RegExp(options.search.trim(), 'i');
      const searchConditions = [
        { commodity: searchRegex },
        { brand: searchRegex },
        { location: searchRegex },
        { inspectionNumber: searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Execute queries
    const total = await Inspection.countDocuments(query);
    const totalPages = Math.ceil(total / limit) || 1;

    const rawInspections = await Inspection.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich inspections with sample and finding counts
    const inspectionIds = rawInspections.map((ins) => ins._id);

    const [allSamples, allFindings] = await Promise.all([
      Sample.find({ inspectionId: { $in: inspectionIds } }).select('_id inspectionId status').lean(),
      ComplianceFinding.find({ inspectionId: { $in: inspectionIds } }).select('_id inspectionId status isVerified candidateStatus').lean(),
    ]);

    const enrichedInspections = rawInspections.map((inspection) => {
      const insIdStr = inspection._id.toString();
      const samplesForIns = allSamples.filter((s) => s.inspectionId.toString() === insIdStr);
      const findingsForIns = allFindings.filter((f) => f.inspectionId.toString() === insIdStr);
      const verifiedFindings = findingsForIns.filter((f) => f.isVerified);
      const nonCompliantFindings = findingsForIns.filter(
        (f) => f.status === FindingStatus.VERIFIED_NON_COMPLIANT || (!f.isVerified && f.candidateStatus === 'POTENTIAL_NON_COMPLIANCE')
      );

      return {
        ...inspection,
        samplesCountActual: samplesForIns.length,
        totalFindingsCount: findingsForIns.length,
        verifiedFindingsCount: verifiedFindings.length,
        nonCompliantFindingsCount: nonCompliantFindings.length,
      };
    });

    // Compute scope-level summary KPIs (using role scope query without pagination)
    const scopeQuery: Record<string, any> = {};
    if (user.role === UserRole.INSPECTOR) {
      const inspectorId = user.inspectorId || user.id;
      scopeQuery.$or = [{ inspectorId }, { inspectorId: user.id }];
    }

    const [allScopeInspections, allScopeSamples, allScopeFindings] = await Promise.all([
      Inspection.find(scopeQuery).select('_id status').lean(),
      Sample.find(scopeQuery.$or ? { inspectionId: { $in: await Inspection.find(scopeQuery).distinct('_id') } } : {}).select('_id').lean(),
      ComplianceFinding.find(scopeQuery.$or ? { inspectionId: { $in: await Inspection.find(scopeQuery).distinct('_id') } } : {}).select('_id isVerified status candidateStatus').lean(),
    ]);

    const totalInspections = allScopeInspections.length;
    const completedCount = allScopeInspections.filter((i) => i.status === InspectionStatus.COMPLETED).length;
    const inProgressCount = allScopeInspections.filter(
      (i) => i.status === InspectionStatus.IN_PROGRESS || i.status === InspectionStatus.READY_FOR_SAMPLING
    ).length;

    const totalSamples = allScopeSamples.length;
    const totalFindings = allScopeFindings.length;
    const verifiedFindings = allScopeFindings.filter((f) => f.isVerified).length;
    const compliantCount = allScopeFindings.filter(
      (f) => f.status === FindingStatus.VERIFIED_COMPLIANT || (!f.isVerified && f.candidateStatus === 'COMPLIANT_CANDIDATE')
    ).length;

    const complianceRate = totalFindings > 0 ? Math.round((compliantCount / totalFindings) * 100) : 100;

    return {
      inspections: enrichedInspections,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      summaryKpis: {
        totalInspections,
        completedCount,
        inProgressCount,
        totalSamples,
        totalFindings,
        verifiedFindings,
        complianceRate,
      },
    };
  }

  /**
   * Retrieves the comprehensive historical inspection record.
   * Strictly read-only: does not execute AI, does not re-evaluate rules, and does not alter data.
   */
  public static async getHistoricalInspectionDetail(
    idOrNumber: string,
    user: UserContext
  ): Promise<{ inspectionData: HistoricalInspectionResponse | null; forbidden: boolean }> {
    let inspection: IInspection | null = null;

    if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
      inspection = await Inspection.findById(idOrNumber);
    }

    if (!inspection) {
      inspection = await Inspection.findOne({ inspectionNumber: idOrNumber.toUpperCase() });
    }

    if (!inspection) {
      return { inspectionData: null, forbidden: false };
    }

    // Role-based authorization: Inspectors can only access their own records
    if (user.role === UserRole.INSPECTOR) {
      const userBadge = user.inspectorId;
      const userMongoId = user.id;
      const isOwner =
        inspection.inspectorId === userBadge || inspection.inspectorId === userMongoId;

      if (!isOwner) {
        return { inspectionData: null, forbidden: true };
      }
    }

    // Fetch related records in parallel
    const [rawSamples, extractions, ruleEvaluations, findings, auditTrail] = await Promise.all([
      Sample.find({ inspectionId: inspection._id }).sort({ sampleNumber: 1 }).lean(),
      AIExtraction.find({ inspectionId: inspection._id }).sort({ createdAt: -1 }).lean(),
      RuleEvaluation.find({ inspectionId: inspection._id }).sort({ evaluated_at: -1 }).lean(),
      ComplianceFinding.find({ inspectionId: inspection._id }).sort({ ruleId: 1 }).lean(),
      AuditEvent.find({ inspectionId: inspection._id }).sort({ timestamp: 1 }).lean(),
    ]);

    // Format sample images with Evidence Availability State
    const enrichedSamples: HistoricalSampleDetail[] = rawSamples.map((sample) => {
      const sampleFindings = findings.filter(
        (f) => f.sampleId && f.sampleId.toString() === sample._id.toString()
      );
      const verifiedFindings = sampleFindings.filter((f) => f.isVerified);
      const nonCompliantFindings = sampleFindings.filter(
        (f) => f.status === FindingStatus.VERIFIED_NON_COMPLIANT || (!f.isVerified && f.candidateStatus === 'POTENTIAL_NON_COMPLIANCE')
      );

      const images: HistoricalImageMetadata[] = (sample.images || []).map((img: ISampleImage) => {
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
          ...img,
          availabilityState,
          streamUrl,
        };
      });

      return {
        ...sample,
        images,
        findingsCount: sampleFindings.length,
        verifiedFindingsCount: verifiedFindings.length,
        nonCompliantCount: nonCompliantFindings.length,
      };
    });

    // Compute aggregate summary metrics
    const totalSamples = enrichedSamples.length;
    const samplesVerified = enrichedSamples.filter(
      (s) => s.findingsCount > 0 && s.findingsCount === s.verifiedFindingsCount
    ).length;

    const totalFindings = findings.length;
    const verifiedFindings = findings.filter((f) => f.isVerified).length;
    const compliantFindings = findings.filter(
      (f) => f.status === FindingStatus.VERIFIED_COMPLIANT || (!f.isVerified && f.candidateStatus === 'COMPLIANT_CANDIDATE')
    ).length;
    const nonCompliantFindings = findings.filter(
      (f) => f.status === FindingStatus.VERIFIED_NON_COMPLIANT || (!f.isVerified && f.candidateStatus === 'POTENTIAL_NON_COMPLIANCE')
    ).length;
    const requiresReviewFindings = findings.filter(
      (f) => f.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW || (!f.isVerified && f.candidateStatus === 'REQUIRES_INSPECTOR_REVIEW')
    ).length;
    const correctedObservationsCount = findings.filter((f) => f.isCorrected).length;

    const overallComplianceRate = totalFindings > 0 ? Math.round((compliantFindings / totalFindings) * 100) : 100;
    const percentVerified = totalFindings > 0 ? Math.round((verifiedFindings / totalFindings) * 100) : 0;
    const isFullyAudited = totalFindings > 0 && verifiedFindings === totalFindings;

    return {
      inspectionData: {
        inspection,
        samples: enrichedSamples,
        extractions,
        ruleEvaluations,
        findings,
        auditTrail,
        summary: {
          totalSamples,
          samplesVerified,
          totalFindings,
          verifiedFindings,
          compliantFindings,
          nonCompliantFindings,
          requiresReviewFindings,
          correctedObservationsCount,
          overallComplianceRate,
          percentVerified,
          isFullyAudited,
        },
      },
      forbidden: false,
    };
  }

  /**
   * Retrieves only the chronological audit trail for an inspection with role-based checks.
   */
  public static async getInspectionAuditTrail(
    idOrNumber: string,
    user: UserContext,
    filters?: {
      entityType?: any;
      eventType?: any;
      source?: any;
    }
  ): Promise<{ auditTrail: IAuditEvent[] | null; forbidden: boolean }> {
    let inspection: IInspection | null = null;

    if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
      inspection = await Inspection.findById(idOrNumber);
    }

    if (!inspection) {
      inspection = await Inspection.findOne({ inspectionNumber: idOrNumber.toUpperCase() });
    }

    if (!inspection) {
      return { auditTrail: null, forbidden: false };
    }

    if (user.role === UserRole.INSPECTOR) {
      const userBadge = user.inspectorId;
      const userMongoId = user.id;
      const isOwner =
        inspection.inspectorId === userBadge || inspection.inspectorId === userMongoId;

      if (!isOwner) {
        return { auditTrail: null, forbidden: true };
      }
    }

    const { AuditService } = await import('./audit.service');
    const auditTrail = await AuditService.getInspectionAuditTrail(inspection._id, filters);

    return { auditTrail, forbidden: false };
  }
}
