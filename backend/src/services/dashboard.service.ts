import { User, UserRole, UserStatus, Inspection, InspectionStatus, Sample, Rule, RuleStatus } from '../models';

export interface InspectorDashboardData {
  summary: {
    totalInspections: number;
    inProgress: number;
    completed: number;
    archived: number;
    totalSamples: number;
  };
  recentInspections: Array<{
    id: string;
    inspectionNumber: string;
    commodity: string;
    brand: string;
    packageContext: string;
    location: string;
    market: string;
    samplesCount: number;
    status: InspectionStatus;
    createdAt: Date;
  }>;
  charts: {
    statusDistribution: Array<{ name: string; value: number; color: string }>;
    contextDistribution: Array<{ context: string; count: number }>;
  };
}

export interface ControllerDashboardData {
  summary: {
    totalInspectors: number;
    totalInspections: number;
    inProgress: number;
    completed: number;
    archived: number;
    totalSamples: number;
    totalRules: number;
  };
  inspectorActivity: Array<{
    id: string;
    name: string;
    username: string;
    badgeNumber: string;
    totalInspections: number;
    inProgress: number;
    completed: number;
    status: UserStatus;
  }>;
  recentInspections: Array<{
    id: string;
    inspectionNumber: string;
    inspectorName: string;
    inspectorBadge: string;
    commodity: string;
    brand: string;
    packageContext: string;
    location: string;
    market: string;
    samplesCount: number;
    status: InspectionStatus;
    createdAt: Date;
  }>;
  charts: {
    statusDistribution: Array<{ name: string; value: number; color: string }>;
    contextDistribution: Array<{ context: string; count: number }>;
    inspectorWorkload: Array<{ name: string; badge: string; inspections: number }>;
  };
}

/**
 * Service to aggregate dashboard metrics for an authenticated Inspector.
 * Data is strictly isolated to the specified inspector identity.
 */
export async function getInspectorDashboardData(
  inspectorId: string,
  userMongoId?: string
): Promise<InspectorDashboardData> {
  // Query only inspections belonging to this inspector
  const query = userMongoId
    ? { $or: [{ inspectorId }, { inspectorId: userMongoId }] }
    : { inspectorId };

  const inspections = await Inspection.find(query).sort({ createdAt: -1 }).lean();

  const totalInspections = inspections.length;
  const inProgress = inspections.filter((i) => i.status === InspectionStatus.IN_PROGRESS).length;
  const completed = inspections.filter((i) => i.status === InspectionStatus.COMPLETED).length;
  const archived = inspections.filter((i) => i.status === InspectionStatus.ARCHIVED).length;

  // Count child samples examined across these inspections
  const inspectionIds = inspections.map((i) => i._id);
  const totalSamples =
    inspectionIds.length > 0
      ? await Sample.countDocuments({ inspectionId: { $in: inspectionIds } })
      : 0;

  // Format top 5 recent inspections
  const recentInspections = inspections.slice(0, 5).map((i) => ({
    id: i._id.toString(),
    inspectionNumber: i.inspectionNumber,
    commodity: i.commodity,
    brand: i.brand || '',
    packageContext: i.packageContext,
    location: i.location,
    market: i.market || '',
    samplesCount: i.samplesCount,
    status: i.status,
    createdAt: i.createdAt,
  }));

  // Status distribution for charts
  const statusDistribution = [
    { name: 'In Progress', value: inProgress, color: '#f59e0b' },
    { name: 'Completed', value: completed, color: '#10b981' },
    { name: 'Archived', value: archived, color: '#64748b' },
  ].filter((s) => s.value > 0);

  // Package context distribution for charts
  const contextCounts: Record<string, number> = {};
  inspections.forEach((i) => {
    const label = i.packageContext.replace(/_/g, ' ');
    contextCounts[label] = (contextCounts[label] || 0) + 1;
  });

  const contextDistribution = Object.entries(contextCounts).map(([context, count]) => ({
    context,
    count,
  }));

  return {
    summary: {
      totalInspections,
      inProgress,
      completed,
      archived,
      totalSamples,
    },
    recentInspections,
    charts: {
      statusDistribution,
      contextDistribution,
    },
  };
}

