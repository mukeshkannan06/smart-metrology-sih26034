import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';

export class ReportController {
  /**
   * GET /api/reports/inspections/:id
   * Retrieves authoritative, consolidated inspection report data for ONE complete inspection.
   * Gated by RBAC: Inspectors can only access their own cases; Assistant Controllers have
   * supervisory jurisdiction-wide access.
   */
  static async getInspectionReportData(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to access inspection report data.',
        });
        return;
      }

      const id = String(req.params.id);
      const { reportData, forbidden } = await ReportService.buildReportData(id, req.user);

      if (forbidden) {
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Access Denied: You are not authorized to access reports for this inspection case.',
        });
        return;
      }

      if (!reportData) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Inspection record '${id}' was not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: reportData,
      });
    } catch (error: any) {
      console.error('ReportController.getInspectionReportData Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'An unexpected error occurred while preparing the inspection report.',
      });
    }
  }
}

