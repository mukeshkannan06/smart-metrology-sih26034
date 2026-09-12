import mongoose, { PipelineStage } from 'mongoose';
import {
  Inspection,
  PackageContext,
  InspectionStatus,
  Sample,
  ComplianceFinding,
  FindingStatus,
  FindingCandidateStatus,
  User,
  UserRole,
  UserStatus,
} from '../models';
import { UserContext } from './inspection.service';

export interface AnalyticsFilterParams {
  timeRange?: 'today' | '7d' | '30d' | '90d' | 'this_year' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  inspectorId?: string;
  packageContext?: PackageContext;
  status?: InspectionStatus;
  commodity?: string;
  location?: string;
}

export interface AnalyticsOverviewDTO {
  filtersApplied: {
    timeRange: string;
    startDate?: string;
    endDate?: string;
    inspectorId?: string;
    packageContext?: string;
    status?: string;
  };
  summary: {
    totalInspections: number;
    activeInspections: number;
    completedInspections: number;
    requiresReviewInspections: number;
    totalSamples: number;
    totalFindings: number;
    verifiedFindings: number;
    pendingFindings: number;
    verifiedCompliantCount: number;
    verifiedNonCompliantCount: number;
    verifiedNotApplicableCount: number;
    verifiedRequiresReviewCount: number;
    officerCorrectionsCount: number;
    overallComplianceRate: number; // calculated as verifiedCompliant / totalVerifiedFindings
  };
  trends: {
    inspectionActivity: Array<{
      date: string;
      label: string;
      inspections: number;
      findings: number;
      violations: number;
    }>;
  };
  charts: {
    statusDistribution: Array<{ name: string; value: number; color: string }>;
    packageContextDistribution: Array<{ context: string; label: string; count: number }>;
    findingsByDeclarationType: Array<{
      declarationType: string;
      total: number;
      compliant: number;
      nonCompliant: number;
      pending: number;
    }>;
    inspectorWorkload: Array<{
      inspectorId: string;
      name: string;
      badge: string;
      inspections: number;
      samples: number;
      findings: number;
    }>;
  };
  breakdowns: {
    topCommodities: Array<{
      commodity: string;
      inspections: number;
      violations: number;
    }>;
    topLocations: Array<{
      location: string;
      inspections: number;
      market?: string;
    }>;
  };
  attentionRequired: Array<{
    inspectionId: string;
    inspectionNumber: string;
    commodity: string;
    brand?: string;
    packageContext: string;
    inspectorName: string;
    inspectorBadge: string;
    status: InspectionStatus;
    pendingFindingsCount: number;
    violationsCount: number;
    createdAt: Date;
  }>;
}

export interface InspectorSupervisoryItem {
  id: string;
  name: string;
  username: string;
  badgeNumber: string;
  status: UserStatus;
  totalInspections: number;
  inProgress: number;
  completed: number;
  totalSamples: number;
  totalFindings: number;
  verifiedFindings: number;
  pendingReviews: number;
  violationsCount: number;
  lastActivityDate: Date | null;
}

export interface SupervisoryViolationItem {
  findingId: string;
  inspectionId: string;
  inspectionNumber: string;
  inspectorName: string;
  inspectorBadge: string;
  commodity: string;
  brand?: string;
  packageContext: string;
  declarationType: string;
  ruleId: string;
  ruleReference: string;
  requirementDescription: string;
  candidateStatus: FindingCandidateStatus;
  status: FindingStatus;
  isVerified: boolean;
  isCorrected: boolean;
  aiValue: string | null;
  verifiedValue: string | null;
  inspectorNotes: string | null;
  createdAt: Date;
}

