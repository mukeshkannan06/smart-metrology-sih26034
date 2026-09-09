import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  DeclarationCategory,
  DetectionState,
  ConfidenceLevel,
  ReviewStatus,
  DeclarationExtraction,
} from '../ai/aiProvider.interface';

export enum ExtractionStatus {
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  STALE = 'STALE',
  REQUIRES_REVIEW = 'REQUIRES_REVIEW',
}

export interface IAIExtraction extends Document {
  extractionId: string;
  inspectionId: Types.ObjectId;
  sampleId: Types.ObjectId;
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
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const InspectorReviewSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'INCORRECT', 'UNCLEAR'],
      default: 'PENDING',
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const DeclarationExtractionSchema = new Schema<DeclarationExtraction>(
  {
    category: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    state: {
      type: String,
      required: true,
      enum: ['DETECTED', 'NOT_DETECTED', 'LOW_CONFIDENCE', 'UNCLEAR', 'NOT_ANALYZED'],
      default: 'NOT_ANALYZED',
    },
    confidence: {
      type: String,
      required: true,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'LOW',
    },
    rawValue: {
      type: String,
      trim: true,
    },
    normalizedValue: {
      type: String,
      trim: true,
    },
    evidenceImageId: {
      type: String,
      trim: true,
    },
    evidenceImageSequence: {
      type: Number,
    },
    evidenceDescription: {
      type: String,
      trim: true,
    },
    inspectorReview: {
      type: InspectorReviewSchema,
      default: () => ({ status: 'PENDING' }),
    },
  },
  { _id: false }
);

const AIExtractionSchema = new Schema<IAIExtraction>(
  {
    extractionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    inspectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Inspection',
      required: [true, 'Inspection reference is required'],
      index: true,
    },
    sampleId: {
      type: Schema.Types.ObjectId,
      ref: 'Sample',
      required: [true, 'Sample reference is required'],
      index: true,
    },
    imageIds: {
      type: [String],
      default: [],
    },
    imageSetHash: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      required: true,
      trim: true,
    },
    aiModel: {
      type: String,
      required: true,
      trim: true,
    },
    promptVersion: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(ExtractionStatus),
      default: ExtractionStatus.COMPLETED,
      index: true,
    },
    overallConfidence: {
      type: String,
      required: true,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
      default: 'LOW',
    },
    declarations: {
      type: [DeclarationExtractionSchema],
      default: [],
    },
    warnings: {
      type: [String],
      default: [],
    },
    processingMetadata: {
      durationMs: { type: Number, default: 0 },
      imagesCount: { type: Number, default: 0 },
      timestamp: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: true,
    collection: 'ai_extractions',
  }
);

// Compound indexes for fast lookups
AIExtractionSchema.index({ sampleId: 1, createdAt: -1 });
AIExtractionSchema.index({ sampleId: 1, imageSetHash: 1 });

export const AIExtraction = mongoose.model<IAIExtraction>(
  'AIExtraction',
  AIExtractionSchema
);
