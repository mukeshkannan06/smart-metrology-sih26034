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

export const ALL_DECLARATION_CATEGORIES: DeclarationCategory[] = [
  'PRODUCT_NAME',
  'NET_QUANTITY',
  'MRP',
  'DATE_OF_MANUFACTURE_PACKING',
  'BEST_BEFORE_USE_BY',
  'MANUFACTURER_DETAILS',
  'COUNTRY_OF_ORIGIN',
  'CONSUMER_CARE',
  'UNIT_SALE_PRICE',
  'DIMENSIONS',
];

export type DetectionState =
  | 'DETECTED'
  | 'NOT_DETECTED'
  | 'LOW_CONFIDENCE'
  | 'UNCLEAR'
  | 'NOT_ANALYZED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type ReviewStatus = 'PENDING' | 'CONFIRMED' | 'INCORRECT' | 'UNCLEAR';

export interface InspectorReview {
  status: ReviewStatus;
  reviewedAt?: Date;
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

export interface PackageImagePayload {
  imageId: string;
  mimeType: string;
  buffer: Buffer;
  sequence: number;
  fileName?: string;
}

export interface PackageAnalysisRequest {
  inspectionId: string;
  sampleId: string;
  packageContext?: string;
  commodity?: string;
  images: PackageImagePayload[];
}

export interface PackageAnalysisResponse {
  provider: string;
  model: string;
  promptVersion: string;
  overallConfidence: ConfidenceLevel;
  declarations: DeclarationExtraction[];
  warnings: string[];
  processingMetadata: {
    durationMs: number;
    imagesCount: number;
    timestamp: string;
  };
}

export interface AIProvider {
  readonly name: string;
  analyzePackageImages(request: PackageAnalysisRequest): Promise<PackageAnalysisResponse>;
}