export interface MonitoredInspectionsResult {
  inspections: Array<{
    id: string;
    inspectionNumber: string;
    inspectorId: string;
    inspectorName: string;
    inspectorBadge: string;
    commodity: string;
    brand?: string;
    packageContext: string;
    location: string;
    market?: string;
    status: InspectionStatus;
    samplesCountDeclared: number;
    samplesCountActual: number;
    findingsCount: number;
    violationsCount: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class AnalyticsService {
  /**
   * Helper to build date boundary match conditions based on user filter.
   */
  private static parseDateRange(filters: AnalyticsFilterParams): {
    start?: Date;
    end?: Date;
    timeRangeLabel: string;
  } {
    const now = new Date();
    const timeRange = filters.timeRange || '30d';

    if (timeRange === 'custom') {
      const start = filters.startDate ? new Date(filters.startDate) : undefined;
      const end = filters.endDate ? new Date(filters.endDate) : undefined;
      if (start && isNaN(start.getTime())) throw new Error('Invalid startDate format');
      if (end && isNaN(end.getTime())) throw new Error('Invalid endDate format');
      if (start && end && start > end) {
        throw new Error('startDate must be before or equal to endDate');
      }
      return { start, end, timeRangeLabel: 'Custom Range' };
    }

    if (timeRange === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start, end: now, timeRangeLabel: 'Today' };
    }

    if (timeRange === '7d') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start, end: now, timeRangeLabel: 'Last 7 Days' };
    }

