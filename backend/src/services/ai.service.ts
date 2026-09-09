import fs from 'fs';
import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import {
  Sample,
  ISample,
  ISampleImage,
  SampleStatus,
  UserRole,
  AIExtraction,
  IAIExtraction,
  ExtractionStatus,
} from '../models';
import {
  DeclarationCategory,
  DeclarationExtraction,
  ReviewStatus,
  PackageImagePayload,
} from '../ai/aiProvider.interface';
import { GeminiProvider } from '../ai/geminiProvider';
import { SampleService, UserContext } from './sample.service';
import { resolveTemporaryImagePath } from '../utils/tempStorage';

export interface DeclarationReviewDTO {
  status: ReviewStatus;
  notes?: string;
}

export class AIService {
  private static provider = new GeminiProvider();

  /**
   * Generates a deterministic SHA256 hash for a set of sample images.
   */
  public static computeImageSetHash(images: ISampleImage[]): string {
    if (!images || images.length === 0) {
      return 'EMPTY_SET';
    }

    const fingerprint = images
      .slice()
      .sort((a, b) => a.imageId.localeCompare(b.imageId))
      .map((img) => `${img.imageId}:${img.sequence}:${img.sizeBytes}:${img.mimeType}`)
      .join('|');

    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  /**
   * Orchestrates multimodal package declaration extraction for a sample.
   * Gated to owning Inspector.
   */
  public static async analyzeSample(
    inspectionIdOrNumber: string,
    sampleIdOrCode: string,
    user: UserContext,
    options?: { forceReanalyze?: boolean }
  ): Promise<{
    extraction: IAIExtraction;
    sample: ISample;
    cached: boolean;
  }> {
    // Only field inspectors can execute extraction analysis
    if (user.role !== UserRole.INSPECTOR) {
      const err = new Error('Access Denied: Only field inspectors can trigger AI declaration analysis.');
      (err as any).statusCode = 403;
      throw err;
    }

    const { sample, inspection } = await SampleService.getSampleById(
      inspectionIdOrNumber,
      sampleIdOrCode,
      user
    );

    const sampleImages = sample.images || [];
    if (sampleImages.length === 0) {
      const err = new Error(
        'Cannot analyze package declarations: No package photos have been captured for this sample unit. Please capture or upload at least one image.'
      );
      (err as any).statusCode = 400;
      throw err;
    }

    const currentHash = this.computeImageSetHash(sampleImages);

    // Cache hit check: if forceReanalyze is false and an extraction exists with identical image set hash
    if (!options?.forceReanalyze) {
      const existingExtraction = await AIExtraction.findOne({
        sampleId: sample._id,
        imageSetHash: currentHash,
        status: { $in: [ExtractionStatus.COMPLETED, ExtractionStatus.REQUIRES_REVIEW] },
      }).sort({ createdAt: -1 });

      if (existingExtraction) {
        return {
          extraction: existingExtraction,
          sample,
          cached: true,
        };
      }
    }

    // Read image files from temporary storage
    const imagePayloads: PackageImagePayload[] = [];
    for (const img of sampleImages) {
      const fullPath = resolveTemporaryImagePath(img.temporaryReference);
      if (!fullPath || !fs.existsSync(fullPath)) {
        const err = new Error(
          `Temporary image file for image #${img.sequence} (${img.imageId}) could not be read from disk.`
        );
        (err as any).statusCode = 404;
        throw err;
      }

      const buffer = fs.readFileSync(fullPath);
      imagePayloads.push({
        imageId: img.imageId,
        mimeType: img.mimeType,
        buffer,
        sequence: img.sequence,
        fileName: img.fileName,
      });
    }

    // Call AI Provider
    const aiResponse = await this.provider.analyzePackageImages({
      inspectionId: String(inspection._id),
      sampleId: String(sample._id),
      packageContext: inspection.packageContext,
      commodity: inspection.commodity,
      images: imagePayloads,
    });

    // Invalidate/mark older extractions for this sample as STALE
    await AIExtraction.updateMany(
      { sampleId: sample._id, status: { $ne: ExtractionStatus.STALE } },
      { $set: { status: ExtractionStatus.STALE } }
    );

    const extractionId = `EXT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // Determine status based on low confidence findings
    const hasUnclear = aiResponse.declarations.some(
      (d) => d.state === 'UNCLEAR' || d.state === 'LOW_CONFIDENCE'
    );
    const extractionStatus = hasUnclear
      ? ExtractionStatus.REQUIRES_REVIEW
      : ExtractionStatus.COMPLETED;

    const newExtraction = new AIExtraction({
      extractionId,
      inspectionId: inspection._id,
      sampleId: sample._id,
      imageIds: sampleImages.map((i) => i.imageId),
      imageSetHash: currentHash,
      provider: aiResponse.provider,
      aiModel: aiResponse.model,
      promptVersion: aiResponse.promptVersion,
      status: extractionStatus,
      overallConfidence: aiResponse.overallConfidence,
      declarations: aiResponse.declarations,
      warnings: aiResponse.warnings,
      processingMetadata: {
        durationMs: aiResponse.processingMetadata.durationMs,
        imagesCount: aiResponse.processingMetadata.imagesCount,
        timestamp: new Date(aiResponse.processingMetadata.timestamp),
      },
    });

    await newExtraction.save();

    // Advance sample status to EXTRACTED if currently in CAPTURED, PENDING, or READY_FOR_ANALYSIS
    if (
      sample.status === SampleStatus.CAPTURED ||
      sample.status === SampleStatus.PENDING ||
      sample.status === SampleStatus.READY_FOR_ANALYSIS
    ) {
      sample.status = SampleStatus.EXTRACTED;
      await sample.save();
    }

    return {
      extraction: newExtraction,
      sample,
      cached: false,
    };
  }

  /**
   * Retrieves all extraction records for a sample unit.
   * Checks whether the latest extraction is stale compared to the current image set.
   */
  public static async getSampleExtractions(
    inspectionIdOrNumber: string,
    sampleIdOrCode: string,
    user: UserContext
  ): Promise<{
    extractions: IAIExtraction[];
    latestExtraction: IAIExtraction | null;
    isStale: boolean;
    sampleCode: string;
    sampleStatus: SampleStatus;
  }> {
    const { sample } = await SampleService.getSampleById(
      inspectionIdOrNumber,
      sampleIdOrCode,
      user
    );

    const extractions = await AIExtraction.find({ sampleId: sample._id }).sort({
      createdAt: -1,
    });

    const latestExtraction = extractions[0] || null;
    const currentHash = this.computeImageSetHash(sample.images || []);

    let isStale = false;
    if (latestExtraction) {
      isStale = latestExtraction.imageSetHash !== currentHash;
      if (isStale && latestExtraction.status !== ExtractionStatus.STALE) {
        latestExtraction.status = ExtractionStatus.STALE;
        await latestExtraction.save();
      }
    }

    return {
      extractions,
      latestExtraction,
      isStale,
      sampleCode: sample.sampleCode,
      sampleStatus: sample.status,
    };
  }

  /**
   * Allows an Inspector to review and verify or flag a specific extracted declaration.
   */
  public static async reviewDeclaration(
    inspectionIdOrNumber: string,
    sampleIdOrCode: string,
    extractionId: string,
    category: DeclarationCategory,
    reviewDto: DeclarationReviewDTO,
    user: UserContext
  ): Promise<IAIExtraction> {
    if (user.role !== UserRole.INSPECTOR) {
      const err = new Error('Access Denied: Only field inspectors can record declaration reviews.');
      (err as any).statusCode = 403;
      throw err;
    }

    const { sample } = await SampleService.getSampleById(
      inspectionIdOrNumber,
      sampleIdOrCode,
      user
    );

    const extraction = await AIExtraction.findOne({
      $or: [
        { extractionId: extractionId.toUpperCase() },
        ...(mongoose.Types.ObjectId.isValid(extractionId) ? [{ _id: extractionId }] : []),
      ],
      sampleId: sample._id,
    });

    if (!extraction) {
      const err = new Error(`AI Extraction '${extractionId}' not found for sample '${sample.sampleCode}'.`);
      (err as any).statusCode = 404;
      throw err;
    }

    const decl = extraction.declarations.find((d) => d.category === category);
    if (!decl) {
      const err = new Error(`Declaration category '${category}' not found in extraction '${extractionId}'.`);
      (err as any).statusCode = 404;
      throw err;
    }

    decl.inspectorReview = {
      status: reviewDto.status,
      reviewedAt: new Date(),
      reviewedBy: user.inspectorId || user.name,
      notes: reviewDto.notes ? reviewDto.notes.trim() : undefined,
    };

    await extraction.save();
    return extraction;
  }

  /**
   * Invalidate extractions as STALE when sample images mutate.
   */
  public static async markExtractionsStale(sampleId: string | Types.ObjectId): Promise<void> {
    try {
      await AIExtraction.updateMany(
        { sampleId: new Types.ObjectId(String(sampleId)), status: { $ne: ExtractionStatus.STALE } },
        { $set: { status: ExtractionStatus.STALE } }
      );
    } catch {
      // Non-critical background invalidation
    }
  }
}
