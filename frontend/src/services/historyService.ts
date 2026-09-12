import { getApiUrl, getAuthHeaders } from './apiConfig';

export interface HistoryFilterOptions {
  search?: string;
  status?: string;
  packageContext?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface HistoricalImageMetadata {
  imageId: string;
  sequence: number;
  mimeType: string;
  sizeBytes: number;
  fileName: string;
  width?: number;
  height?: number;
  temporaryReference?: string;
  capturedAt: string;
  availabilityState: 'AVAILABLE' | 'UNAVAILABLE_LIFECYCLE';
  streamUrl: string | null;
}

export interface HistoricalSampleDetail {
  _id: string;
  inspectionId: string;
  sampleNumber: number;
  sampleCode: string;
  status: string;
  notes?: string;
  images: HistoricalImageMetadata[];
  findingsCount: number;
  applicableCount?: number;
  verifiedFindingsCount: number;
  verifiedApplicableCount?: number;
  nonCompliantCount: number;
  isSampleVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HistoricalFinding {
  _id: string;
  findingId: string;
  inspectionId: string;
  sampleId: string;
  sampleCode: string;
  ruleId: string;
  ruleReference: string;
  ruleFamily: string;
  declarationType: string;
  requirementDescription: string;
  candidateStatus: string;
  status: string;
  isVerified: boolean;
  isCorrected: boolean;
  aiObservation: {
    state: string;
    extractedValue?: string;
    normalizedValue?: string;
    confidence?: number;
    evidenceImageIds?: string[];
    evidenceDescriptions?: string[];
  };
  ruleEngineResult: {
    outcome: string;
    reason: string;
    applicabilityExplanation?: string;
    requiresInspectorReview?: boolean;
    ruleDatabaseVersion?: string;
    amendmentVersion?: string;
    evaluatedAt: string;
  };
  inspectorVerification: {
    isVerified: boolean;
    decision?: string | null;
    verifiedValue?: string | null;
    originalAiValuePreserved?: string | null;
    isCorrected: boolean;
    notes?: string | null;
    verifiedBy?: string | null;
    verifiedByName?: string | null;
    verifiedAt?: string | null;
  };
  createdAt?: string;
}

export interface HistoricalAuditEvent {
  _id: string;
  auditEventId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  inspectionId: string;
  sampleId?: string;
  findingId?: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  source: string;
  action: string;
  description: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface HistoricalInspectionDetail {
  inspection: {
    _id: string;
    inspectionNumber: string;
    inspectorId: string;
    commodity: string;
    brand?: string;
    packageContext: string;
    location: string;
    market?: string;
    samplesCount: number;
    status: string;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
  };
  samples: HistoricalSampleDetail[];
  extractions: any[];
  ruleEvaluations: any[];
  findings: HistoricalFinding[];
  auditTrail: HistoricalAuditEvent[];
  summary: {
    totalSamples: number;
    samplesVerified: number;
    totalFindings: number;
    totalApplicableFindings?: number;
    exemptFindingsCount?: number;
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

export interface HistoryListResponse {
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
}

interface CacheRecord<T> {
  data: T;
  timestamp: number;
}

const historyClientCache = new Map<string, CacheRecord<any>>();
const HISTORY_CACHE_TTL = 30 * 1000; // 30 seconds

export function clearHistoryClientCache(): void {
  historyClientCache.clear();
}

/**
 * Fetches paginated inspection history records with search and filters.
 */
export async function fetchInspectionHistory(
  options: HistoryFilterOptions = {},
  forceRefresh: boolean = false
): Promise<HistoryListResponse> {
  const cacheKey = `history:${JSON.stringify(options)}`;
  if (!forceRefresh) {
    const cached = historyClientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < HISTORY_CACHE_TTL) {
      return cached.data;
    }
  }

  const query = new URLSearchParams();
  if (options.search) query.append('search', options.search);
  if (options.status) query.append('status', options.status);
  if (options.packageContext) query.append('packageContext', options.packageContext);
  if (options.dateFrom) query.append('dateFrom', options.dateFrom);
  if (options.dateTo) query.append('dateTo', options.dateTo);
  if (options.page) query.append('page', String(options.page));
  if (options.limit) query.append('limit', String(options.limit));

  const url = getApiUrl(`/api/history/inspections${query.toString() ? `?${query.toString()}` : ''}`);
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load inspection history.');
  }

  const json = await response.json();
  const result: HistoryListResponse = {
    inspections: json.data || [],
    pagination: json.pagination || { total: 0, page: 1, limit: 10, totalPages: 1 },
    summaryKpis: json.summaryKpis || {
      totalInspections: 0,
      completedCount: 0,
      inProgressCount: 0,
      totalSamples: 0,
      totalFindings: 0,
      verifiedFindings: 0,
      complianceRate: 100,
    },
  };

  historyClientCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

/**
 * Fetches the full historical audit record for an inspection.
 * Strictly read-only.
 */
export async function fetchHistoricalInspectionDetail(
  id: string
): Promise<HistoricalInspectionDetail> {
  const response = await fetch(getApiUrl(`/api/history/inspections/${encodeURIComponent(id)}`), {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: You do not have permission to view this inspection audit record.');
    }
    if (response.status === 404) {
      throw new Error('Inspection audit record not found.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load historical inspection record.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Fetches the append-only chronological audit trail for an inspection.
 */
export async function fetchInspectionAuditTrail(
  id: string,
  filters?: { entityType?: string; eventType?: string; source?: string }
): Promise<HistoricalAuditEvent[]> {
  const query = new URLSearchParams();
  if (filters?.entityType) query.append('entityType', filters.entityType);
  if (filters?.eventType) query.append('eventType', filters.eventType);
  if (filters?.source) query.append('source', filters.source);

  const url = `/api/history/inspections/${encodeURIComponent(id)}/audit-trail${
    query.toString() ? `?${query.toString()}` : ''
  }`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load audit trail.');
  }

  const json = await response.json();
  return json.data || [];
}

