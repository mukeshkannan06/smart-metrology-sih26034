import mongoose, { Schema, Document, Types } from 'mongoose';

export enum AuditEventType {
  INSPECTION_CREATED = 'INSPECTION_CREATED',
  INSPECTION_UPDATED = 'INSPECTION_UPDATED',
  INSPECTION_STATUS_CHANGED = 'INSPECTION_STATUS_CHANGED',
  SAMPLE_CREATED = 'SAMPLE_CREATED',
  SAMPLE_UPDATED = 'SAMPLE_UPDATED',
  IMAGE_CAPTURED = 'IMAGE_CAPTURED',
  IMAGE_UPDATED = 'IMAGE_UPDATED',
  AI_ANALYSIS_STARTED = 'AI_ANALYSIS_STARTED',
  AI_ANALYSIS_COMPLETED = 'AI_ANALYSIS_COMPLETED',
  AI_ANALYSIS_FAILED = 'AI_ANALYSIS_FAILED',
  RULE_EVALUATION_COMPLETED = 'RULE_EVALUATION_COMPLETED',
  FINDINGS_GENERATED = 'FINDINGS_GENERATED',
  FINDING_CORRECTED = 'FINDING_CORRECTED',
  FINDING_VERIFIED = 'FINDING_VERIFIED',
  FINDING_STATUS_CHANGED = 'FINDING_STATUS_CHANGED',
  INSPECTOR_NOTE_ADDED = 'INSPECTOR_NOTE_ADDED',
}

export type AuditEntityType =
  | 'INSPECTION'
  | 'SAMPLE'
  | 'IMAGE'
  | 'AI_EXTRACTION'
  | 'RULE_EVALUATION'
  | 'FINDING';

export type AuditEventSource = 'USER' | 'SYSTEM' | 'AI' | 'RULE_ENGINE';

export interface IAuditEvent extends Document {
  auditEventId: string;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  inspectionId: Types.ObjectId;
  sampleId?: Types.ObjectId;
  findingId?: Types.ObjectId;
  actorUserId: string;
  actorName: string;
  actorRole: string; // 'INSPECTOR' | 'ASSISTANT_CONTROLLER' | 'SYSTEM'
  source: AuditEventSource;
  action: string;
  description: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuditEventSchema = new Schema<IAuditEvent>(
  {
    auditEventId: {
      type: String,
      required: [true, 'Audit Event ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    eventType: {
      type: String,
      required: [true, 'Event Type is required'],
      enum: Object.values(AuditEventType),
      index: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity Type is required'],
      enum: ['INSPECTION', 'SAMPLE', 'IMAGE', 'AI_EXTRACTION', 'RULE_EVALUATION', 'FINDING'],
    },
    entityId: {
      type: String,
      required: [true, 'Entity ID is required'],
      trim: true,
      index: true,
    },
    inspectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Inspection',
      required: [true, 'Parent Inspection ID reference is required'],
      index: true,
    },
    sampleId: {
      type: Schema.Types.ObjectId,
      ref: 'Sample',
      index: true,
    },
    findingId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplianceFinding',
      index: true,
    },
    actorUserId: {
      type: String,
      required: [true, 'Actor User ID is required'],
      trim: true,
      index: true,
    },
    actorName: {
      type: String,
      required: [true, 'Actor Name is required'],
      trim: true,
    },
    actorRole: {
      type: String,
      required: [true, 'Actor Role is required'],
      trim: true,
    },
    source: {
      type: String,
      required: [true, 'Event source is required'],
      enum: ['USER', 'SYSTEM', 'AI', 'RULE_ENGINE'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action identifier is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Human-readable description is required'],
      trim: true,
    },
    beforeState: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    afterState: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: undefined,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'audit_events',
  }
);

// Compound indexes for optimal timeline and entity queries
AuditEventSchema.index({ inspectionId: 1, timestamp: -1 });
AuditEventSchema.index({ entityId: 1, timestamp: -1 });
AuditEventSchema.index({ actorUserId: 1, timestamp: -1 });

export const AuditEvent = mongoose.model<IAuditEvent>('AuditEvent', AuditEventSchema);

