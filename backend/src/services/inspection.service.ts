import mongoose from 'mongoose';
import { Inspection, IInspection, Sample, PackageContext, InspectionStatus, UserRole } from '../models';
import { escapeRegex } from '../utils/securitySanitizer';

export interface CreateInspectionDTO {
  commodity: string;
  brand?: string;
  packageContext: PackageContext;
  location: string;
  market?: string;
  samplesCount: number;
  remarks?: string;
}

export interface UserContext {
  id: string;
  inspectorId?: string;
  role: UserRole;
  name: string;
}

export class InspectionService {
  /**
   * Generates a unique sequential inspection number (INS-YYYY-XXX)
   */
  private static async generateInspectionNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INS-${year}-`;
    const count = await Inspection.countDocuments();
    let seq = count + 1;
    let inspectionNumber = `${prefix}${String(seq).padStart(3, '0')}`;

    while (await Inspection.exists({ inspectionNumber })) {
      seq += 1;
      inspectionNumber = `${prefix}${String(seq).padStart(3, '0')}`;
    }

    return inspectionNumber;
  }

  /**
   * Creates a new inspection record initiated by an authenticated inspector.
   * Persists exactly ONE inspection document in MongoDB Atlas.
   */
  static async createInspection(
    dto: CreateInspectionDTO,
    user: UserContext
  ): Promise<IInspection> {
    const inspectionNumber = await this.generateInspectionNumber();
    const inspectorId = user.inspectorId || user.id;

    const inspection = new Inspection({
      inspectionNumber,
      inspectorId,
      commodity: dto.commodity.trim(),
      brand: dto.brand ? dto.brand.trim() : undefined,
      packageContext: dto.packageContext,
      location: dto.location.trim(),
      market: dto.market ? dto.market.trim() : undefined,
      samplesCount: Math.floor(dto.samplesCount),
      status: InspectionStatus.READY_FOR_SAMPLING,
      remarks: dto.remarks ? dto.remarks.trim() : undefined,
    });

    const saved = await inspection.save();

    try {
      const { AuditService } = await import('./audit.service');
      const { AuditEventType } = await import('../models/AuditEvent');
      await AuditService.recordEvent({
        eventType: AuditEventType.INSPECTION_CREATED,
        entityType: 'INSPECTION',
        entityId: saved._id.toString(),
        inspectionId: saved._id,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        source: 'USER',
        action: 'Created Inspection',
        description: `Inspection ${saved.inspectionNumber} initialized for commodity "${saved.commodity}" (${saved.packageContext})`,
        afterState: {
          inspectionNumber: saved.inspectionNumber,
          commodity: saved.commodity,
          packageContext: saved.packageContext,
          status: saved.status,
          location: saved.location,
          samplesCount: saved.samplesCount,
        },
      });
    } catch (auditErr) {
      console.warn('Audit trail logging failed for createInspection:', auditErr);
    }

    return saved;
  }

  /**
   * Lists inspections scoped by user role.
   * Inspectors can only see their own inspections.
   * Controllers can view all inspections within their supervisory jurisdiction.
   */
  static async listInspections(
    user: UserContext,
    options: { search?: string; status?: string; packageContext?: string } = {}
  ): Promise<IInspection[]> {
    const query: Record<string, unknown> = {};

    // Role-based data isolation
    if (user.role === UserRole.INSPECTOR) {
      const inspectorId = user.inspectorId || user.id;
      query.$or = [{ inspectorId }, { inspectorId: user.id }];
    }

    // Status filter
    if (options.status && Object.values(InspectionStatus).includes(options.status as InspectionStatus)) {
      query.status = options.status;
    }

    // Context filter
    if (
      options.packageContext &&
      Object.values(PackageContext).includes(options.packageContext as PackageContext)
    ) {
      query.packageContext = options.packageContext;
    }

    // Search query across commodity, brand, location, inspectionNumber
    if (options.search && options.search.trim() !== '') {
      const escaped = escapeRegex(options.search.trim());
      const searchRegex = new RegExp(escaped, 'i');
      const searchConditions = [
        { commodity: searchRegex },
        { brand: searchRegex },
        { location: searchRegex },
        { inspectionNumber: searchRegex },
      ];

      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    return await Inspection.find(query).sort({ createdAt: -1 });
  }

  /**
   * Retrieves an inspection by ID or inspectionNumber.
   * Enforces strict data isolation: an inspector cannot view another inspector's record.
   */
  static async getInspectionById(
    idOrNumber: string,
    user: UserContext
  ): Promise<{ inspection: IInspection | null; forbidden: boolean }> {
    let inspection: IInspection | null = null;

    if (mongoose.Types.ObjectId.isValid(idOrNumber)) {
      inspection = await Inspection.findById(idOrNumber);
    }

    if (!inspection) {
      inspection = await Inspection.findOne({ inspectionNumber: idOrNumber.toUpperCase() });
    }

    if (!inspection) {
      return { inspection: null, forbidden: false };
    }

    // Verify ownership for Inspectors
    if (user.role === UserRole.INSPECTOR) {
      const userBadge = user.inspectorId;
      const userMongoId = user.id;
      const isOwner =
        inspection.inspectorId === userBadge || inspection.inspectorId === userMongoId;

      if (!isOwner) {
        return { inspection: null, forbidden: true };
      }
    }

    return { inspection, forbidden: false };
  }

  /**
   * Finalizes an inspection case: validates officer ownership and sample scope,
   * transitions status to COMPLETED, and records an immutable audit event.
   */
  static async finalizeInspection(
    idOrNumber: string,
    user: UserContext,
    remarks?: string
  ): Promise<{ inspection: IInspection; auditEventId: string }> {
    const { inspection, forbidden } = await this.getInspectionById(idOrNumber, user);

    if (forbidden) {
      const err = new Error('Access Denied: You do not have permission to finalize this inspection.');
      (err as any).statusCode = 403;
      throw err;
    }

    if (!inspection) {
      const err = new Error(`Inspection '${idOrNumber}' not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    if (inspection.status === InspectionStatus.COMPLETED) {
      return { inspection, auditEventId: '' };
    }

