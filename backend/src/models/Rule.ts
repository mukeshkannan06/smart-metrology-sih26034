import mongoose, { Schema, Document } from 'mongoose';

export enum RuleMandatoryStatus {
  MANDATORY = 'MANDATORY',
  CONDITIONAL = 'CONDITIONAL',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  OPTIONAL = 'OPTIONAL',
  REQUIRES_INSPECTOR_REVIEW = 'REQUIRES_INSPECTOR_REVIEW',
}

export enum RuleOperationalStatus {
  ACTIVE = 'ACTIVE',
  FUTURE = 'FUTURE',
  HISTORICAL = 'HISTORICAL',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  INACTIVE = 'INACTIVE',
}

export const RuleStatus = RuleOperationalStatus;
export type RuleStatus = RuleOperationalStatus;

export enum RuleFamily {
  DECLARATION = 'DECLARATION',
  WHOLESALE = 'WHOLESALE',
  EXPORT = 'EXPORT',
  APPLICABILITY = 'APPLICABILITY',
  EXEMPTION = 'EXEMPTION',
  PACKAGE_STRUCTURE = 'PACKAGE_STRUCTURE',
  IMPORT = 'IMPORT',
  MEASUREMENT = 'MEASUREMENT',
  PRESENTATION = 'PRESENTATION',
  E_COMMERCE = 'E_COMMERCE',
  CROSS_REGULATORY_OVERLAY = 'CROSS_REGULATORY_OVERLAY',
  HISTORICAL_GUARD = 'HISTORICAL_GUARD',
  PRICE_ENFORCEMENT = 'PRICE_ENFORCEMENT',
  ADMINISTRATIVE_IMPORT = 'ADMINISTRATIVE_IMPORT',
}

export interface IRule extends Document {
  // Authoritative Phase 11 29-field schema
  rule_id: string;
  rule_reference: string;
  declaration_type: string;
  requirement_description: string;
  human_condition_text: string;
  package_context: string;
  commodity_category: string;
  applicability_conditions: string;
  mandatory_status: RuleMandatoryStatus;
  evidence_type: string;
  ocr_field: string | null;
  validation_function: string;
  imported_status: string | null;
  quantity_condition: string | null;
  package_structure_condition: string | null;
  exemption_exception: string | null;
  effective_from: Date | null;
  effective_to: Date | null;
  amendment_version: string | null;
  source_document: string;
  source_section: string;
  source_page: number | null;
  source_url: string;
  inspector_review_required: boolean;
  rule_status: RuleOperationalStatus;
  rule_family: RuleFamily | string;
  notes: string | null;
  database_version: string;
  baseline_origin: string;

  // Backward-compatibility aliases
  ruleId?: string;
  ruleReference?: string;
  declarationType?: string;
  requirementDescription?: string;
  status?: RuleOperationalStatus;

  createdAt: Date;
  updatedAt: Date;
}

const RuleSchema = new Schema<IRule>(
  {
    rule_id: {
      type: String,
      required: [true, 'Rule ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    ruleId: {
      type: String,
      trim: true,
    },
    rule_reference: {
      type: String,
      required: [true, 'Rule reference is required'],
      trim: true,
      index: true,
    },
    ruleReference: {
      type: String,
      trim: true,
    },
    declaration_type: {
      type: String,
      required: [true, 'Declaration type is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    declarationType: {
      type: String,
      trim: true,
    },
    requirement_description: {
      type: String,
      required: [true, 'Requirement description is required'],
      trim: true,
    },
    requirementDescription: {
      type: String,
      trim: true,
    },
    human_condition_text: {
      type: String,
      required: true,
      trim: true,
    },
    package_context: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    commodity_category: {
      type: String,
      required: true,
      trim: true,
    },
    applicability_conditions: {
      type: String,
      required: true,
      trim: true,
    },
    mandatory_status: {
      type: String,
      required: true,
      enum: Object.values(RuleMandatoryStatus),
      index: true,
    },
    evidence_type: {
      type: String,
      required: true,
      trim: true,
    },
    ocr_field: {
      type: String,
      default: null,
      trim: true,
    },
    validation_function: {
      type: String,
      required: true,
      trim: true,
    },
    imported_status: {
      type: String,
      default: null,
      trim: true,
    },
    quantity_condition: {
      type: String,
      default: null,
      trim: true,
    },
    package_structure_condition: {
      type: String,
      default: null,
      trim: true,
    },
    exemption_exception: {
      type: String,
      default: null,
      trim: true,
    },
    effective_from: {
      type: Date,
      default: null,
    },
    effective_to: {
      type: Date,
      default: null,
    },
    amendment_version: {
      type: String,
      default: null,
      trim: true,
    },
    source_document: {
      type: String,
      required: true,
      trim: true,
    },
    source_section: {
      type: String,
      required: true,
      trim: true,
    },
    source_page: {
      type: Number,
      default: null,
    },
    source_url: {
      type: String,
      required: true,
      trim: true,
    },
    inspector_review_required: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    rule_status: {
      type: String,
      required: true,
      enum: Object.values(RuleOperationalStatus),
      default: RuleOperationalStatus.ACTIVE,
      index: true,
    },
    rule_family: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      default: null,
      trim: true,
    },
    database_version: {
      type: String,
      required: true,
      default: '1.0',
      trim: true,
      index: true,
    },
    baseline_origin: {
      type: String,
      required: true,
      default: 'v0.1',
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'rules',
  }
);

// Indexes
// Compound indexes for high performance querying in the Rule Engine
RuleSchema.index({ database_version: 1, rule_status: 1 });
RuleSchema.index({ rule_family: 1, rule_status: 1 });
RuleSchema.index({ package_context: 1, rule_status: 1 });

export const Rule = mongoose.model<IRule>('Rule', RuleSchema);

