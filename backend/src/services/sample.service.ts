import mongoose from 'mongoose';
import { Inspection, IInspection, Sample, ISample, ISampleImage, SampleStatus, UserRole, AIExtraction, ExtractionStatus } from '../models';
import {
  parseImagePayload,
  saveTemporaryImage,
  resolveTemporaryImagePath,
  removeTemporaryImage,
} from '../utils/tempStorage';

export interface UserContext {
  id: string;
  inspectorId?: string;
  role: UserRole;
  name: string;
}

export interface SampleProgressSummary {
  totalExpected: number;
  totalCreated: number;
  completed: number;
  inProgress: number;
  pending: number;
  remaining: number;
  isComplete: boolean;
  percentComplete: number;
}

export interface CreateSampleDTO {
  notes?: string;
  status?: SampleStatus;
}

export interface UpdateSampleDTO {
  notes?: string;
  status?: SampleStatus;
}

export interface AttachSampleImageDTO {
  imageData: string;
  mimeType?: string;
  fileName?: string;
}

export class SampleService {
  /**
   * Helper to resolve the parent inspection and verify access rights.
   */
  public static async resolveInspection(
    inspectionIdOrNumber: string,
    user: UserContext
  ): Promise<{ inspection: IInspection | null; forbidden: boolean }> {
    let inspection: IInspection | null = null;

    if (mongoose.Types.ObjectId.isValid(inspectionIdOrNumber)) {
      inspection = await Inspection.findById(inspectionIdOrNumber);
    }

    if (!inspection) {
      inspection = await Inspection.findOne({
        inspectionNumber: inspectionIdOrNumber.toUpperCase(),
      });
    }

    if (!inspection) {
      return { inspection: null, forbidden: false };
    }

    // Role-based authorization: Inspector must own the inspection
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
   * Computes dynamic progress telemetry for an inspection's child samples.
   */
  public static computeProgress(
    expectedCount: number,
    samples: ISample[]
  ): SampleProgressSummary {
    const totalCreated = samples.length;
    const completed = samples.filter(
      (s) =>
        s.status === SampleStatus.READY_FOR_ANALYSIS ||
        s.status === SampleStatus.VERIFIED
    ).length;
    const inProgress = samples.filter((s) => s.status === SampleStatus.IN_PROGRESS).length;
    const pending = samples.filter((s) => s.status === SampleStatus.PENDING).length;
    const remaining = Math.max(0, expectedCount - totalCreated);
    const percentComplete =
      expectedCount > 0 ? Math.min(100, Math.round((totalCreated / expectedCount) * 100)) : 0;

    return {
      totalExpected: expectedCount,
      totalCreated,
      completed,
      inProgress,
      pending,
      remaining,
      isComplete: totalCreated >= expectedCount,
      percentComplete,
    };
  }

  /**
   * Creates the next sequential child sample for an inspection.
   * Strictly enforces parent ownership and sample count limit.
   */
  static async createSample(
    inspectionIdOrNumber: string,
    user: UserContext,
    dto: CreateSampleDTO = {}
  ): Promise<{ sample: ISample; progress: SampleProgressSummary; inspection: IInspection }> {
    const { inspection, forbidden } = await this.resolveInspection(inspectionIdOrNumber, user);

    if (forbidden) {
      const err = new Error('Access Denied: You do not own this inspection case.');
      (err as any).statusCode = 403;
      throw err;
    }

    if (!inspection) {
      const err = new Error(`Inspection '${inspectionIdOrNumber}' not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    // Check count limit
    const existingSamples = await Sample.find({ inspectionId: inspection._id }).sort({
      sampleNumber: 1,
    });

    if (existingSamples.length >= inspection.samplesCount) {
      const err = new Error(
        `Maximum sample limit of ${inspection.samplesCount} reached for inspection ${inspection.inspectionNumber}. Additional samples cannot be created.`
      );
      (err as any).statusCode = 400;
      throw err;
    }

    // Determine next sequential sample number
    const lastSample = existingSamples[existingSamples.length - 1];
    const nextNumber = lastSample ? lastSample.sampleNumber + 1 : 1;
    const sampleCode = `${inspection.inspectionNumber}-S${String(nextNumber).padStart(2, '0')}`;

    // Validate technical status
    let initialStatus = SampleStatus.PENDING;
    if (dto.status) {
      if (
        dto.status === (SampleStatus.IN_PROGRESS as any) ||
        dto.status === (SampleStatus.READY_FOR_ANALYSIS as any)
      ) {
        initialStatus = dto.status;
      }
    }

    const sample = new Sample({
      inspectionId: inspection._id,
      sampleNumber: nextNumber,
      sampleCode,
      status: initialStatus,
      notes: dto.notes ? dto.notes.trim() : undefined,
    });

    await sample.save();

    try {
      const { AuditService } = await import('./audit.service');
      const { AuditEventType } = await import('../models/AuditEvent');
      await AuditService.recordEvent({
        eventType: AuditEventType.SAMPLE_CREATED,
        entityType: 'SAMPLE',
        entityId: sample._id.toString(),
        inspectionId: inspection._id,
        sampleId: sample._id,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        source: 'USER',
        action: 'Created Sample Unit',
        description: `Sample unit ${sample.sampleCode} (#${sample.sampleNumber}) registered`,
        afterState: {
          sampleNumber: sample.sampleNumber,
          sampleCode: sample.sampleCode,
          status: sample.status,
          notes: sample.notes,
        },
      });
    } catch (auditErr) {
      console.warn('Audit trail logging failed for createSample:', auditErr);
    }

    const allSamples = [...existingSamples, sample];
    const progress = this.computeProgress(inspection.samplesCount, allSamples);

    return { sample, progress, inspection };
  }

  /**
   * Lists all samples belonging to an inspection with progress telemetry.
   */
  static async listSamplesForInspection(
    inspectionIdOrNumber: string,
    user: UserContext
  ): Promise<{
    inspection: IInspection;
    samples: ISample[];
    progress: SampleProgressSummary;
  }> {
    const { inspection, forbidden } = await this.resolveInspection(inspectionIdOrNumber, user);

    if (forbidden) {
      const err = new Error('Access Denied: You do not have permission to view these samples.');
      (err as any).statusCode = 403;
      throw err;
    }

    if (!inspection) {
      const err = new Error(`Inspection '${inspectionIdOrNumber}' not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    const samples = await Sample.find({ inspectionId: inspection._id }).sort({ sampleNumber: 1 });
    const progress = this.computeProgress(inspection.samplesCount, samples);

    return { inspection, samples, progress };
  }

  /**
   * Retrieves a single sample by ID or sampleCode within an inspection.
   */
  static async getSampleById(
    inspectionIdOrNumber: string,
    sampleIdOrCode: string,
    user: UserContext
  ): Promise<{ sample: ISample; inspection: IInspection }> {
    const { inspection, forbidden } = await this.resolveInspection(inspectionIdOrNumber, user);

    if (forbidden) {
      const err = new Error('Access Denied: You do not have permission to view this sample.');
      (err as any).statusCode = 403;
      throw err;
    }

    if (!inspection) {
      const err = new Error(`Inspection '${inspectionIdOrNumber}' not found.`);
      (err as any).statusCode = 404;
      throw err;
    }

    let sample: ISample | null = null;

    if (mongoose.Types.ObjectId.isValid(sampleIdOrCode)) {
      sample = await Sample.findOne({
        _id: sampleIdOrCode,
        inspectionId: inspection._id,
      });
    }

    if (!sample) {
      sample = await Sample.findOne({
        sampleCode: sampleIdOrCode.toUpperCase(),
        inspectionId: inspection._id,
      });
    }

    if (!sample && !isNaN(Number(sampleIdOrCode))) {
      sample = await Sample.findOne({
        sampleNumber: Number(sampleIdOrCode),
        inspectionId: inspection._id,
      });
    }

    if (!sample) {
      const err = new Error(
        `Sample '${sampleIdOrCode}' was not found in inspection '${inspection.inspectionNumber}'.`
      );
      (err as any).statusCode = 404;
      throw err;
    }

    return { sample, inspection };
  }

  /**
   * Updates sample metadata (notes, technical status).
   * Strictly blocks premature legal compliance statuses.
   */
  static async updateSample(
    inspectionIdOrNumber: string,
    sampleIdOrCode: string,
    user: UserContext,
    dto: UpdateSampleDTO
  ): Promise<{ sample: ISample; progress: SampleProgressSummary; inspection: IInspection }> {
    if (user.role !== UserRole.INSPECTOR) {
      const err = new Error('Access Denied: Only field inspectors can update sample metadata.');
      (err as any).statusCode = 403;
      throw err;
    }

    const { sample, inspection } = await this.getSampleById(
      inspectionIdOrNumber,
      sampleIdOrCode,
      user
    );

    // Validate technical lifecycle status
    if (dto.status !== undefined) {
      const statusStr = String(dto.status);
      if (statusStr === 'COMPLIANT' || statusStr === 'NON_COMPLIANT') {
        const err = new Error(
          "Legal compliance determinations ('COMPLIANT', 'NON_COMPLIANT') are strictly disallowed in Phase 8 technical sampling lifecycle. Permitted technical statuses: PENDING, IN_PROGRESS, READY_FOR_ANALYSIS."
        );
        (err as any).statusCode = 400;
        throw err;
      }

      const validTechnicalStatuses = [
        SampleStatus.PENDING,
        SampleStatus.IN_PROGRESS,
        SampleStatus.READY_FOR_ANALYSIS,
        SampleStatus.CAPTURED,
        SampleStatus.VERIFIED,
      ];

      if (!validTechnicalStatuses.includes(dto.status)) {
        const err = new Error(
          `Invalid sample status. Permitted statuses: ${validTechnicalStatuses.join(', ')}`
        );
        (err as any).statusCode = 400;
        throw err;
      }

      sample.status = dto.status;
    }

    if (dto.notes !== undefined) {
      sample.notes = dto.notes.trim();
    }

    const beforeNotes = sample.notes;
    const beforeStatus = sample.status;

    await sample.save();

    try {
      const { AuditService } = await import('./audit.service');
      const { AuditEventType } = await import('../models/AuditEvent');
      await AuditService.recordEvent({
        eventType: AuditEventType.SAMPLE_UPDATED,
        entityType: 'SAMPLE',
        entityId: sample._id.toString(),
        inspectionId: inspection._id,
        sampleId: sample._id,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        source: 'USER',
        action: 'Updated Sample Unit',
        description: `Sample unit ${sample.sampleCode} updated: status=${sample.status}`,
        beforeState: { notes: beforeNotes, status: beforeStatus },
        afterState: { notes: sample.notes, status: sample.status },
      });
    } catch (auditErr) {
      console.warn('Audit trail logging failed for updateSample:', auditErr);
    }

    const allSamples = await Sample.find({ inspectionId: inspection._id }).sort({ sampleNumber: 1 });
    const progress = this.computeProgress(inspection.samplesCount, allSamples);

    return { sample, progress, inspection };
  }

  /**
   * Attaches a package image to an individual sample unit.
   * Enforces Inspector role, ownership, file size <= 5MB, format (JPEG, PNG, WEBP), and max 5 images limit.
   */
  static async attachImageToSample(
    inspectionIdOrNumber: string,
    sampleIdOrCode: string,
    user: UserContext,
    dto: AttachSampleImageDTO
  ): Promise<{ sample: ISample; image: ISampleImage; progress: SampleProgressSummary; inspection: IInspection }> {
    if (user.role !== UserRole.INSPECTOR) {
      const err = new Error('Access Denied: Only field inspectors are authorized to upload package images.');
      (err as any).statusCode = 403;
      throw err;
    }

    const { sample, inspection } = await this.getSampleById(
      inspectionIdOrNumber,
      sampleIdOrCode,
      user
    );

    if (!dto.imageData) {
      const err = new Error('Image data is required.');
      (err as any).statusCode = 400;
      throw err;
    }

    if (sample.images && sample.images.length >= 5) {
      const err = new Error('Maximum limit of 5 package images reached for this sample unit.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Parse, decode, and validate magic bytes & size
    let parsed: { buffer: Buffer; mimeType: string };
    try {
      parsed = parseImagePayload(dto.imageData, dto.mimeType);
    } catch (parseErr: any) {
      const err = new Error(parseErr.message);
      (err as any).statusCode = 400;
      throw err;
    }

    // Save temporary physical file
    const saved = saveTemporaryImage(parsed.buffer, parsed.mimeType, dto.fileName);

    const nextSequence = (sample.images ? sample.images.length : 0) + 1;

    const newImage: ISampleImage = {
      imageId: saved.imageId,
      sequence: nextSequence,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      fileName: saved.fileName,
      width: saved.width,
      height: saved.height,
      temporaryReference: saved.relativeReference,
      capturedAt: new Date(),
    };

    if (!sample.images) {
      sample.images = [];
    }

    sample.images.push(newImage);

    // Auto-advance sample status to CAPTURED if still PENDING
    if (sample.status === SampleStatus.PENDING) {
      sample.status = SampleStatus.CAPTURED;
    }

    await sample.save();

    try {
      const { AuditService } = await import('./audit.service');
      const { AuditEventType } = await import('../models/AuditEvent');
      await AuditService.recordEvent({
        eventType: AuditEventType.IMAGE_CAPTURED,
        entityType: 'IMAGE',
        entityId: newImage.imageId,
        inspectionId: inspection._id,
        sampleId: sample._id,
        actorUserId: user.id,
        actorName: user.name,
        actorRole: user.role,
        source: 'USER',
        action: 'Captured Package Image',
        description: `Package photo #${newImage.sequence} uploaded (${newImage.mimeType}, ${Math.round(newImage.sizeBytes / 1024)} KB) for sample ${sample.sampleCode}`,
        metadata: {
          imageId: newImage.imageId,
          sequence: newImage.sequence,
          mimeType: newImage.mimeType,
          sizeBytes: newImage.sizeBytes,
          fileName: newImage.fileName,
        },
      });
    } catch (auditErr) {
      console.warn('Audit trail logging failed for attachImageToSample:', auditErr);
    }

    // Mark previous extractions as STALE since image set changed
    if (mongoose.Types.ObjectId.isValid(sample._id)) {
      await AIExtraction.updateMany(
        { sampleId: sample._id, status: { $ne: ExtractionStatus.STALE } },
        { $set: { status: ExtractionStatus.STALE } }
      );
    }

    const allSamples = await Sample.find({ inspectionId: inspection._id }).sort({ sampleNumber: 1 });
    const progress = this.computeProgress(inspection.samplesCount, allSamples);

    return { sample, image: newImage, progress, inspection };
  }