    // Validate that all planned sample units have been created
    const samplesCount = await Sample.countDocuments({ inspectionId: inspection._id });
    if (samplesCount < inspection.samplesCount) {
      const err = new Error(
        `Cannot finalize inspection: Target sample scope is ${inspection.samplesCount} units, but only ${samplesCount} units have been created.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    const previousStatus = inspection.status;
    inspection.status = InspectionStatus.COMPLETED;
    if (remarks && typeof remarks === 'string' && remarks.trim() !== '') {
      inspection.remarks = inspection.remarks
        ? `${inspection.remarks} | Final Attestation: ${remarks.trim()}`
        : `Final Attestation: ${remarks.trim()}`;
    }

    const saved = await inspection.save();
    let auditEventId = '';

    try {
      const { AuditService } = await import('./audit.service');
      const { AuditEventType } = await import('../models/AuditEvent');
      const auditEvent = await AuditService.recordEvent({
        eventType: AuditEventType.INSPECTION_STATUS_CHANGED,
        entityType: 'INSPECTION',
        entityId: saved._id.toString(),
        inspectionId: saved._id,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        source: 'USER',
        action: 'Finalized & Sealed Inspection',
        description: `Inspection ${saved.inspectionNumber} officially finalized and marked COMPLETED with ${samplesCount} sample units.`,
        beforeState: { status: previousStatus },
        afterState: { status: saved.status },
      });
      auditEventId = auditEvent ? auditEvent._id.toString() : '';
    } catch (auditErr) {
      console.warn('Audit trail logging failed for finalizeInspection:', auditErr);
    }

    // Purge physical temporary image files from local disk upon formal case completion (Zero local retention)
    try {
      const childSamples = await Sample.find({ inspectionId: inspection._id }).select('images');
      const { removeTemporaryImage } = await import('../utils/tempStorage');
      for (const s of childSamples) {
        if (s.images && s.images.length > 0) {
          for (const img of s.images) {
            if (img.temporaryReference) {
              removeTemporaryImage(img.temporaryReference);
            }
          }
        }
      }
    } catch (cleanupErr) {
      console.warn('[INSPECTION_SERVICE] Post-finalization temp image cleanup non-critical error:', cleanupErr);
    }

    return { inspection: saved, auditEventId };
  }
}

