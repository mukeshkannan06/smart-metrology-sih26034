import { SampleData } from './sampleService';

export type DeclarationCategory =
  | 'PRODUCT_NAME'
  | 'NET_QUANTITY'
  | 'MRP'
  | 'DATE_OF_MANUFACTURE_PACKING'
  | 'BEST_BEFORE_USE_BY'
  | 'MANUFACTURER_DETAILS'
  | 'COUNTRY_OF_ORIGIN'
  | 'CONSUMER_CARE'
  | 'UNIT_SALE_PRICE'
  | 'DIMENSIONS';

export type DetectionState =
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'LOW_CONFIDENCE'
  | 'UNCLEAR'
  | 'NOT_ANALYZED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ReviewStatus = 'PENDING' | 'CONFIRMED' | 'INCORRECT' | 'UNCLEAR';

export type ExtractionStatus =
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'STALE'
  | 'REQUIRES_REVIEW';

export interface InspectorReview {
  status: ReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export interface DeclarationExtraction {
  category: DeclarationCategory;
  state: DetectionState;
  confidence: ConfidenceLevel;
  rawValue?: string;
  normalizedValue?: string;
  evidenceImageId?: string;
  evidenceImageSequence?: number;
  evidenceDescription?: string;
  inspectorReview?: InspectorReview;
}

export interface AIExtractionData {
  _id: string;
  extractionId: string;
  inspectionId: string;
  sampleId: string;
  imageIds: string[];
  imageSetHash: string;
  provider: string;
  aiModel: string;
  promptVersion: string;
  status: ExtractionStatus;
  overallConfidence: ConfidenceLevel;
  declarations: DeclarationExtraction[];
  warnings: string[];
  processingMetadata: {
    durationMs: number;
    imagesCount: number;
    timestamp: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SampleExtractionsResponse {
  extractions: AIExtractionData[];
  latestExtraction: AIExtractionData | null;
  isStale: boolean;
  sampleCode: string;
  sampleStatus: string;
}

export interface AnalysisResponseData {
  extraction: AIExtractionData;
  sample: SampleData;
  cached: boolean;
}

export const CATEGORY_META: Record<
  DeclarationCategory,
  { label: string; statutoryHint: string; ruleRefHint: string }
> = {
  PRODUCT_NAME: {
    label: 'Product Name / Commodity',
    statutoryHint: 'Generic name or description of the commodity contained in the package.',
    ruleRefHint: 'Rule 6(1)(a)',
  },
  NET_QUANTITY: {
    label: 'Net Quantity',
    statutoryHint: 'Net quantity in standard unit of weight, measure, or number.',
    ruleRefHint: 'Rule 6(1)(d)',
  },
  MRP: {
    label: 'Maximum Retail Price (MRP)',
    statutoryHint: 'Retail sale price inclusive of all taxes.',
    ruleRefHint: 'Rule 6(1)(e)',
  },
  DATE_OF_MANUFACTURE_PACKING: {
    label: 'Date of Manufacture / Packing',
    statutoryHint: 'Month and year of manufacture, packing, or import.',
    ruleRefHint: 'Rule 6(1)(c)',
  },
  BEST_BEFORE_USE_BY: {
    label: 'Best Before / Expiry Date',
    statutoryHint: 'Best before or use by date declaration where required.',
    ruleRefHint: 'Rule 6(1)(c)',
  },
  MANUFACTURER_DETAILS: {
    label: 'Manufacturer / Packer Details',
    statutoryHint: 'Name and complete address of the manufacturer, packer, or importer.',
    ruleRefHint: 'Rule 6(1)(b)',
  },
  COUNTRY_OF_ORIGIN: {
    label: 'Country of Origin',
    statutoryHint: 'Name of the country of origin or manufacture for imported or domestic goods.',
    ruleRefHint: 'Rule 6(1)(b)',
  },
  CONSUMER_CARE: {
    label: 'Consumer Care Contact',
    statutoryHint: 'Name, address, telephone number, and email for consumer complaints.',
    ruleRefHint: 'Rule 6(1)(h)',
  },
  UNIT_SALE_PRICE: {
    label: 'Unit Sale Price (USP)',
    statutoryHint: 'Price per gram, milliliter, piece, or meter where applicable.',
    ruleRefHint: 'Rule 6(1)(f)',
  },
  DIMENSIONS: {
    label: 'Package Dimensions',
    statutoryHint: 'Dimensions or sizes of commodities sold by dimensions or sizes.',
    ruleRefHint: 'Rule 6(1)(g)',
  },
};

/**
 * Triggers AI multimodal package declaration extraction for a sample.
 */
export async function analyzeSampleDeclarations(
  inspectionId: string,
  sampleId: string,
  options?: { forceReanalyze?: boolean }
): Promise<AnalysisResponseData> {
  const response = await fetch(
    `/api/inspections/${encodeURIComponent(inspectionId)}/samples/${encodeURIComponent(
      sampleId
    )}/ai-analysis`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ forceReanalyze: Boolean(options?.forceReanalyze) }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication session expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: Only field inspectors can trigger AI package declaration extraction.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to analyze package declarations.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Fetches extraction history and latest status for a sample.
 */
export async function getSampleExtractions(
  inspectionId: string,
  sampleId: string
): Promise<SampleExtractionsResponse> {
  const response = await fetch(
    `/api/inspections/${encodeURIComponent(inspectionId)}/samples/${encodeURIComponent(
      sampleId
    )}/ai-extractions`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication session expired. Please log in again.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to retrieve AI extractions.');
  }

  const json = await response.json();
  return json.data;
}

/**
 * Records an inspector's review or verification of a specific declaration category.
 */
export async function reviewDeclaration(
  inspectionId: string,
  sampleId: string,
  extractionId: string,
  category: DeclarationCategory,
  status: ReviewStatus,
  notes?: string
): Promise<AIExtractionData> {
  const response = await fetch(
    `/api/inspections/${encodeURIComponent(inspectionId)}/samples/${encodeURIComponent(
      sampleId
    )}/ai-extractions/${encodeURIComponent(extractionId)}/declarations/${encodeURIComponent(
      category
    )}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status, notes }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication session expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access Denied: Only field inspectors can record declaration reviews.');
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to record declaration review.');
  }

  const json = await response.json();
  return json.data.extraction;
}