  /**
   * Retrieves image metadata records attached to a sample unit.
   * Accessible to owning Inspector or Assistant Controller.
   */
  static async getSampleImages(
    inspectionIdOrNumber: string,
    sampleIdOrCode: string,
    user: UserContext
  ): Promise<{
    images: ISampleImage[];
    sampleCode: string;
    sampleNumber: number;
    sampleStatus: SampleStatus;
    inspectionNumber: string;
  }> {
    const { sample, inspection } = await this.getSampleById(
      inspectionIdOrNumber,
      sampleIdOrCode,
      user
    );

    return {
      images: sample.images || [],
      sampleCode: sample.sampleCode,
      sampleNumber: sample.sampleNumber,
      sampleStatus: sample.status,
      inspectionNumber: inspection.inspectionNumber,
    };
  }

  /**
   * Resolves physical temporary file path for authenticated streaming.
   * Gated by inspection access rights (Owner Inspector or Assistant Controller).
   */
  static async getSampleImageFile(
    inspectionIdOrNumber: string,
    sampleIdOrCode: string,
    imageId: string,
    user: UserContext
  ): Promise<{ fullPath: string; mimeType: string; fileName: string }> {
    const { sample } = await this.getSampleById(
      inspectionIdOrNumber,
      sampleIdOrCode,
      user
    );

    const image = sample.images?.find((img) => img.imageId === imageId);
    if (!image) {
      const err = new Error(`Image '${imageId}' not found for sample '${sample.sampleCode}'.`);
      (err as any).statusCode = 404;
      throw err;
    }

    const fullPath = resolveTemporaryImagePath(image.temporaryReference);
    if (!fullPath) {
      const err = new Error('Temporary image file not found or expired on server.');
      (err as any).statusCode = 404;
      throw err;
    }

    return {
      fullPath,
      mimeType: image.mimeType,
      fileName: image.fileName || `sample_${sample.sampleNumber}_${image.sequence}.${image.mimeType.split('/')[1]}`,
    };
  }

