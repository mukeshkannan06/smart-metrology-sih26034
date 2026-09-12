import mongoose from 'mongoose';
import { Inspection, IInspection, PackageContext, InspectionStatus, UserRole } from '../models';
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
}

