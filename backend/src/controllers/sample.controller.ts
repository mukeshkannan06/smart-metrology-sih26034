import { Request, Response } from 'express';
import { SampleService } from '../services/sample.service';

export class SampleController {
  /**
   * POST /api/inspections/:inspectionId/samples
   * Adds the next sequential sample unit to an inspection.
   */
  static async createSample(req: Request, res: Response): Promise<void> {
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

      if (!inspectionId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Inspection ID parameter is required.',
        });
        return;
      }

      const result = await SampleService.createSample(
        inspectionId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        },
        req.body
      );

      res.status(201).json({
        success: true,
        message: `Sample ${result.sample.sampleCode} added successfully.`,
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

      console.error('[SAMPLE_CONTROLLER] Error creating sample:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create sample record.',
      });
    }
  }

  /**
   * GET /api/inspections/:inspectionId/samples
   * Lists all child samples and progress telemetry for an inspection.
   */
  static async listSamples(req: Request, res: Response): Promise<void> {
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

      if (!inspectionId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Inspection ID parameter is required.',
        });
        return;
      }

      const result = await SampleService.listSamplesForInspection(inspectionId, {
        id: req.user.id,
        inspectorId: req.user.inspectorId,
        role: req.user.role,
        name: req.user.name,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      if (statusCode !== 500) {
        res.status(statusCode).json({
          success: false,
          error: statusCode === 403 ? 'Forbidden' : 'Not Found',
          message: error.message,
        });
        return;
      }

      console.error('[SAMPLE_CONTROLLER] Error listing samples:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve samples.',
      });
    }
  }

  /**
   * GET /api/inspections/:inspectionId/samples/:sampleId
   * Retrieves single sample details.
   */
  static async getSampleById(req: Request, res: Response): Promise<void> {
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
          message: 'Inspection ID and Sample ID parameters are required.',
        });
        return;
      }

      const result = await SampleService.getSampleById(
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
          error: statusCode === 403 ? 'Forbidden' : 'Not Found',
          message: error.message,
        });
        return;
      }

      console.error('[SAMPLE_CONTROLLER] Error retrieving sample:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve sample details.',
      });
    }
  }

  /**
   * PATCH /api/inspections/:inspectionId/samples/:sampleId
   * Updates sample notes and technical status.
   */
  static async updateSample(req: Request, res: Response): Promise<void> {
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
          message: 'Inspection ID and Sample ID parameters are required.',
        });
        return;
      }

      const result = await SampleService.updateSample(
        inspectionId,
        sampleId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        },
        req.body
      );

      res.status(200).json({
        success: true,
        message: `Sample ${result.sample.sampleCode} updated successfully.`,
        data: result,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      if (statusCode !== 500) {
        res.status(statusCode).json({
          success: false,
          error:
            statusCode === 403
              ? 'Forbidden'
              : statusCode === 404
              ? 'Not Found'
              : 'Validation Error',
          message: error.message,
        });
        return;
      }

      console.error('[SAMPLE_CONTROLLER] Error updating sample:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update sample record.',
      });
    }
  }

  /**
   * POST /api/inspections/:inspectionId/samples/:sampleId/images
   * Uploads and attaches a package image to an individual sample.
   */
  static async uploadImage(req: Request, res: Response): Promise<void> {
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
          message: 'Inspection ID and Sample ID parameters are required.',
        });
        return;
      }

      const result = await SampleService.attachImageToSample(
        inspectionId,
        sampleId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        },
        req.body
      );

      res.status(201).json({
        success: true,
        message: `Package image #${result.image.sequence} attached successfully to sample ${result.sample.sampleCode}.`,
        data: result,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      if (statusCode !== 500) {
        res.status(statusCode).json({
          success: false,
          error:
            statusCode === 403
              ? 'Forbidden'
              : statusCode === 404
              ? 'Not Found'
              : 'Validation Error',
          message: error.message,
        });
        return;
      }

      console.error('[SAMPLE_CONTROLLER] Error uploading package image:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to upload package image.',
      });
    }
  }

  /**
   * GET /api/inspections/:inspectionId/samples/:sampleId/images
   * Lists image metadata records attached to a sample.
   */
  static async getImages(req: Request, res: Response): Promise<void> {
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
          message: 'Inspection ID and Sample ID parameters are required.',
        });
        return;
      }

      const result = await SampleService.getSampleImages(
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
          error:
            statusCode === 403
              ? 'Forbidden'
              : statusCode === 404
              ? 'Not Found'
              : 'Validation Error',
          message: error.message,
        });
        return;
      }

      console.error('[SAMPLE_CONTROLLER] Error listing sample images:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to fetch sample images.',
      });
    }
  }

  /**
   * GET /api/inspections/:inspectionId/samples/:sampleId/images/:imageId
   * Streams the binary image file with private cache headers.
   */
  static async streamImage(req: Request, res: Response): Promise<void> {
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
      const imageId = Array.isArray(req.params.imageId)
        ? req.params.imageId[0]
        : req.params.imageId;

      if (!inspectionId || !sampleId || !imageId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Inspection ID, Sample ID, and Image ID parameters are required.',
        });
        return;
      }

      const fileInfo = await SampleService.getSampleImageFile(
        inspectionId,
        sampleId,
        imageId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        }
      );

      // Set security and private caching headers (no public exposure)
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.sendFile(fileInfo.fullPath);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      if (statusCode !== 500) {
        res.status(statusCode).json({
          success: false,
          error:
            statusCode === 403
              ? 'Forbidden'
              : statusCode === 404
              ? 'Not Found'
              : 'Validation Error',
          message: error.message,
        });
        return;
      }

      console.error('[SAMPLE_CONTROLLER] Error streaming sample image:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to stream sample image.',
      });
    }
  }

  /**
   * DELETE /api/inspections/:inspectionId/samples/:sampleId/images/:imageId
   * Deletes a package image from a sample and purges temporary physical file.
   */
  static async deleteImage(req: Request, res: Response): Promise<void> {
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
      const imageId = Array.isArray(req.params.imageId)
        ? req.params.imageId[0]
        : req.params.imageId;

      if (!inspectionId || !sampleId || !imageId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Inspection ID, Sample ID, and Image ID parameters are required.',
        });
        return;
      }

      const result = await SampleService.removeImageFromSample(
        inspectionId,
        sampleId,
        imageId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        }
      );

      res.status(200).json({
        success: true,
        message: 'Package image removed successfully.',
        data: result,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      if (statusCode !== 500) {
        res.status(statusCode).json({
          success: false,
          error:
            statusCode === 403
              ? 'Forbidden'
              : statusCode === 404
              ? 'Not Found'
              : 'Validation Error',
          message: error.message,
        });
        return;
      }

      console.error('[SAMPLE_CONTROLLER] Error deleting sample image:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete sample image.',
      });
    }
  }
}

