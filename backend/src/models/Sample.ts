import mongoose, { Schema, Document, Types } from 'mongoose';

export enum SampleStatus {
  PENDING = 'PENDING',
  CAPTURED = 'CAPTURED',
  EXTRACTED = 'EXTRACTED',
  EVALUATED = 'EVALUATED',
  VERIFIED = 'VERIFIED',
}

export interface ISample extends Document {
  inspectionId: Types.ObjectId;
  sampleNumber: number;
  status: SampleStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

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
    status: {
      type: String,
      enum: Object.values(SampleStatus),
      default: SampleStatus.PENDING,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'samples',
  }
);

// Compound unique index ensuring no duplicate sample number per inspection
SampleSchema.index({ inspectionId: 1, sampleNumber: 1 }, { unique: true });
SampleSchema.index({ status: 1 });

export const Sample = mongoose.model<ISample>('Sample', SampleSchema);

