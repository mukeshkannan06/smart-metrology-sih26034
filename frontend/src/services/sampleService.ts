import { getApiUrl, getAuthHeaders, getStoredAuthToken } from './apiConfig';

export enum SampleStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  READY_FOR_ANALYSIS = 'READY_FOR_ANALYSIS',
  CAPTURED = 'CAPTURED',
  EXTRACTED = 'EXTRACTED',
  EVALUATED = 'EVALUATED',
  VERIFIED = 'VERIFIED',
}

export interface SampleImage {
  imageId: string;
  sequence: number;
  mimeType: string;
  sizeBytes: number;
  fileName?: string;
  width?: number;
  height?: number;
  temporaryReference?: string;
  capturedAt: string;
}

export interface SampleData {
  _id: string;
  inspectionId: string;
  sampleNumber: number;
  sampleCode: string;
  status: SampleStatus;
  notes?: string;
  images?: SampleImage[];
  createdAt: string;
  updatedAt: string;
}

export interface SampleProgressSummary {
  totalExpected: number;
  totalCreated: number;
  completed: number;
  inProgress: number;
  pending: number;
  remaining: number;
  isComplete: boolean;
  percentComplete: number;
}

export interface InspectionSamplesResponse {
  inspection: any;
  samples: SampleData[];
  progress: SampleProgressSummary;
}

export interface CreateSampleResponse {
  sample: SampleData;
  progress: SampleProgressSummary;
  inspection: any;
}

export const SAMPLE_STATUS_META: Record<
  string,
  { label: string; badgeVariant: 'neutral' | 'warning' | 'info' | 'success' | 'purple'; description: string }
> = {
  [SampleStatus.PENDING]: {
    label: 'Pending',
    badgeVariant: 'neutral',
    description: 'Sample unit registered; awaiting physical examination and capture.',
  },
  [SampleStatus.CAPTURED]: {
    label: 'Evidence Captured',
    badgeVariant: 'info',
    description: 'Package photos captured; ready for analysis pipeline.',
  },
  [SampleStatus.IN_PROGRESS]: {
    label: 'In Progress',
    badgeVariant: 'warning',
    description: 'Sample examination active by field inspector.',
  },
  [SampleStatus.READY_FOR_ANALYSIS]: {
    label: 'Ready for Analysis',
    badgeVariant: 'info',
    description: 'Sample unit prepared; ready for Vision OCR extraction and deterministic rule evaluation.',
  },
  [SampleStatus.EXTRACTED]: {
    label: 'AI Extracted',
    badgeVariant: 'info',
    description: 'Statutory declarations extracted by multimodal AI.',
  },
  [SampleStatus.EVALUATED]: {
    label: 'Rules Evaluated',
    badgeVariant: 'purple',
    description: 'Legal Metrology rules deterministically evaluated.',
  },
  [SampleStatus.VERIFIED]: {
    label: 'Verified',
    badgeVariant: 'success',
    description: 'Sample examination completed and findings verified.',
  },
};

/**
 * Adds the next sequential sample unit to an inspection case.
 */
export async function createSample(
  inspectionId: string,
  payload: { notes?: string; status?: SampleStatus } = {}
): Promise<CreateSampleResponse> {
  const response = await fetch(
    getApiUrl(`/api/inspections/${encodeURIComponent(inspectionId)}/samples`),
    {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: Only field inspectors can add samples to this inspection.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to create sample.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Fetches all child samples and progress telemetry for an inspection.
 */
export async function fetchSamplesForInspection(
  inspectionId: string
): Promise<InspectionSamplesResponse> {
  const response = await fetch(
    getApiUrl(`/api/inspections/${encodeURIComponent(inspectionId)}/samples`),
    {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: You do not have permission to view these samples.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load inspection samples.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Retrieves a single sample record by sampleId or sampleCode within an inspection.
 */
export async function fetchSampleById(
  inspectionId: string,
  sampleId: string
): Promise<{ sample: SampleData; inspection: any }> {
  const response = await fetch(
    getApiUrl(`/api/inspections/${encodeURIComponent(inspectionId)}/samples/${encodeURIComponent(sampleId)}`),
    {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: You do not have permission to view this sample.');
    }
    if (response.status === 404) {
      throw new Error('Sample unit not found in this inspection.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load sample details.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Updates sample notes or technical lifecycle status.
 */
export async function updateSample(
  inspectionId: string,
  sampleId: string,
  payload: { notes?: string; status?: SampleStatus }
): Promise<CreateSampleResponse> {
  const response = await fetch(
    getApiUrl(`/api/inspections/${encodeURIComponent(inspectionId)}/samples/${encodeURIComponent(sampleId)}`),
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: Only field inspectors can update sample metadata.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to update sample.');
  }

  const json = await response.json();
  return json.data;
}

export interface UploadImagePayload {
  imageData: string;
  mimeType?: string;
  fileName?: string;
}

export interface UploadImageResponse {
  sample: SampleData;
  image: SampleImage;
  progress: SampleProgressSummary;
  inspection: any;
}

/**
 * Uploads and attaches a package photo to a sample unit.
 */
export async function uploadSampleImage(
  inspectionId: string,
  sampleId: string,
  payload: UploadImagePayload
): Promise<UploadImageResponse> {
  const response = await fetch(
    getApiUrl(`/api/inspections/${encodeURIComponent(inspectionId)}/samples/${encodeURIComponent(sampleId)}/images`),
    {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: Only field inspectors can upload package images.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to upload package image.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Lists image records attached to a sample unit.
 */
export async function fetchSampleImages(
  inspectionId: string,
  sampleId: string
): Promise<{
  images: SampleImage[];
  sampleCode: string;
  sampleNumber: number;
  sampleStatus: SampleStatus;
  inspectionNumber: string;
}> {
  const response = await fetch(
    getApiUrl(`/api/inspections/${encodeURIComponent(inspectionId)}/samples/${encodeURIComponent(sampleId)}/images`),
    {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: You do not have permission to view these images.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load sample images.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Generates an authenticated endpoint URL to stream an image.
 * Automatically appends the active session token query parameter for HTML <img> rendering.
 */
export function getSampleImageUrl(
  inspectionId: string,
  sampleId: string,
  imageId: string
): string {
  const baseUrl = getApiUrl(`/api/inspections/${encodeURIComponent(inspectionId)}/samples/${encodeURIComponent(sampleId)}/images/${encodeURIComponent(imageId)}`);
  const token = getStoredAuthToken();
  if (token) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  return baseUrl;
}

/**
 * Fetches the binary image with credentials and creates a local object URL.
 */
export async function fetchSampleImageBlob(
  inspectionId: string,
  sampleId: string,
  imageId: string
): Promise<string> {
  const response = await fetch(
    getSampleImageUrl(inspectionId, sampleId, imageId),
    {
      method: 'GET',
      headers: getAuthHeaders({ 'Content-Type': '' }),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load image (${response.status} ${response.statusText})`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * Deletes a package photo from a sample unit.
 */
export async function deleteSampleImage(
  inspectionId: string,
  sampleId: string,
  imageId: string
): Promise<{ sample: SampleData; progress: SampleProgressSummary; inspection: any }> {
  const response = await fetch(
    getApiUrl(`/api/inspections/${encodeURIComponent(inspectionId)}/samples/${encodeURIComponent(sampleId)}/images/${encodeURIComponent(imageId)}`),
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: Only field inspectors can delete package images.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to delete package image.');
  }

  const json = await response.json();
  return json.data;
}