  /**
   * Deletes a package image from a sample unit and purges temporary physical file.
   * Enforces Inspector ownership.
   */
  static async removeImageFromSample(
    inspectionIdOrNumber: string,
    sampleIdOrCode: string,
    imageId: string,
    user: UserContext
  ): Promise<{ sample: ISample; progress: SampleProgressSummary; inspection: IInspection }> {
    if (user.role !== UserRole.INSPECTOR) {
      const err = new Error('Access Denied: Only field inspectors are authorized to delete package images.');
      (err as any).statusCode = 403;
      throw err;
    }

    const { sample, inspection } = await this.getSampleById(
      inspectionIdOrNumber,
      sampleIdOrCode,
      user
    );

    const imgIndex = sample.images?.findIndex((img) => img.imageId === imageId);
    if (imgIndex === undefined || imgIndex === -1) {
      const err = new Error(`Image '${imageId}' was not found on sample '${sample.sampleCode}'.`);
      (err as any).statusCode = 404;
      throw err;
    }

    const targetImage = sample.images[imgIndex];

    // Remove physical file from temporary upload directory
    removeTemporaryImage(targetImage.temporaryReference);

    // Remove metadata record from sample
    sample.images.splice(imgIndex, 1);

    // Re-sequence remaining images
    sample.images.forEach((img, idx) => {
      img.sequence = idx + 1;
    });

    // If all images removed and status is CAPTURED, revert to PENDING
    if (sample.images.length === 0 && sample.status === SampleStatus.CAPTURED) {
      sample.status = SampleStatus.PENDING;
    }

    await sample.save();

    // Mark previous extractions as STALE since image set changed
    if (mongoose.Types.ObjectId.isValid(sample._id)) {
      await AIExtraction.updateMany(
        { sampleId: sample._id, status: { $ne: ExtractionStatus.STALE } },
        { $set: { status: ExtractionStatus.STALE } }
      );
    }

    const allSamples = await Sample.find({ inspectionId: inspection._id }).sort({ sampleNumber: 1 });
    const progress = this.computeProgress(inspection.samplesCount, allSamples);

    return { sample, progress, inspection };
  }
}

