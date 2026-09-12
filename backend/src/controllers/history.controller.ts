import { Request, Response } from 'express';
import { HistoryService } from '../services/history.service';
import { AuditService } from '../services/audit.service';

export class HistoryController {
  /**
   * GET /api/history/inspections
   * Lists historical inspections with dynamic filtering, pagination, and KPI telemetry.
   */
  static async listHistoricalInspections(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to access inspection history.',
        });
        return;
      }

      const { search, status, packageContext, dateFrom, dateTo, page, limit } = req.query;

      const result = await HistoryService.listHistoricalInspections(req.user, {
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? status : undefined,
        packageContext: typeof packageContext === 'string' ? packageContext : undefined,
        dateFrom: typeof dateFrom === 'string' ? dateFrom : undefined,
        dateTo: typeof dateTo === 'string' ? dateTo : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result.inspections,
        pagination: result.pagination,
        summaryKpis: result.summaryKpis,
      });
    } catch (error: any) {
      console.error('HistoryController.listHistoricalInspections Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred while fetching inspection history.',
      });
    }
  }

  /**
   * GET /api/history/inspections/:id
   * Retrieves full historical audit record for an inspection.
   * Strictly read-only: does not trigger AI or mutate rule engine evaluations.
   */
  static async getHistoricalInspectionDetail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to access inspection historical details.',
        });
        return;
      }

      const id = String(req.params.id);
      const { inspectionData, forbidden } = await HistoryService.getHistoricalInspectionDetail(
        id,
        req.user
      );

      if (forbidden) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access Denied: You are not authorized to view this historical inspection record.',
        });
        return;
      }

      if (!inspectionData) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Inspection record '${id}' was not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: inspectionData,
      });
    } catch (error: any) {
      console.error('HistoryController.getHistoricalInspectionDetail Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred while fetching historical inspection detail.',
      });
    }
  }

  /**
   * GET /api/history/inspections/:id/audit-trail
   * Retrieves the append-only chronological audit trail for a specific inspection.
   */
  static async getInspectionAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to view audit trail.',
        });
        return;
      }

      const id = String(req.params.id);
      const { entityType, eventType, source } = req.query;

      const { auditTrail, forbidden } = await HistoryService.getInspectionAuditTrail(
        id,
        req.user,
        {
          entityType: typeof entityType === 'string' ? entityType : undefined,
          eventType: typeof eventType === 'string' ? eventType : undefined,
          source: typeof source === 'string' ? source : undefined,
        }
      );

      if (forbidden) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access Denied: You cannot view audit trails for this inspection.',
        });
        return;
      }

      if (!auditTrail) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Inspection '${id}' was not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: auditTrail,
      });
    } catch (error: any) {
      console.error('HistoryController.getInspectionAuditTrail Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred while retrieving audit trail.',
      });
    }
  }

  /**
   * GET /api/history/entities/:entityId/audit-trail
   * Retrieves the audit trail for a specific entity (sample, finding, etc.).
   */
  static async getEntityAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to view entity audit trail.',
        });
        return;
      }

      const entityId = String(req.params.entityId);
      const events = await AuditService.getEntityAuditTrail(entityId);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error: any) {
      console.error('HistoryController.getEntityAuditTrail Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred while retrieving entity audit trail.',
      });
    }
  }
}
