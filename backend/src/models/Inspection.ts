import mongoose, { Schema, Document } from 'mongoose';

export enum PackageContext {
  RETAIL_PACKAGE = 'RETAIL_PACKAGE',
  WHOLESALE_PACKAGE = 'WHOLESALE_PACKAGE',
  INDUSTRIAL_INSTITUTIONAL_PACKAGE = 'INDUSTRIAL_INSTITUTIONAL_PACKAGE',
  IMPORTED_PACKAGE = 'IMPORTED_PACKAGE',
  EXPORT_PACKAGE = 'EXPORT_PACKAGE',
  SINGLE_PIECE_RETAIL_PACKAGE = 'SINGLE_PIECE_RETAIL_PACKAGE',
}

export enum InspectionStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export interface IInspection extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const InspectionSchema = new Schema<IInspection>(
  {
    inspectionNumber: {
      type: String,
      required: [true, 'Inspection number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    inspectorId: {
      type: String,
      required: [true, 'Inspector ID is required'],
      trim: true,
    },
    commodity: {
      type: String,
      required: [true, 'Commodity is required'],
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    packageContext: {
      type: String,
      enum: Object.values(PackageContext),
      required: [true, 'Package context is required'],
      default: PackageContext.RETAIL_PACKAGE,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    market: {
      type: String,
      trim: true,
    },
    samplesCount: {
      type: Number,
      required: [true, 'Samples count is required'],
      min: [1, 'Sample count must be at least 1'],
      default: 5,
    },
    status: {
      type: String,
      enum: Object.values(InspectionStatus),
      default: InspectionStatus.IN_PROGRESS,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'inspections',
  }
);

// Indexes
InspectionSchema.index({ inspectorId: 1, createdAt: -1 });
InspectionSchema.index({ status: 1 });
InspectionSchema.index({ packageContext: 1 });

export const Inspection = mongoose.model<IInspection>('Inspection', InspectionSchema);

