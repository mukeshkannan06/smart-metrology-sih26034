import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SampleStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  READY_FOR_ANALYSIS = 'READY_FOR_ANALYSIS',
  CAPTURED = 'CAPTURED',
  EXTRACTED = 'EXTRACTED',
  EVALUATED = 'EVALUATED',
  VERIFIED = 'VERIFIED',
}

export interface ISampleImage {
  imageId: string;
  sequence: number;
  mimeType: string;
  sizeBytes: number;
  fileName?: string;
  width?: number;
  height?: number;
  temporaryReference: string;
  capturedAt: Date;
}

export interface ISample extends Document {
  inspectionId: Types.ObjectId;
  sampleNumber: number;
  sampleCode: string;
  status: SampleStatus;
  notes?: string;
  images: ISampleImage[];
  createdAt: Date;
  updatedAt: Date;
}

const SampleImageSchema = new Schema<ISampleImage>(
  {
    imageId: {
      type: String,
      required: [true, 'Image ID is required'],
      trim: true,
    },
    sequence: {
      type: Number,
      required: [true, 'Sequence number is required'],
      min: 1,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    },
    sizeBytes: {
      type: Number,
      required: [true, 'File size is required'],
      max: 5242880, // 5MB limit
    },
    fileName: {
      type: String,
      trim: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    temporaryReference: {
      type: String,
      required: [true, 'Temporary reference path is required'],
      trim: true,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const SampleSchema = new Schema<ISample>(
  {
    inspectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Inspection',
      required: [true, 'Inspection reference is required'],
      index: true,
    },
    sampleNumber: {
      type: Number,
      required: [true, 'Sample number is required'],
      min: [1, 'Sample number must be positive'],
    },
    sampleCode: {
      type: String,
      required: [true, 'Sample code is required'],
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: Object.values(SampleStatus),
      default: SampleStatus.PENDING,
    },
    notes: {
      type: String,
      trim: true,
    },
    images: {
      type: [SampleImageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'samples',
  }
);

// Compound unique index ensuring no duplicate sample number or code per inspection
SampleSchema.index({ inspectionId: 1, sampleNumber: 1 }, { unique: true });
SampleSchema.index({ inspectionId: 1, sampleCode: 1 }, { unique: true });
SampleSchema.index({ status: 1 });

export const Sample = mongoose.model<ISample>('Sample', SampleSchema);

