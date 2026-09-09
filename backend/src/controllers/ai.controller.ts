import { Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { DeclarationCategory, ReviewStatus } from '../ai/aiProvider.interface';

export class AIController {
  /**
   * POST /api/inspections/:inspectionId/samples/:sampleId/ai-analysis
   * Triggers multimodal package declaration extraction for a sample unit.
   */
  static async analyzeSample(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
        return;
      }

      const inspectionId = Array.isArray(req.params.inspectionId)
        ? req.params.inspectionId[0]
        : req.params.inspectionId;
      const sampleId = Array.isArray(req.params.sampleId)
        ? req.params.sampleId[0]
        : req.params.sampleId;

      if (!inspectionId || !sampleId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Both inspectionId and sampleId parameters are required.',
        });
        return;
      }

      const forceReanalyze = Boolean(req.body?.forceReanalyze);

      const result = await AIService.analyzeSample(
        inspectionId,
        sampleId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        },
        { forceReanalyze }
      );

      res.status(200).json({
        success: true,
        message: result.cached
          ? 'Retrieved existing package declaration extraction (unchanged images).'
          : 'Package declarations extracted successfully.',
        data: result,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      if (statusCode !== 500) {
        res.status(statusCode).json({
          success: false,
          error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'Not Found' : 'Validation Error',
          message: error.message,
        });
        return;
      }

      console.error('[AI_CONTROLLER] Error analyzing sample:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred during AI package declaration extraction.',
      });
    }
  }

  /**
   * GET /api/inspections/:inspectionId/samples/:sampleId/ai-extractions
   * Retrieves package declaration extraction history for a sample unit.
   */
  static async getSampleExtractions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
        return;
      }

      const inspectionId = Array.isArray(req.params.inspectionId)
        ? req.params.inspectionId[0]
        : req.params.inspectionId;
      const sampleId = Array.isArray(req.params.sampleId)
        ? req.params.sampleId[0]
        : req.params.sampleId;

      if (!inspectionId || !sampleId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Both inspectionId and sampleId parameters are required.',
        });
        return;
      }

      const result = await AIService.getSampleExtractions(
        inspectionId,
        sampleId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        }
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      if (statusCode !== 500) {
        res.status(statusCode).json({
          success: false,
          error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'Not Found' : 'Validation Error',
          message: error.message,
        });
        return;
      }

      console.error('[AI_CONTROLLER] Error fetching extractions:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to retrieve AI extractions.',
      });
    }
  }

  /**
   * PATCH /api/inspections/:inspectionId/samples/:sampleId/ai-extractions/:extractionId/declarations/:category
   * Records an Inspector's manual review/verification on an extracted declaration category.
   */
  static async reviewDeclaration(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
        return;
      }

      const inspectionId = Array.isArray(req.params.inspectionId)
        ? req.params.inspectionId[0]
        : req.params.inspectionId;
      const sampleId = Array.isArray(req.params.sampleId)
        ? req.params.sampleId[0]
        : req.params.sampleId;
      const extractionId = Array.isArray(req.params.extractionId)
        ? req.params.extractionId[0]
        : req.params.extractionId;
      const category = Array.isArray(req.params.category)
        ? req.params.category[0]
        : req.params.category;

      if (!inspectionId || !sampleId || !extractionId || !category) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'inspectionId, sampleId, extractionId, and category parameters are required.',
        });
        return;
      }

      const status = req.body?.status as ReviewStatus;
      const validStatuses: ReviewStatus[] = ['PENDING', 'CONFIRMED', 'INCORRECT', 'UNCLEAR'];
      if (!status || !validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: `Review status must be one of: ${validStatuses.join(', ')}`,
        });
        return;
      }

      const updated = await AIService.reviewDeclaration(
        inspectionId,
        sampleId,
        extractionId,
        category as DeclarationCategory,
        {
          status,
          notes: req.body?.notes,
        },
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        }
      );

      res.status(200).json({
        success: true,
        message: `Declaration ${category} marked as ${status}.`,
        data: { extraction: updated },
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      if (statusCode !== 500) {
        res.status(statusCode).json({
          success: false,
          error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'Not Found' : 'Validation Error',
          message: error.message,
        });
        return;
      }

      console.error('[AI_CONTROLLER] Error reviewing declaration:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to update declaration review.',
      });
    }
  }
}

