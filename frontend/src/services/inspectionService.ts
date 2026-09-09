export enum PackageContext {
  RETAIL_PACKAGE = 'RETAIL_PACKAGE',
  WHOLESALE_PACKAGE = 'WHOLESALE_PACKAGE',
  INDUSTRIAL_INSTITUTIONAL_PACKAGE = 'INDUSTRIAL_INSTITUTIONAL_PACKAGE',
  IMPORTED_PACKAGE = 'IMPORTED_PACKAGE',
  EXPORT_PACKAGE = 'EXPORT_PACKAGE',
}

export enum InspectionStatus {
  READY_FOR_SAMPLING = 'READY_FOR_SAMPLING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export interface InspectionData {
  _id: string;
  inspectionNumber: string;
  inspectorId: string;
  commodity: string;
  brand?: string;
  packageContext: PackageContext;
  location: string;
  market?: string;
  samplesCount: number;
  status: InspectionStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInspectionPayload {
  commodity: string;
  brand?: string;
  packageContext: PackageContext;
  location: string;
  market?: string;
  samplesCount: number;
  remarks?: string;
}

export const PACKAGE_CONTEXT_DEFINITIONS: Record<
  PackageContext,
  { label: string; statutoryRef: string; description: string; badgeColor: string }
> = {
  [PackageContext.RETAIL_PACKAGE]: {
    label: 'Retail Package',
    statutoryRef: 'LMPC Rule 6(1)',
    description:
      'Standard pre-packaged commodity intended for direct retail sale to consumers. Mandates complete declarations (MRP, Net Qty, Best Before, Consumer Care).',
    badgeColor: 'blue',
  },
  [PackageContext.WHOLESALE_PACKAGE]: {
    label: 'Wholesale Package',
    statutoryRef: 'LMPC Rule 24',
    description:
      'Package containing multiple retail units or commodities intended for intermediary sale to wholesale dealers. Wholesale declaration standards apply.',
    badgeColor: 'indigo',
  },
  [PackageContext.INDUSTRIAL_INSTITUTIONAL_PACKAGE]: {
    label: 'Industrial / Institutional Package',
    statutoryRef: 'LMPC Rule 3',
    description:
      'Packages packed exclusively for direct consumption by industrial or institutional consumers (e.g. railways, hospitals, hotels). Exempt from retail MRP rules.',
    badgeColor: 'purple',
  },
  [PackageContext.IMPORTED_PACKAGE]: {
    label: 'Imported Package',
    statutoryRef: 'LMPC Rule 6(1)(g)',
    description:
      'Packaged commodities imported into India. Strictly mandates Country of Origin, Importer name/address, and customs clearance declarations.',
    badgeColor: 'amber',
  },
  [PackageContext.EXPORT_PACKAGE]: {
    label: 'Export Package',
    statutoryRef: 'LMPC Rule 34',
    description:
      'Commodities manufactured and packed exclusively for export outside India. Complies with destination country regulations and Rule 34 exemptions.',
    badgeColor: 'emerald',
  },
};

/**
 * Creates a new inspection via the backend API.
 * Uses HTTP-only cookie credentials.
 */
export async function createInspection(
  payload: CreateInspectionPayload
): Promise<InspectionData> {
  const response = await fetch('/api/inspections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access denied: Only field inspectors can initiate new inspections.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to create inspection.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Fetches all inspections for the authenticated officer.
 */
export async function fetchMyInspections(params?: {
  search?: string;
  status?: string;
  packageContext?: string;
}): Promise<InspectionData[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.status) query.append('status', params.status);
  if (params?.packageContext) query.append('packageContext', params.packageContext);

  const url = `/api/inspections${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load inspections.');
  }

  const json = await response.json();
  return json.data || [];
}

/**
 * Fetches a single inspection by ID or inspectionNumber.
 */
export async function fetchInspectionById(id: string): Promise<InspectionData> {
  const response = await fetch(`/api/inspections/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: You do not have permission to view this inspection.');
    }
    if (response.status === 404) {
      throw new Error('Inspection record not found.');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || 'Failed to load inspection details.');
  }

  const json = await response.json();
  return json.data;
}

