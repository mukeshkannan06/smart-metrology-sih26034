import { Request, Response } from 'express';
import { PackageContext, UserRole } from '../models';
import { InspectionService } from '../services/inspection.service';

export class InspectionController {
  /**
   * POST /api/inspections
   * Creates a new inspection record initiated by an authenticated inspector.
   */
  static async createInspection(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to initiate an inspection.',
        });
        return;
      }

      if (req.user.role !== UserRole.INSPECTOR) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only Inspectors can initiate new inspections.',
        });
        return;
      }

      const { commodity, brand, packageContext, location, market, samplesCount, remarks } = req.body;

      // Explicit statutory rejection for removed context (Task A compliance)
      if (packageContext === 'SINGLE_PIECE_RETAIL_PACKAGE') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message:
            "Invalid package context. 'SINGLE_PIECE_RETAIL_PACKAGE' has been removed and is not permitted. Allowed contexts: RETAIL_PACKAGE, WHOLESALE_PACKAGE, INDUSTRIAL_INSTITUTIONAL_PACKAGE, IMPORTED_PACKAGE, EXPORT_PACKAGE.",
        });
        return;
      }

      // Validate required fields
      if (!commodity || typeof commodity !== 'string' || commodity.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Commodity name is required.',
        });
        return;
      }

      if (!location || typeof location !== 'string' || location.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Inspection location is required.',
        });
        return;
      }

      if (!packageContext || !Object.values(PackageContext).includes(packageContext)) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `Package context must be one of: ${Object.values(PackageContext).join(', ')}.`,
        });
        return;
      }

      const parsedSamples = Number(samplesCount);
      if (isNaN(parsedSamples) || parsedSamples < 1 || !Number.isInteger(parsedSamples)) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Sample count must be a positive integer greater than or equal to 1.',
        });
        return;
      }

      const inspection = await InspectionService.createInspection(
        {
          commodity,
          brand,
          packageContext,
          location,
          market,
          samplesCount: parsedSamples,
          remarks,
        },
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Inspection created successfully',
        data: inspection,
      });
    } catch (error) {
      console.error('[INSPECTION_CONTROLLER] Error creating inspection:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create inspection. Please try again.',
      });
    }
  }

  /**
   * GET /api/inspections
   * Lists inspections scoped by officer role with search filtering.
   */
  static async listInspections(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to list inspections.',
        });
        return;
      }

      const { search, status, packageContext } = req.query;

      const inspections = await InspectionService.listInspections(
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        },
        {
          search: typeof search === 'string' ? search : undefined,
          status: typeof status === 'string' ? status : undefined,
          packageContext: typeof packageContext === 'string' ? packageContext : undefined,
        }
      );

      res.status(200).json({
        success: true,
        count: inspections.length,
        data: inspections,
      });
    } catch (error) {
      console.error('[INSPECTION_CONTROLLER] Error listing inspections:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve inspections. Please try again.',
      });
    }
  }

  /**
   * GET /api/inspections/:id
   * Retrieves an inspection by ID or inspectionNumber, enforcing data isolation.
   */
  static async getInspectionById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to view inspection details.',
        });
        return;
      }

      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Inspection ID is required.',
        });
        return;
      }

      const { inspection, forbidden } = await InspectionService.getInspectionById(
        id,
        {
          id: req.user.id,
          inspectorId: req.user.inspectorId,
          role: req.user.role,
          name: req.user.name,
        }
      );

      if (forbidden) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access Denied: You do not have permission to view this inspection.',
        });
        return;
      }

      if (!inspection) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Inspection '${id}' was not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: inspection,
      });
    } catch (error) {
      console.error('[INSPECTION_CONTROLLER] Error getting inspection:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve inspection details.',
      });
    }
  }
}