    if (timeRange === '30d') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start, end: now, timeRangeLabel: 'Last 30 Days' };
    }

    if (timeRange === '90d') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start, end: now, timeRangeLabel: 'Last 90 Days' };
    }

    if (timeRange === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      return { start, end: now, timeRangeLabel: 'This Year' };
    }

    // 'all' or fallback
    return { timeRangeLabel: 'All Time' };
  }

  /**
   * Builds the base MongoDB $match object for Inspection queries.
   */
  private static buildInspectionMatch(
    filters: AnalyticsFilterParams,
    dateRange: { start?: Date; end?: Date }
  ): Record<string, any> {
    const match: Record<string, any> = {};

    if (dateRange.start || dateRange.end) {
      match.createdAt = {};
      if (dateRange.start) match.createdAt.$gte = dateRange.start;
      if (dateRange.end) match.createdAt.$lte = dateRange.end;
    }

    if (filters.inspectorId && filters.inspectorId !== 'ALL') {
      match.$or = [
        { inspectorId: filters.inspectorId },
        ...(mongoose.Types.ObjectId.isValid(filters.inspectorId)
          ? [{ inspectorId: new mongoose.Types.ObjectId(filters.inspectorId) }]
          : []),
      ];
    }

    if (filters.packageContext && filters.packageContext !== ('ALL' as any)) {
      match.packageContext = filters.packageContext;
    }

    if (filters.status && filters.status !== ('ALL' as any)) {
      match.status = filters.status;
    }

    if (filters.commodity && filters.commodity.trim()) {
      match.commodity = { $regex: filters.commodity.trim(), $options: 'i' };
    }

    if (filters.location && filters.location.trim()) {
      match.location = { $regex: filters.location.trim(), $options: 'i' };
    }

    return match;
  }

  /**
   * Main overview analytics aggregation for Assistant Controller Dashboard and Reports.
   */
  public static async getOverviewAnalytics(
    filters: AnalyticsFilterParams,
    user: UserContext
  ): Promise<AnalyticsOverviewDTO> {
    if (user.role !== UserRole.ASSISTANT_CONTROLLER) {
      const err: any = new Error('Access denied. Supervisory analytics requires Assistant Controller role.');
      err.statusCode = 403;
      throw err;
    }

    const dateRange = this.parseDateRange(filters);
    const inspectionMatch = this.buildInspectionMatch(filters, dateRange);

    // 1. Fetch matching inspections and enrolled inspectors concurrently
    const [matchingInspections, inspectors] = await Promise.all([
      Inspection.find(inspectionMatch).sort({ createdAt: -1 }).lean(),
      User.find({ role: UserRole.INSPECTOR }).select('name username inspectorId status').lean(),
    ]);

    const matchingInspectionIds = matchingInspections.map((i) => i._id);

    // 2. Fetch associated samples and findings in parallel
    const [matchingSamples, matchingFindings] = await Promise.all([
      matchingInspectionIds.length > 0
        ? Sample.find({ inspectionId: { $in: matchingInspectionIds } }).lean()
        : [],
      matchingInspectionIds.length > 0
        ? ComplianceFinding.find({ inspectionId: { $in: matchingInspectionIds } }).lean()
        : [],
    ]);

    // 3. Compute Executive Summary KPIs
    const totalInspections = matchingInspections.length;
    const activeInspections = matchingInspections.filter(
      (i) => i.status === InspectionStatus.IN_PROGRESS || i.status === InspectionStatus.READY_FOR_SAMPLING
    ).length;
    const completedInspections = matchingInspections.filter(
      (i) => i.status === InspectionStatus.COMPLETED
    ).length;
    const requiresReviewInspections = matchingInspections.filter(
      (i) =>
        i.status === InspectionStatus.READY_FOR_SAMPLING ||
        (i.status === InspectionStatus.IN_PROGRESS &&
          matchingFindings.some((f) => f.inspectionId.toString() === i._id.toString() && !f.isVerified))
    ).length;

    const totalSamples = matchingSamples.length;
    const totalFindings = matchingFindings.length;
    const verifiedFindings = matchingFindings.filter((f) => f.isVerified).length;
    const pendingFindings = matchingFindings.filter((f) => !f.isVerified).length;

    const verifiedCompliantCount = matchingFindings.filter(
      (f) => f.status === FindingStatus.VERIFIED_COMPLIANT
    ).length;
    const verifiedNonCompliantCount = matchingFindings.filter(
      (f) => f.status === FindingStatus.VERIFIED_NON_COMPLIANT
    ).length;
    const verifiedNotApplicableCount = matchingFindings.filter(
      (f) => f.status === FindingStatus.VERIFIED_NOT_APPLICABLE
    ).length;
    const verifiedRequiresReviewCount = matchingFindings.filter(
      (f) => f.status === FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW
    ).length;
    const officerCorrectionsCount = matchingFindings.filter((f) => f.isCorrected).length;

    const totalVerifiedJudgments = verifiedCompliantCount + verifiedNonCompliantCount;
    const overallComplianceRate =
      totalVerifiedJudgments > 0
        ? Math.round((verifiedCompliantCount / totalVerifiedJudgments) * 100)
        : 100;

    // 4. Time-Series Trend (Daily / Weekly Bucketing)
    const dateBuckets: Record<string, { inspections: number; findings: number; violations: number }> = {};

    // Group matching inspections by date (YYYY-MM-DD)
    matchingInspections.forEach((insp) => {
      const dateKey = new Date(insp.createdAt).toISOString().split('T')[0];
      if (!dateBuckets[dateKey]) {
        dateBuckets[dateKey] = { inspections: 0, findings: 0, violations: 0 };
      }
      dateBuckets[dateKey].inspections += 1;
    });

    // Group matching findings by date
    matchingFindings.forEach((finding) => {
      const dateKey = new Date(finding.createdAt).toISOString().split('T')[0];
      if (!dateBuckets[dateKey]) {
        dateBuckets[dateKey] = { inspections: 0, findings: 0, violations: 0 };
      }
      dateBuckets[dateKey].findings += 1;
      if (
        finding.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
        (!finding.isVerified && finding.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE)
      ) {
        dateBuckets[dateKey].violations += 1;
      }
    });

    const sortedDates = Object.keys(dateBuckets).sort();
    const inspectionActivity = sortedDates.map((dateStr) => {
      const d = new Date(dateStr);
      const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      return {
        date: dateStr,
        label,
        inspections: dateBuckets[dateStr].inspections,
        findings: dateBuckets[dateStr].findings,
        violations: dateBuckets[dateStr].violations,
      };
    });

    // 5. Inspection Status Distribution Chart
    const statusDistribution = [
      { name: 'Completed', value: completedInspections, color: '#10b981' },
      { name: 'In Progress', value: activeInspections, color: '#f59e0b' },
      {
        name: 'Archived',
        value: matchingInspections.filter((i) => i.status === InspectionStatus.ARCHIVED).length,
        color: '#64748b',
      },
    ].filter((s) => s.value > 0);

    // 6. Package Context Distribution Chart (Canonical 5 Contexts Only)
    const contextMap: Record<string, { label: string; count: number }> = {
      RETAIL_PACKAGE: { label: 'Retail Package', count: 0 },
      WHOLESALE_PACKAGE: { label: 'Wholesale Package', count: 0 },
      INDUSTRIAL_INSTITUTIONAL_PACKAGE: { label: 'Industrial / Institutional', count: 0 },
      IMPORTED_PACKAGE: { label: 'Imported Package', count: 0 },
      EXPORT_PACKAGE: { label: 'Export Package', count: 0 },
    };

    matchingInspections.forEach((insp) => {
      if (contextMap[insp.packageContext]) {
        contextMap[insp.packageContext].count += 1;
      }
    });

    const packageContextDistribution = Object.entries(contextMap).map(([ctxKey, val]) => ({
      context: ctxKey,
      label: val.label,
      count: val.count,
    }));

    // 7. Findings by Declaration Type Chart
    const declTypeMap: Record<
      string,
      { total: number; compliant: number; nonCompliant: number; pending: number }
    > = {};

    matchingFindings.forEach((f) => {
      const type = f.declarationType || 'OTHER';
      if (!declTypeMap[type]) {
        declTypeMap[type] = { total: 0, compliant: 0, nonCompliant: 0, pending: 0 };
      }
      declTypeMap[type].total += 1;
      if (f.status === FindingStatus.VERIFIED_COMPLIANT) {
        declTypeMap[type].compliant += 1;
      } else if (
        f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
        (!f.isVerified && f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE)
      ) {
        declTypeMap[type].nonCompliant += 1;
      } else {
        declTypeMap[type].pending += 1;
      }
    });

    const findingsByDeclarationType = Object.entries(declTypeMap)
      .map(([declarationType, stats]) => ({
        declarationType,
        ...stats,
      }))
      .sort((a, b) => b.total - a.total);

    // 8. Inspector Workload & Activity
    const inspectorWorkload = inspectors.map((insp) => {
      const officerInspections = matchingInspections.filter(
        (i) => i.inspectorId === insp.inspectorId || i.inspectorId === insp._id.toString()
      );
      const officerInspectionIds = new Set(officerInspections.map((i) => i._id.toString()));
      const officerSamples = matchingSamples.filter((s) =>
        officerInspectionIds.has(s.inspectionId.toString())
      );
      const officerFindings = matchingFindings.filter((f) =>
        officerInspectionIds.has(f.inspectionId.toString())
      );

      return {
        inspectorId: insp.inspectorId || insp._id.toString(),
        name: insp.name,
        badge: insp.inspectorId || 'N/A',
        inspections: officerInspections.length,
        samples: officerSamples.length,
        findings: officerFindings.length,
      };
    });

    // 9. Top Commodities Breakdown
    const commodityMap: Record<string, { inspections: number; violations: number }> = {};
    matchingInspections.forEach((insp) => {
      const comm = insp.commodity || 'Unspecified';
      if (!commodityMap[comm]) {
        commodityMap[comm] = { inspections: 0, violations: 0 };
      }
      commodityMap[comm].inspections += 1;
    });

    matchingFindings.forEach((f) => {
      const insp = matchingInspections.find((i) => i._id.toString() === f.inspectionId.toString());
      if (
        insp &&
        (f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
          (!f.isVerified && f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE))
      ) {
        const comm = insp.commodity || 'Unspecified';
        if (commodityMap[comm]) {
          commodityMap[comm].violations += 1;
        }
      }
    });

    const topCommodities = Object.entries(commodityMap)
      .map(([commodity, stats]) => ({
        commodity,
        inspections: stats.inspections,
        violations: stats.violations,
      }))
      .sort((a, b) => b.inspections - a.inspections)
      .slice(0, 8);

    // 10. Top Locations Activity
    const locationMap: Record<string, { inspections: number; market?: string }> = {};
    matchingInspections.forEach((insp) => {
      const loc = insp.location || 'Unspecified Location';
      if (!locationMap[loc]) {
        locationMap[loc] = { inspections: 0, market: insp.market };
      }
      locationMap[loc].inspections += 1;
    });

    const topLocations = Object.entries(locationMap)
      .map(([location, stats]) => ({
        location,
        inspections: stats.inspections,
        market: stats.market,
      }))
      .sort((a, b) => b.inspections - a.inspections)
      .slice(0, 8);

    // 11. Attention Required Section (Inspections with pending reviews or violations)
    const attentionRequired = matchingInspections
      .map((insp) => {
        const inspIdStr = insp._id.toString();
        const inspFindings = matchingFindings.filter((f) => f.inspectionId.toString() === inspIdStr);
        const pendingFindingsCount = inspFindings.filter((f) => !f.isVerified).length;
        const violationsCount = inspFindings.filter(
          (f) =>
            f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
            (!f.isVerified && f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE)
        ).length;

        const officer = inspectors.find(
          (u) => u.inspectorId === insp.inspectorId || u._id.toString() === insp.inspectorId
        );

        return {
          inspectionId: inspIdStr,
          inspectionNumber: insp.inspectionNumber,
          commodity: insp.commodity,
          brand: insp.brand,
          packageContext: insp.packageContext,
          inspectorName: officer?.name || `Inspector (${insp.inspectorId})`,
          inspectorBadge: officer?.inspectorId || insp.inspectorId,
          status: insp.status,
          pendingFindingsCount,
          violationsCount,
          createdAt: insp.createdAt,
        };
      })
      .filter((item) => item.violationsCount > 0 || item.pendingFindingsCount > 0 || item.status === InspectionStatus.IN_PROGRESS)
      .sort((a, b) => b.violationsCount - a.violationsCount || b.pendingFindingsCount - a.pendingFindingsCount)
      .slice(0, 6);

    return {
      filtersApplied: {
        timeRange: dateRange.timeRangeLabel,
        startDate: filters.startDate,
        endDate: filters.endDate,
        inspectorId: filters.inspectorId,
        packageContext: filters.packageContext,
        status: filters.status,
      },
      summary: {
        totalInspections,
        activeInspections,
        completedInspections,
        requiresReviewInspections,
        totalSamples,
        totalFindings,
        verifiedFindings,
        pendingFindings,
        verifiedCompliantCount,
        verifiedNonCompliantCount,
        verifiedNotApplicableCount,
        verifiedRequiresReviewCount,
        officerCorrectionsCount,
        overallComplianceRate,
      },
      trends: {
        inspectionActivity,
      },
      charts: {
        statusDistribution,
        packageContextDistribution,
        findingsByDeclarationType,
        inspectorWorkload,
      },
      breakdowns: {
        topCommodities,
        topLocations,
      },
      attentionRequired,
    };
  }

  /**
   * Supervisory view of all inspectors and their actual performance metrics.
   */
  public static async getInspectorsAnalytics(
    filters: AnalyticsFilterParams,
    user: UserContext
  ): Promise<InspectorSupervisoryItem[]> {
    if (user.role !== UserRole.ASSISTANT_CONTROLLER) {
      const err: any = new Error('Access denied. Supervisory analytics requires Assistant Controller role.');
      err.statusCode = 403;
      throw err;
    }

    const dateRange = this.parseDateRange(filters);
    const inspectionMatch = this.buildInspectionMatch(filters, dateRange);

    const [inspectors, inspections, samples, findings] = await Promise.all([
      User.find({ role: UserRole.INSPECTOR }).sort({ name: 1 }).lean(),
      Inspection.find(inspectionMatch).sort({ createdAt: -1 }).lean(),
      Sample.find().lean(),
      ComplianceFinding.find().lean(),
    ]);

    return inspectors.map((insp) => {
      const officerInspections = inspections.filter(
        (i) => i.inspectorId === insp.inspectorId || i.inspectorId === insp._id.toString()
      );
      const officerInspectionIds = new Set(officerInspections.map((i) => i._id.toString()));

      const officerSamples = samples.filter((s) =>
        officerInspectionIds.has(s.inspectionId.toString())
      );
      const officerFindings = findings.filter((f) =>
        officerInspectionIds.has(f.inspectionId.toString())
      );

      const inProgress = officerInspections.filter((i) => i.status === InspectionStatus.IN_PROGRESS).length;
      const completed = officerInspections.filter((i) => i.status === InspectionStatus.COMPLETED).length;
      const verifiedFindings = officerFindings.filter((f) => f.isVerified).length;
      const pendingReviews = officerFindings.filter((f) => !f.isVerified).length;
      const violationsCount = officerFindings.filter(
        (f) =>
          f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
          (!f.isVerified && f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE)
      ).length;

      const lastInspection = officerInspections[0];
      const lastActivityDate = lastInspection ? lastInspection.createdAt : null;

      return {
        id: insp._id.toString(),
        name: insp.name,
        username: insp.username,
        badgeNumber: insp.inspectorId || 'N/A',
        status: insp.status,
        totalInspections: officerInspections.length,
        inProgress,
        completed,
        totalSamples: officerSamples.length,
        totalFindings: officerFindings.length,
        verifiedFindings,
        pendingReviews,
        violationsCount,
        lastActivityDate,
      };
    });
  }

  /**
   * Supervisory view of all violations/observations across the jurisdiction.
   */
  public static async getViolationsAnalytics(
    filters: AnalyticsFilterParams,
    user: UserContext
  ): Promise<SupervisoryViolationItem[]> {
    if (user.role !== UserRole.ASSISTANT_CONTROLLER) {
      const err: any = new Error('Access denied. Supervisory analytics requires Assistant Controller role.');
      err.statusCode = 403;
      throw err;
    }

    const dateRange = this.parseDateRange(filters);
    const inspectionMatch = this.buildInspectionMatch(filters, dateRange);

    const [inspections, inspectors] = await Promise.all([
      Inspection.find(inspectionMatch).select('inspectionNumber inspectorId commodity brand packageContext').lean(),
      User.find({ role: UserRole.INSPECTOR }).select('name inspectorId').lean(),
    ]);

    const inspectionMap = new Map<string, any>();
    inspections.forEach((i) => inspectionMap.set(i._id.toString(), i));
    const inspectionIds = Array.from(inspectionMap.keys());

    if (inspectionIds.length === 0) {
      return [];
    }

    // Find all findings in these inspections that are non-compliant or potential violations
    const findings = await ComplianceFinding.find({
      inspectionId: { $in: inspectionIds },
      $or: [
        { status: FindingStatus.VERIFIED_NON_COMPLIANT },
        { candidateStatus: FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    return findings.map((f) => {
      const insp = inspectionMap.get(f.inspectionId.toString());
      const officer = inspectors.find(
        (u) => u.inspectorId === insp?.inspectorId || u._id.toString() === insp?.inspectorId
      );

      return {
        findingId: f.findingId,
        inspectionId: f.inspectionId.toString(),
        inspectionNumber: insp?.inspectionNumber || 'N/A',
        inspectorName: officer?.name || `Inspector (${insp?.inspectorId || 'N/A'})`,
        inspectorBadge: officer?.inspectorId || insp?.inspectorId || 'N/A',
        commodity: insp?.commodity || 'Unknown Commodity',
        brand: insp?.brand,
        packageContext: insp?.packageContext || 'RETAIL_PACKAGE',
        declarationType: f.declarationType,
        ruleId: f.ruleId,
        ruleReference: f.ruleReference,
        requirementDescription: f.requirementDescription,
        candidateStatus: f.candidateStatus,
        status: f.status,
        isVerified: f.isVerified,
        isCorrected: f.isCorrected,
        aiValue: f.aiObservation?.extractedValue || null,
        verifiedValue: f.inspectorVerification?.verifiedValue || null,
        inspectorNotes: f.inspectorVerification?.notes || null,
        createdAt: f.createdAt,
      };
    });
  }

  /**
   * Monitored Inspections list with search, sorting, and pagination.
   */
  public static async getMonitoredInspections(
    filters: AnalyticsFilterParams & { page?: number; limit?: number; search?: string; sortBy?: string; sortDir?: 'asc' | 'desc' },
    user: UserContext
  ): Promise<MonitoredInspectionsResult> {
    if (user.role !== UserRole.ASSISTANT_CONTROLLER) {
      const err: any = new Error('Access denied. Supervisory analytics requires Assistant Controller role.');
      err.statusCode = 403;
      throw err;
    }

    const dateRange = this.parseDateRange(filters);
    const match = this.buildInspectionMatch(filters, dateRange);

    if (filters.search && filters.search.trim()) {
      const searchRegex = { $regex: filters.search.trim(), $options: 'i' };
      match.$or = [
        { inspectionNumber: searchRegex },
        { commodity: searchRegex },
        { brand: searchRegex },
        { location: searchRegex },
        { inspectorId: searchRegex },
      ];
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const sortDir = filters.sortDir === 'asc' ? 1 : -1;
    const sortField = filters.sortBy === 'inspectionNumber' ? 'inspectionNumber' : 'createdAt';
    const sortObj: Record<string, any> = { [sortField]: sortDir };

    const [total, inspections, inspectors] = await Promise.all([
      Inspection.countDocuments(match),
      Inspection.find(match).sort(sortObj).skip(skip).limit(limit).lean(),
      User.find({ role: UserRole.INSPECTOR }).select('name inspectorId').lean(),
    ]);

    const inspectionIds = inspections.map((i) => i._id);

    const [samples, findings] = await Promise.all([
      inspectionIds.length > 0
        ? Sample.find({ inspectionId: { $in: inspectionIds } }).select('inspectionId').lean()
        : [],
      inspectionIds.length > 0
        ? ComplianceFinding.find({ inspectionId: { $in: inspectionIds } }).select('inspectionId status candidateStatus').lean()
        : [],
    ]);

    const items = inspections.map((insp) => {
      const inspIdStr = insp._id.toString();
      const officer = inspectors.find(
        (u) => u.inspectorId === insp.inspectorId || u._id.toString() === insp.inspectorId
      );
      const actualSamples = samples.filter((s) => s.inspectionId.toString() === inspIdStr).length;
      const inspFindings = findings.filter((f) => f.inspectionId.toString() === inspIdStr);
      const violationsCount = inspFindings.filter(
        (f) =>
          f.status === FindingStatus.VERIFIED_NON_COMPLIANT ||
          f.candidateStatus === FindingCandidateStatus.POTENTIAL_NON_COMPLIANCE
      ).length;

      return {
        id: inspIdStr,
        inspectionNumber: insp.inspectionNumber,
        inspectorId: insp.inspectorId,
        inspectorName: officer?.name || `Inspector (${insp.inspectorId})`,
        inspectorBadge: officer?.inspectorId || insp.inspectorId,
        commodity: insp.commodity,
        brand: insp.brand,
        packageContext: insp.packageContext,
        location: insp.location,
        market: insp.market,
        status: insp.status,
        samplesCountDeclared: insp.samplesCount,
        samplesCountActual: actualSamples,
        findingsCount: inspFindings.length,
        violationsCount,
        createdAt: insp.createdAt,
        updatedAt: insp.updatedAt,
      };
    });

    return {
      inspections: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
