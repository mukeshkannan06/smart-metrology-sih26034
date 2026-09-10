import mongoose, { Schema, Document, Types } from 'mongoose';

export enum FindingCandidateStatus {
  COMPLIANT_CANDIDATE = 'COMPLIANT_CANDIDATE',
  POTENTIAL_NON_COMPLIANCE = 'POTENTIAL_NON_COMPLIANCE',
  REQUIRES_INSPECTOR_REVIEW = 'REQUIRES_INSPECTOR_REVIEW',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum InspectorVerificationDecision {
  VERIFIED_COMPLIANT = 'VERIFIED_COMPLIANT',
  VERIFIED_NON_COMPLIANT = 'VERIFIED_NON_COMPLIANT',
  VERIFIED_NOT_APPLICABLE = 'VERIFIED_NOT_APPLICABLE',
  VERIFIED_REQUIRES_FURTHER_REVIEW = 'VERIFIED_REQUIRES_FURTHER_REVIEW',
}

export enum FindingStatus {
  // Candidate / Pre-verification statuses
  COMPLIANT_CANDIDATE = 'COMPLIANT_CANDIDATE',
  POTENTIAL_NON_COMPLIANCE = 'POTENTIAL_NON_COMPLIANCE',
  REQUIRES_INSPECTOR_REVIEW = 'REQUIRES_INSPECTOR_REVIEW',
  NOT_APPLICABLE = 'NOT_APPLICABLE',

  // Inspector Verified statuses
  VERIFIED_COMPLIANT = 'VERIFIED_COMPLIANT',
  VERIFIED_NON_COMPLIANT = 'VERIFIED_NON_COMPLIANT',
  VERIFIED_NOT_APPLICABLE = 'VERIFIED_NOT_APPLICABLE',
  VERIFIED_REQUIRES_FURTHER_REVIEW = 'VERIFIED_REQUIRES_FURTHER_REVIEW',
}

export interface IAIObservationLayer {
  state: string; // OBSERVED, NOT_OBSERVED, UNCLEAR, LOW_CONFIDENCE, NOT_ANALYZED
  extractedValue: string | null;
  normalizedValue: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  evidenceImageIds: string[];
  evidenceDescriptions: string[];
}

export interface IRuleEngineResultLayer {
  outcome: string; // PASS, POTENTIAL_VIOLATION, EXEMPT, SCOPE_EXCLUDED, REVIEW_REQUIRED, NOT_APPLICABLE
  reason: string;
  applicabilityExplanation: string;
  requiresInspectorReview: boolean;
  ruleDatabaseVersion: string;
  amendmentVersion: string | null;
  evaluatedAt: Date;
}

export interface IInspectorVerificationLayer {
  isVerified: boolean;
  decision: InspectorVerificationDecision | null;
  verifiedValue: string | null;
  originalAiValuePreserved: string | null;
  isCorrected: boolean;
  notes: string | null;
  verifiedBy: string | null; // Inspector User ID
  verifiedByName: string | null; // Inspector Full Name
  verifiedAt: Date | null;
}

export interface IComplianceFinding extends Document {
  findingId: string;
  inspectionId: Types.ObjectId;
  sampleId: Types.ObjectId;
  sampleCode: string;
  ruleId: string;
  ruleReference: string;
  ruleFamily: string;
  declarationType: string;
  requirementDescription: string;
  candidateStatus: FindingCandidateStatus;
  status: FindingStatus;
  isVerified: boolean;
  isCorrected: boolean;
  aiObservation: IAIObservationLayer;
  ruleEngineResult: IRuleEngineResultLayer;
  inspectorVerification: IInspectorVerificationLayer;
  createdAt: Date;
  updatedAt: Date;
}

const AIObservationSchema = new Schema<IAIObservationLayer>(
  {
    state: { type: String, required: true, default: 'NOT_ANALYZED' },
    extractedValue: { type: String, default: null },
    normalizedValue: { type: String, default: null },
    confidence: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', null], default: null },
    evidenceImageIds: { type: [String], default: [] },
    evidenceDescriptions: { type: [String], default: [] },
  },
  { _id: false }
);

const RuleEngineResultSchema = new Schema<IRuleEngineResultLayer>(
  {
    outcome: { type: String, required: true },
    reason: { type: String, default: '' },
    applicabilityExplanation: { type: String, default: '' },
    requiresInspectorReview: { type: Boolean, default: false },
    ruleDatabaseVersion: { type: String, required: true },
    amendmentVersion: { type: String, default: null },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const InspectorVerificationSchema = new Schema<IInspectorVerificationLayer>(
  {
    isVerified: { type: Boolean, default: false },
    decision: {
      type: String,
      enum: [...Object.values(InspectorVerificationDecision), null],
      default: null,
    },
    verifiedValue: { type: String, default: null },
    originalAiValuePreserved: { type: String, default: null },
    isCorrected: { type: Boolean, default: false },
    notes: { type: String, default: null },
    verifiedBy: { type: String, default: null },
    verifiedByName: { type: String, default: null },
    verifiedAt: { type: Date, default: null },
  },
  { _id: false }
);

const ComplianceFindingSchema = new Schema<IComplianceFinding>(
  {
    findingId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
      trim: true,
    },
    ruleId: {
      type: String,
      required: true,
      trim: true,
    },
    ruleReference: {
      type: String,
      required: true,
      trim: true,
    },
    ruleFamily: {
      type: String,
      required: true,
      trim: true,
    },
    declarationType: {
      type: String,
      required: true,
      trim: true,
    },
    requirementDescription: {
      type: String,
      required: true,
      trim: true,
    },
    candidateStatus: {
      type: String,
      enum: Object.values(FindingCandidateStatus),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(FindingStatus),
      required: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isCorrected: {
      type: Boolean,
      default: false,
    },
    aiObservation: {
      type: AIObservationSchema,
      required: true,
    },
    ruleEngineResult: {
      type: RuleEngineResultSchema,
      required: true,
    },
    inspectorVerification: {
      type: InspectorVerificationSchema,
      default: () => ({
        isVerified: false,
        decision: null,
        verifiedValue: null,
        originalAiValuePreserved: null,
        isCorrected: false,
        notes: null,
        verifiedBy: null,
        verifiedByName: null,
        verifiedAt: null,
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one finding per rule per sample
ComplianceFindingSchema.index({ sampleId: 1, ruleId: 1 }, { unique: true });

// Compound index for fast retrieval of inspection findings by status
ComplianceFindingSchema.index({ inspectionId: 1, status: 1 });

export const ComplianceFinding = mongoose.model<IComplianceFinding>(
  'ComplianceFinding',
  ComplianceFindingSchema
);

