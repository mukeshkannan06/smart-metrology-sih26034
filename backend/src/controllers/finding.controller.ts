import { Request, Response } from 'express';
import { FindingService, FindingFilterOptions } from '../services/finding.service';
import { ComplianceFinding, Inspection, UserRole } from '../models';

export class FindingController {
  /**
   * GET /api/findings/inspections/:inspectionId
   * Retrieves all compliance findings for an inspection, scoped by user role.
   */
  static async getInspectionFindings(req: Request, res: Response): Promise<void> {
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

      const filters: FindingFilterOptions = {};
      if (req.query.sampleId) filters.sampleId = String(req.query.sampleId);
      if (req.query.candidateStatus) filters.candidateStatus = String(req.query.candidateStatus);
      if (req.query.status) filters.status = String(req.query.status);
      if (req.query.ruleFamily) filters.ruleFamily = String(req.query.ruleFamily);
      if (req.query.isVerified !== undefined) {
        filters.isVerified = req.query.isVerified === 'true';
      }

      const result = await FindingService.getInspectionFindings(
        inspectionId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        },
        filters
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

      console.error('[FINDING_CONTROLLER] Error fetching inspection findings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve inspection findings.',
      });
    }
  }

  /**
   * GET /api/findings/samples/:sampleId
   * Retrieves compliance findings for a specific sample unit.
   */
  static async getSampleFindings(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
        return;
      }

      const sampleId = Array.isArray(req.params.sampleId)
        ? req.params.sampleId[0]
        : req.params.sampleId;

      if (!sampleId) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Sample ID parameter is required.',
        });
        return;
      }

      const result = await FindingService.getSampleFindings(sampleId, {
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
          error: statusCode === 403 ? 'Forbidden' : statusCode === 404 ? 'Not Found' : 'Validation Error',
          message: error.message,
        });
        return;
      }

      console.error('[FINDING_CONTROLLER] Error fetching sample findings:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve sample findings.',
      });
    }
  }

  /**
   * GET /api/findings/:findingId
   * Retrieves a single finding by ID.
   */
  static async getFindingById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
        return;
      }

      const findingId = Array.isArray(req.params.findingId)
        ? req.params.findingId[0]
        : req.params.findingId;

      const finding = await ComplianceFinding.findById(findingId);
      if (!finding) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Finding not found: ${findingId}`,
        });
        return;
      }

      const inspection = await Inspection.findById(finding.inspectionId);
      if (req.user.role === UserRole.INSPECTOR && inspection) {
        const userBadge = req.user.inspectorId;
        const userMongoId = req.user.id;
        const isOwner =
          inspection.inspectorId === userBadge || inspection.inspectorId === userMongoId;

        if (!isOwner) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Access denied: You cannot view findings for another inspector\'s case.',
          });
          return;
        }
      }

      res.status(200).json({
        success: true,
        data: finding,
      });
    } catch (error: any) {
      console.error('[FINDING_CONTROLLER] Error fetching finding:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve finding details.',
      });
    }
  }

  /**
   * POST /api/findings/:findingId/verify
   * Submits inspector verification for a finding.
   * Restricted to field inspectors owning the inspection case.
   */
  static async verifyFinding(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
        return;
      }

      const findingId = Array.isArray(req.params.findingId)
        ? req.params.findingId[0]
        : req.params.findingId;

      const { decision, verifiedValue, notes } = req.body;
      if (!decision) {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Verification decision is required.',
        });
        return;
      }

      const result = await FindingService.verifyFinding(
        findingId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        },
        { decision, verifiedValue, notes }
      );

      res.status(200).json({
        success: true,
        message: 'Finding verified successfully.',
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

      console.error('[FINDING_CONTROLLER] Error verifying finding:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to verify finding.',
      });
    }
  }

  /**
   * POST /api/findings/:findingId/correct
   * Corrects the extracted declaration value while preserving original AI extraction.
   */
  static async correctFinding(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required.',
        });
        return;
      }

      const findingId = Array.isArray(req.params.findingId)
        ? req.params.findingId[0]
        : req.params.findingId;

      const { correctedValue, notes } = req.body;
      if (!correctedValue || typeof correctedValue !== 'string' || correctedValue.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Corrected value is required.',
        });
        return;
      }

      const finding = await FindingService.correctFinding(
        findingId,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        },
        { correctedValue, notes }
      );

      res.status(200).json({
        success: true,
        message: 'Finding declaration value corrected successfully.',
        data: finding,
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

      console.error('[FINDING_CONTROLLER] Error correcting finding:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to correct finding.',
      });
    }
  }
}

