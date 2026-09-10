import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ApplicabilityStatus {
  APPLICABLE = 'APPLICABLE',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  CONDITIONAL = 'CONDITIONAL',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum ObservationStatus {
  OBSERVED = 'OBSERVED',
  NOT_OBSERVED = 'NOT_OBSERVED',
  UNCLEAR = 'UNCLEAR',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  NOT_ANALYZED = 'NOT_ANALYZED',
}

export enum ValidationResultOutcome {
  PASS = 'PASS',
  POTENTIAL_VIOLATION = 'POTENTIAL_VIOLATION',
  EXEMPT = 'EXEMPT',
  SCOPE_EXCLUDED = 'SCOPE_EXCLUDED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export interface IRuleEvaluationItem {
  rule_id: string;
  rule_reference: string;
  declaration_type: string;
  requirement_description: string;
  rule_family: string;
  applicability_status: ApplicabilityStatus;
  mandatory_status: string;
  observation_status: ObservationStatus;
  observed_value: string | null;
  normalized_value: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  evidence_image_ids: string[];
  evidence_descriptions: string[];
  reason: string;
  applicability_explanation: string;
  validation_result: ValidationResultOutcome;
  requires_inspector_review: boolean;
  rule_database_version: string;
  amendment_version: string | null;
  effective_from: Date | null;
  effective_to: Date | null;
}

export interface IRuleEvaluation extends Document {
  evaluation_id: string;
  inspectionId: Types.ObjectId;
  sampleId: Types.ObjectId;
  sampleCode: string;
  package_context: string;
  commodity: string;
  commodity_category: string;
  rule_database_version: string;
  rules_evaluated: IRuleEvaluationItem[];
  summary: {
    total_rules_evaluated: number;
    applicable_count: number;
    mandatory_count: number;
    not_applicable_count: number;
    conditional_count: number;
    review_required_count: number;
    observed_count: number;
    not_observed_count: number;
    potential_violations_count: number;
  };
  evaluated_at: Date;
  evaluated_by: string;
  createdAt: Date;
  updatedAt: Date;
}

const RuleEvaluationItemSchema = new Schema<IRuleEvaluationItem>(
  {
    rule_id: { type: String, required: true },
    rule_reference: { type: String, required: true },
    declaration_type: { type: String, required: true },
    requirement_description: { type: String, required: true },
    rule_family: { type: String, required: true },
    applicability_status: {
      type: String,
      required: true,
      enum: Object.values(ApplicabilityStatus),
    },
    mandatory_status: { type: String, required: true },
    observation_status: {
      type: String,
      required: true,
      enum: Object.values(ObservationStatus),
      default: ObservationStatus.NOT_ANALYZED,
    },
    observed_value: { type: String, default: null },
    normalized_value: { type: String, default: null },
    confidence: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', null], default: null },
    evidence_image_ids: { type: [String], default: [] },
    evidence_descriptions: { type: [String], default: [] },
    reason: { type: String, required: true },
    applicability_explanation: { type: String, required: true },
    validation_result: {
      type: String,
      required: true,
      enum: Object.values(ValidationResultOutcome),
    },
    requires_inspector_review: { type: Boolean, default: false },
    rule_database_version: { type: String, required: true },
    amendment_version: { type: String, default: null },
    effective_from: { type: Date, default: null },
    effective_to: { type: Date, default: null },
  },
  { _id: false }
);

const RuleEvaluationSchema = new Schema<IRuleEvaluation>(
  {
    evaluation_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    inspectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Inspection',
      required: true,
      index: true,
    },
    sampleId: {
      type: Schema.Types.ObjectId,
      ref: 'Sample',
      required: true,
      index: true,
    },
    sampleCode: {
      type: String,
      required: true,
    },
    package_context: {
      type: String,
      required: true,
    },
    commodity: {
      type: String,
      required: true,
    },
    commodity_category: {
      type: String,
      required: true,
      default: 'GENERAL',
    },
    rule_database_version: {
      type: String,
      required: true,
      default: '1.0',
    },
    rules_evaluated: {
      type: [RuleEvaluationItemSchema],
      default: [],
    },
    summary: {
      total_rules_evaluated: { type: Number, default: 0 },
      applicable_count: { type: Number, default: 0 },
      mandatory_count: { type: Number, default: 0 },
      not_applicable_count: { type: Number, default: 0 },
      conditional_count: { type: Number, default: 0 },
      review_required_count: { type: Number, default: 0 },
      observed_count: { type: Number, default: 0 },
      not_observed_count: { type: Number, default: 0 },
      potential_violations_count: { type: Number, default: 0 },
    },
    evaluated_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    evaluated_by: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'rule_evaluations',
  }
);

// Indexes
RuleEvaluationSchema.index({ sampleId: 1, evaluated_at: -1 });
RuleEvaluationSchema.index({ inspectionId: 1, sampleId: 1 });

export const RuleEvaluation = mongoose.model<IRuleEvaluation>(
  'RuleEvaluation',
  RuleEvaluationSchema
);

