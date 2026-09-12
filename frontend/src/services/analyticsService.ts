export interface AnalyticsFilterParams {
  timeRange?: 'today' | '7d' | '30d' | '90d' | 'this_year' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  inspectorId?: string;
  packageContext?: string;
  status?: string;
  commodity?: string;
  location?: string;
}

export interface AnalyticsOverviewData {
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
    overallComplianceRate: number;
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
    status: string;
    pendingFindingsCount: number;
    violationsCount: number;
    createdAt: string;
  }>;
}

export interface InspectorSupervisoryItem {
  id: string;
  name: string;
  username: string;
  badgeNumber: string;
  status: string;
  totalInspections: number;
  inProgress: number;
  completed: number;
  totalSamples: number;
  totalFindings: number;
  verifiedFindings: number;
  pendingReviews: number;
  violationsCount: number;
  lastActivityDate: string | null;
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
  candidateStatus: string;
  status: string;
  isVerified: boolean;
  isCorrected: boolean;
  aiValue: string | null;
  verifiedValue: string | null;
  inspectorNotes: string | null;
  createdAt: string;
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
    status: string;
    samplesCountDeclared: number;
    samplesCountActual: number;
    findingsCount: number;
    violationsCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CacheRecord<T> {
  data: T;
  timestamp: number;
}

const clientCache = new Map<string, CacheRecord<any>>();
const CLIENT_CACHE_TTL = 30 * 1000; // 30 seconds

export function clearAnalyticsClientCache(): void {
  clientCache.clear();
}

function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '' && val !== 'ALL') {
      query.append(key, String(val));
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchAnalyticsOverview(
  filters: AnalyticsFilterParams = {},
  forceRefresh: boolean = false
): Promise<AnalyticsOverviewData> {
  const cacheKey = `overview:${JSON.stringify(filters)}`;
  if (!forceRefresh) {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }
  }

  const qs = buildQueryString(filters);
  const response = await fetch(`/api/analytics/overview${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch supervisory analytics overview');
  }

  clientCache.set(cacheKey, { data: json.data, timestamp: Date.now() });
  return json.data;
}

export async function fetchSupervisoryInspectors(
  filters: AnalyticsFilterParams = {},
  forceRefresh: boolean = false
): Promise<InspectorSupervisoryItem[]> {
  const cacheKey = `inspectors:${JSON.stringify(filters)}`;
  if (!forceRefresh) {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }
  }

  const qs = buildQueryString(filters);
  const response = await fetch(`/api/analytics/inspectors${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch supervisory inspectors list');
  }

  clientCache.set(cacheKey, { data: json.data, timestamp: Date.now() });
  return json.data;
}

export async function fetchSupervisoryViolations(
  filters: AnalyticsFilterParams = {},
  forceRefresh: boolean = false
): Promise<SupervisoryViolationItem[]> {
  const cacheKey = `violations:${JSON.stringify(filters)}`;
  if (!forceRefresh) {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data;
    }
  }

  const qs = buildQueryString(filters);
  const response = await fetch(`/api/analytics/violations${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch supervisory violations');
  }

  clientCache.set(cacheKey, { data: json.data, timestamp: Date.now() });
  return json.data;
}

export async function fetchMonitoredInspections(
  params: AnalyticsFilterParams & { page?: number; limit?: number; search?: string; sortBy?: string; sortDir?: 'asc' | 'desc' } = {}
): Promise<MonitoredInspectionsResult> {
  const qs = buildQueryString(params);
  const response = await fetch(`/api/analytics/inspections${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || 'Failed to fetch monitored inspections');
  }

  return json.data;
}

/**
 * Lightweight client-side CSV export of analytics overview summary without heavy PDF dependencies.
 */
export function exportAnalyticsSummaryCSV(data: AnalyticsOverviewData, fileName = 'supervisory_analytics.csv'): void {
  const rows: string[][] = [
    ['SMART METROLOGY — SUPERVISORY ANALYTICS EXPORT'],
    ['Scope', data.filtersApplied.timeRange],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['EXECUTIVE SUMMARY METRICS', 'COUNT'],
    ['Total Inspections', String(data.summary.totalInspections)],
    ['Active Inspections', String(data.summary.activeInspections)],
    ['Completed Inspections', String(data.summary.completedInspections)],
    ['Inspections Requiring Review', String(data.summary.requiresReviewInspections)],
    ['Total Child Samples Evaluated', String(data.summary.totalSamples)],
    ['Total Statutory Findings', String(data.summary.totalFindings)],
    ['Verified Findings', String(data.summary.verifiedFindings)],
    ['Pending Findings', String(data.summary.pendingFindings)],
    ['Verified Compliant Declarations', String(data.summary.verifiedCompliantCount)],
    ['Verified Non-Compliant Violations', String(data.summary.verifiedNonCompliantCount)],
    ['Officer Value Corrections', String(data.summary.officerCorrectionsCount)],
    ['Statutory Compliance Rate %', `${data.summary.overallComplianceRate}%`],
    [],
    ['PACKAGE CONTEXT BREAKDOWN', 'COUNT'],
    ...data.charts.packageContextDistribution.map((c) => [c.label, String(c.count)]),
    [],
    ['DECLARATION TYPE FINDINGS', 'TOTAL', 'COMPLIANT', 'VIOLATIONS', 'PENDING'],
    ...data.charts.findingsByDeclarationType.map((d) => [
      d.declarationType,
      String(d.total),
      String(d.compliant),
      String(d.nonCompliant),
      String(d.pending),
    ]),
    [],
    ['TOP INSPECTED COMMODITIES', 'INSPECTIONS', 'VIOLATIONS'],
    ...data.breakdowns.topCommodities.map((c) => [c.commodity, String(c.inspections), String(c.violations)]),
  ];

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

