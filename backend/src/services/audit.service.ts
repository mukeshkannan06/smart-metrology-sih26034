import mongoose from 'mongoose';
import { AuditEvent, IAuditEvent, AuditEventType, AuditEntityType, AuditEventSource } from '../models';

export interface RecordAuditEventDTO {
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  inspectionId: mongoose.Types.ObjectId | string;
  sampleId?: mongoose.Types.ObjectId | string;
  findingId?: mongoose.Types.ObjectId | string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: string;
  source?: AuditEventSource;
  action: string;
  description: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class AuditService {
  /**
   * Generates a unique sequential audit event ID (AUD-YYYYMMDD-XXXXX)
   */
  private static async generateAuditEventId(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `AUD-${dateStr}-`;
    const count = await AuditEvent.countDocuments();
    let seq = count + 1;
    let auditEventId = `${prefix}${String(seq).padStart(5, '0')}`;

    while (await AuditEvent.exists({ auditEventId })) {
      seq += 1;
      auditEventId = `${prefix}${String(seq).padStart(5, '0')}`;
    }

    return auditEventId;
  }

  /**
   * Records an immutable audit event
   */
  public static async recordEvent(data: RecordAuditEventDTO): Promise<IAuditEvent> {
    try {
      const auditEventId = await this.generateAuditEventId();

      const event = new AuditEvent({
        auditEventId,
        eventType: data.eventType,
        entityType: data.entityType,
        entityId: data.entityId,
        inspectionId: new mongoose.Types.ObjectId(data.inspectionId.toString()),
        sampleId: data.sampleId ? new mongoose.Types.ObjectId(data.sampleId.toString()) : undefined,
        findingId: data.findingId ? new mongoose.Types.ObjectId(data.findingId.toString()) : undefined,
        actorUserId: data.actorUserId || 'SYSTEM',
        actorName: data.actorName || 'System Process',
        actorRole: data.actorRole || 'SYSTEM',
        source: data.source || 'SYSTEM',
        action: data.action,
        description: data.description,
        beforeState: data.beforeState,
        afterState: data.afterState,
        metadata: data.metadata,
        timestamp: new Date(),
      });

      await event.save();
      return event;
    } catch (error) {
      console.error('Failed to record audit event:', error);
      // We log error but don't crash the primary operation if audit recording fails, unless strictly required
      throw error;
    }
  }

  /**
   * Retrieves the complete chronological audit trail for an inspection
   */
  public static async getInspectionAuditTrail(
    inspectionId: string | mongoose.Types.ObjectId,
    filters?: {
      entityType?: AuditEntityType;
      eventType?: AuditEventType;
      source?: AuditEventSource;
    }
  ): Promise<IAuditEvent[]> {
    const query: any = {
      inspectionId: new mongoose.Types.ObjectId(inspectionId.toString()),
    };

    if (filters?.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters?.eventType) {
      query.eventType = filters.eventType;
    }
    if (filters?.source) {
      query.source = filters.source;
    }

    // Chronological order: oldest to newest
    return AuditEvent.find(query).sort({ timestamp: 1 }).lean();
  }

  /**
   * Retrieves the audit trail for a specific entity (e.g. sample or finding)
   */
  public static async getEntityAuditTrail(entityId: string): Promise<IAuditEvent[]> {
    return AuditEvent.find({ entityId }).sort({ timestamp: 1 }).lean();
  }
}

