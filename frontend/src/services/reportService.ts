import { getApiUrl, getAuthHeaders } from './apiConfig';

export interface ReportImageDetail {
  imageId: string;
  sequence: number;
  fileName?: string;
  sizeBytes: number;
  mimeType: string;
  availabilityState: 'AVAILABLE' | 'UNAVAILABLE_LIFECYCLE';
  streamUrl: string | null;
  capturedAt: string;
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
  verifiedAt: string | null;
}

export interface ReportSampleDetail {
  sampleId: string;
  sampleNumber: number;
  sampleCode: string;
  status: string;
  notes?: string;
  createdAt: string;
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
    evaluatedAt: string;
    summary: {
      total_rules_evaluated: number;
      applicable_count: number;
      potential_violations_count: number;
    };
  };
  findings: ReportFindingDetail[];
}

export interface InspectionReportDTO {
  metadata: {
    inspectionId: string;
    inspectionNumber: string;
    reportNumber: string;
    commodity: string;
    brand?: string;
    packageContext: string;
    location: string;
    market?: string;
    samplesCount: number;
    status: string;
    remarks?: string;
    inspectorId: string;
    inspectorName: string;
    createdAt: string;
    reportGeneratedAt: string;
  };
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

/**
 * Fetches consolidated inspection report data from the backend.
 * Strictly read-only; gated by RBAC.
 */
export async function fetchInspectionReportData(inspectionId: string): Promise<InspectionReportDTO> {
  const response = await fetch(getApiUrl(`/api/reports/inspections/${encodeURIComponent(inspectionId)}`), {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Session expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: You do not have permission to view this inspection report.');
    }
    if (response.status === 404) {
      throw new Error('Inspection record not found.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load inspection report data.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Helper to load an image URL as a base64 Data URL for embedding into jsPDF.
 */
export async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const resolvedUrl = url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:') ? url : getApiUrl(url);
    const res = await fetch(resolvedUrl, {
      credentials: 'include',
      headers: getAuthHeaders({ 'Content-Type': '' }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

