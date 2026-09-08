import { Request, Response } from 'express';
import {
  getInspectorDashboardData,
  getControllerDashboardData,
} from '../services/dashboard.service';

export class DashboardController {
  /**
   * GET /api/dashboard/inspector
   * Returns dashboard metrics strictly scoped to the authenticated inspector.
   */
  static async getInspectorDashboard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to access inspector dashboard.',
        });
        return;
      }

      const inspectorId = req.user.inspectorId || req.user.id;
      const dashboardData = await getInspectorDashboardData(inspectorId, req.user.id);

      res.status(200).json({
        success: true,
        data: {
          officer: {
            name: req.user.name,
            badgeNumber: req.user.inspectorId || 'INS-PENDING',
            role: req.user.role,
          },
          ...dashboardData,
        },
      });
    } catch (error) {
      console.error('[DASHBOARD_CONTROLLER] Error loading inspector dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Unable to load inspector dashboard data. Please try again later.',
      });
    }
  }

  /**
   * GET /api/dashboard/controller
   * Returns supervisory dashboard metrics across all field officers and jurisdictions.
   */
  static async getControllerDashboard(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required to access supervisory dashboard.',
        });
        return;
      }

      const dashboardData = await getControllerDashboardData();

      res.status(200).json({
        success: true,
        data: {
          officer: {
            name: req.user.name,
            role: req.user.role,
            roleTitle: 'Assistant Controller of Legal Metrology',
          },
          ...dashboardData,
        },
      });
    } catch (error) {
      console.error('[DASHBOARD_CONTROLLER] Error loading controller dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: 'Unable to load supervisory dashboard data. Please try again later.',
      });
    }
  }
}

