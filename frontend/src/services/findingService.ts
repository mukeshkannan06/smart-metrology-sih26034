import { getApiUrl, getAuthHeaders } from './apiConfig';

export enum FindingCandidateStatus {
  COMPLIANT_CANDIDATE = 'COMPLIANT_CANDIDATE',
  POTENTIAL_NON_COMPLIANCE = 'POTENTIAL_NON_COMPLIANCE',
  REQUIRES_INSPECTOR_REVIEW = 'REQUIRES_INSPECTOR_REVIEW',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum InspectorVerificationDecision {
  VERIFIED_COMPLIANT = 'VERIFIED_COMPLIANT',
  VERIFIED_NON_COMPLIANT = 'VERIFIED_NON_COMPLIANT',
  VERIFIED_NOT_APPLICABLE = 'VERIFIED_NOT_APPLICABLE',
  VERIFIED_REQUIRES_FURTHER_REVIEW = 'VERIFIED_REQUIRES_FURTHER_REVIEW',
}

export enum FindingStatus {
  COMPLIANT_CANDIDATE = 'COMPLIANT_CANDIDATE',
  POTENTIAL_NON_COMPLIANCE = 'POTENTIAL_NON_COMPLIANCE',
  REQUIRES_INSPECTOR_REVIEW = 'REQUIRES_INSPECTOR_REVIEW',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  VERIFIED_COMPLIANT = 'VERIFIED_COMPLIANT',
  VERIFIED_NON_COMPLIANT = 'VERIFIED_NON_COMPLIANT',
  VERIFIED_NOT_APPLICABLE = 'VERIFIED_NOT_APPLICABLE',
  VERIFIED_REQUIRES_FURTHER_REVIEW = 'VERIFIED_REQUIRES_FURTHER_REVIEW',
}

export interface AIObservationLayer {
  state: string;
  extractedValue: string | null;
  normalizedValue: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  evidenceImageIds: string[];
  evidenceDescriptions: string[];
}

export interface RuleEngineResultLayer {
  outcome: string;
  reason: string;
  applicabilityExplanation: string;
  requiresInspectorReview: boolean;
  ruleDatabaseVersion: string;
  amendmentVersion: string | null;
  evaluatedAt: string;
}

export interface InspectorVerificationLayer {
  isVerified: boolean;
  decision: InspectorVerificationDecision | null;
  verifiedValue: string | null;
  originalAiValuePreserved: string | null;
  isCorrected: boolean;
  notes: string | null;
  verifiedBy: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
}

export interface ComplianceFindingData {
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
  candidateStatus: FindingCandidateStatus;
  status: FindingStatus;
  isVerified: boolean;
  isCorrected: boolean;
  aiObservation: AIObservationLayer;
  ruleEngineResult: RuleEngineResultLayer;
  inspectorVerification: InspectorVerificationLayer;
  createdAt: string;
  updatedAt: string;
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

export interface InspectionFindingsResponse {
  inspection: any;
  findings: ComplianceFindingData[];
  telemetry: FindingsTelemetry;
}

export interface SampleFindingsResponse {
  sample: any;
  findings: ComplianceFindingData[];
  telemetry: FindingsTelemetry;
}

export const FINDING_STATUS_META: Record<
  string,
  { label: string; badgeVariant: 'neutral' | 'warning' | 'info' | 'success' | 'danger'; description: string }
> = {
  [FindingStatus.COMPLIANT_CANDIDATE]: {
    label: 'Compliant Candidate',
    badgeVariant: 'success',
    description: 'Statutory declaration observed and valid per deterministic rules. Pending officer verification.',
  },
  [FindingStatus.POTENTIAL_NON_COMPLIANCE]: {
    label: 'Potential Non-Compliance',
    badgeVariant: 'danger',
    description: 'Mandatory statutory declaration missing, format invalid, or non-compliant candidate.',
  },
  [FindingStatus.REQUIRES_INSPECTOR_REVIEW]: {
    label: 'Requires Inspector Review',
    badgeVariant: 'warning',
    description: 'Conditional rule or unclear observation requiring physical human inspector oversight.',
  },
  [FindingStatus.NOT_APPLICABLE]: {
    label: 'Not Applicable',
    badgeVariant: 'neutral',
    description: 'Rule excluded by packaging context, commodity scope, or temporal validity.',
  },
  [FindingStatus.VERIFIED_COMPLIANT]: {
    label: 'Verified Compliant',
    badgeVariant: 'success',
    description: 'Affirmed compliant by assigned Legal Metrology Inspector.',
  },
  [FindingStatus.VERIFIED_NON_COMPLIANT]: {
    label: 'Verified Non-Compliant',
    badgeVariant: 'danger',
    description: 'Confirmed statutory violation by assigned Legal Metrology Inspector.',
  },
  [FindingStatus.VERIFIED_NOT_APPLICABLE]: {
    label: 'Verified Not Applicable',
    badgeVariant: 'neutral',
    description: 'Confirmed statutory exemption or scope exclusion by Inspector.',
  },
  [FindingStatus.VERIFIED_REQUIRES_FURTHER_REVIEW]: {
    label: 'Action Required',
    badgeVariant: 'warning',
    description: 'Flagged for lab verification, supervisor escalation, or further examination.',
  },
};

/**
 * Retrieves compliance findings for an inspection with optional sample and status filtering.
 */
export async function getInspectionFindings(
  inspectionId: string,
  filters: { sampleId?: string; candidateStatus?: string; status?: string; isVerified?: boolean } = {}
): Promise<InspectionFindingsResponse> {
  const queryParams = new URLSearchParams();
  if (filters.sampleId) queryParams.append('sampleId', filters.sampleId);
  if (filters.candidateStatus) queryParams.append('candidateStatus', filters.candidateStatus);
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.isVerified !== undefined) queryParams.append('isVerified', String(filters.isVerified));

