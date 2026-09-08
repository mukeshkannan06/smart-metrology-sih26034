import mongoose, { Schema, Document } from 'mongoose';

export enum RuleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export interface IRule extends Document {
  ruleId: string;
  ruleReference: string;
  declarationType: string;
  requirementDescription: string;
  applicabilityConditions?: Record<string, unknown>;
  packageContext?: string[];
  commodityCategory?: string;
  importedStatus?: boolean;
  mandatoryStatus: boolean;
  sourceDocument?: string;
  sourceSection?: string;
  sourcePage?: number;
  version: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  status: RuleStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RuleSchema = new Schema<IRule>(
  {
    ruleId: {
      type: String,
      required: [true, 'Rule ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    ruleReference: {
      type: String,
      required: [true, 'Rule reference is required'],
      trim: true,
      index: true,
    },
    declarationType: {
      type: String,
      required: [true, 'Declaration type is required'],
      trim: true,
      uppercase: true,
    },
    requirementDescription: {
      type: String,
      required: [true, 'Requirement description is required'],
      trim: true,
    },
    applicabilityConditions: {
      type: Schema.Types.Mixed,
      default: {},
    },
    packageContext: {
      type: [String],
      default: [],
    },
    commodityCategory: {
      type: String,
      trim: true,
    },
    importedStatus: {
      type: Boolean,
      default: false,
    },
    mandatoryStatus: {
      type: Boolean,
      default: true,
    },
    sourceDocument: {
      type: String,
      trim: true,
    },
    sourceSection: {
      type: String,
      trim: true,
    },
    sourcePage: {
      type: Number,
    },
    version: {
      type: String,
      default: '1.0',
      trim: true,
    },
    effectiveFrom: {
      type: Date,
    },
    effectiveTo: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(RuleStatus),
      default: RuleStatus.ACTIVE,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'rules',
  }
);

// Indexes
RuleSchema.index({ ruleReference: 1, version: 1 });
RuleSchema.index({ declarationType: 1 });
RuleSchema.index({ status: 1 });

export const Rule = mongoose.model<IRule>('Rule', RuleSchema);