/**
 * Service to aggregate supervisory dashboard metrics for the Assistant Controller.
 * Aggregates across all enrolled field inspectors and global inspections.
 */
export async function getControllerDashboardData(): Promise<ControllerDashboardData> {
  // Query all active inspectors
  const inspectors = await User.find({
    role: UserRole.INSPECTOR,
    status: UserStatus.ACTIVE,
  })
    .select('name username inspectorId status createdAt')
    .lean();

  const totalInspectors = inspectors.length;

  // Query all inspections across the jurisdiction
  const allInspections = await Inspection.find().sort({ createdAt: -1 }).lean();

  const totalInspections = allInspections.length;
  const inProgress = allInspections.filter((i) => i.status === InspectionStatus.IN_PROGRESS).length;
  const completed = allInspections.filter((i) => i.status === InspectionStatus.COMPLETED).length;
  const archived = allInspections.filter((i) => i.status === InspectionStatus.ARCHIVED).length;

  const totalSamples = await Sample.countDocuments();
  const totalRules = await Rule.countDocuments({ status: RuleStatus.ACTIVE });

  // Map inspector activity roster
  const inspectorActivity = inspectors.map((insp) => {
    const officerInspections = allInspections.filter(
      (i) => i.inspectorId === insp.inspectorId || i.inspectorId === insp._id.toString()
    );
    return {
      id: insp._id.toString(),
      name: insp.name,
      username: insp.username,
      badgeNumber: insp.inspectorId || 'N/A',
      totalInspections: officerInspections.length,
      inProgress: officerInspections.filter((i) => i.status === InspectionStatus.IN_PROGRESS).length,
      completed: officerInspections.filter((i) => i.status === InspectionStatus.COMPLETED).length,
      status: insp.status,
    };
  });

  // Format top 10 global recent inspections with officer badge details
  const recentInspections = allInspections.slice(0, 10).map((i) => {
    const officer = inspectors.find(
      (u) => u.inspectorId === i.inspectorId || u._id.toString() === i.inspectorId
    );
    return {
      id: i._id.toString(),
      inspectionNumber: i.inspectionNumber,
      inspectorName: officer?.name || `Inspector (${i.inspectorId})`,
      inspectorBadge: officer?.inspectorId || i.inspectorId,
      commodity: i.commodity,
      brand: i.brand || '',
      packageContext: i.packageContext,
      location: i.location,
      market: i.market || '',
      samplesCount: i.samplesCount,
      status: i.status,
      createdAt: i.createdAt,
    };
  });

  // Supervisory Status distribution for charts
  const statusDistribution = [
    { name: 'In Progress', value: inProgress, color: '#f59e0b' },
    { name: 'Completed', value: completed, color: '#10b981' },
    { name: 'Archived', value: archived, color: '#64748b' },
  ].filter((s) => s.value > 0);

  // Packaging Context Breakdown across all inspections
  const contextCounts: Record<string, number> = {};
  allInspections.forEach((i) => {
    const label = i.packageContext.replace(/_/g, ' ');
    contextCounts[label] = (contextCounts[label] || 0) + 1;
  });

  const contextDistribution = Object.entries(contextCounts).map(([context, count]) => ({
    context,
    count,
  }));

  // Inspector Workload Comparison for charts
  const inspectorWorkload = inspectorActivity.map((insp) => ({
    name: insp.name,
    badge: insp.badgeNumber,
    inspections: insp.totalInspections,
  }));

  return {
    summary: {
      totalInspectors,
      totalInspections,
      inProgress,
      completed,
      archived,
      totalSamples,
      totalRules,
    },
    inspectorActivity,
    recentInspections,
    charts: {
      statusDistribution,
      contextDistribution,
      inspectorWorkload,
    },
  };
}