  const url = getApiUrl(`/api/findings/inspections/${encodeURIComponent(inspectionId)}${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`);

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to retrieve inspection findings.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Retrieves compliance findings for a specific sample unit.
 */
export async function getSampleFindings(sampleId: string): Promise<SampleFindingsResponse> {
  const response = await fetch(getApiUrl(`/api/findings/samples/${encodeURIComponent(sampleId)}`), {
    method: 'GET',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to retrieve sample findings.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Retrieves a single finding by ID.
 */
export async function getFindingById(findingId: string): Promise<ComplianceFindingData> {
  const response = await fetch(getApiUrl(`/api/findings/${encodeURIComponent(findingId)}`), {
    method: 'GET',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to retrieve finding details.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Submits inspector verification for a finding.
 */
export async function verifyFinding(
  findingId: string,
  payload: {
    decision: InspectorVerificationDecision;
    verifiedValue?: string;
    notes?: string;
  }
): Promise<{
  finding: ComplianceFindingData;
  telemetry: FindingsTelemetry;
  allSampleFindingsVerified: boolean;
}> {
  const response = await fetch(getApiUrl(`/api/findings/${encodeURIComponent(findingId)}/verify`), {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to verify finding.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Corrects an observed declaration value while keeping the original AI observation preserved.
 */
export async function correctFinding(
  findingId: string,
  payload: {
    correctedValue: string;
    notes?: string;
  }
): Promise<ComplianceFindingData> {
  const response = await fetch(getApiUrl(`/api/findings/${encodeURIComponent(findingId)}/correct`), {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to correct declaration value.');
  }

  const json = await response.json();
  return json.data;
}

export interface ViolationObservationRecord {
  _id: string;
  findingId: string;
  inspectionId: string;
  inspectionNumber: string;
  commodity: string;
  brand?: string | null;
  packageContext: string;
  location?: string | null;
  inspectorId: string;
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
  aiValue: string | null;
  verifiedValue: string | null;
  reason?: string | null;
  evidenceImageIds: string[];
  notes?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

/**
 * Retrieves all violations, non-compliances, and discrepancies recorded for current user's inspections.
 */
export async function fetchInspectorViolations(): Promise<ViolationObservationRecord[]> {
  const response = await fetch(getApiUrl('/api/findings/violations'), {
    method: 'GET',
    credentials: 'include',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to retrieve inspector violations.');
  }

  const json = await response.json();
  return json.data;
}

