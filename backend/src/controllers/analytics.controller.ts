import { Request, Response } from 'express';
import { AnalyticsService, AnalyticsFilterParams } from '../services/analytics.service';
import { PackageContext, InspectionStatus, UserRole } from '../models';

const VALID_CONTEXTS = new Set(Object.values(PackageContext));
const VALID_STATUSES = new Set(Object.values(InspectionStatus));

export class AnalyticsController {
  private static parseFilters(req: Request): AnalyticsFilterParams {
    const {
      timeRange,
      startDate,
      endDate,
      inspectorId,
      packageContext,
      status,
      commodity,
      location,
    } = req.query;

    const filters: AnalyticsFilterParams = {};

    if (timeRange && typeof timeRange === 'string') {
      filters.timeRange = timeRange as any;
    }

    if (startDate && typeof startDate === 'string') {
      filters.startDate = startDate;
    }

    if (endDate && typeof endDate === 'string') {
      filters.endDate = endDate;
    }

    if (inspectorId && typeof inspectorId === 'string') {
      filters.inspectorId = inspectorId;
    }

    if (packageContext && typeof packageContext === 'string' && packageContext !== 'ALL') {
      if (VALID_CONTEXTS.has(packageContext as PackageContext)) {
        filters.packageContext = packageContext as PackageContext;
      }
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      if (VALID_STATUSES.has(status as InspectionStatus)) {
        filters.status = status as InspectionStatus;
      }
    }

    if (commodity && typeof commodity === 'string') {
      filters.commodity = commodity.trim();
    }

    if (location && typeof location === 'string') {
      filters.location = location.trim();
    }

    return filters;
  }

  /**
   * GET /api/analytics/overview
   */
  public static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ASSISTANT_CONTROLLER) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Supervisory analytics requires Assistant Controller of Legal Metrology credentials.',
        });
        return;
      }

      const filters = AnalyticsController.parseFilters(req);
      const data = await AnalyticsService.getOverviewAnalytics(filters, req.user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      console.error('[ANALYTICS_CONTROLLER] getOverview error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to aggregate supervisory overview analytics.',
      });
    }
  }

  /**
   * GET /api/analytics/inspectors
   */
  public static async getInspectors(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ASSISTANT_CONTROLLER) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Supervisory analytics requires Assistant Controller of Legal Metrology credentials.',
        });
        return;
      }

      const filters = AnalyticsController.parseFilters(req);
      const data = await AnalyticsService.getInspectorsAnalytics(filters, req.user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      console.error('[ANALYTICS_CONTROLLER] getInspectors error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to aggregate field inspector analytics.',
      });
    }
  }

  /**
   * GET /api/analytics/violations
   */
  public static async getViolations(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ASSISTANT_CONTROLLER) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Supervisory analytics requires Assistant Controller of Legal Metrology credentials.',
        });
        return;
      }

      const filters = AnalyticsController.parseFilters(req);
      const data = await AnalyticsService.getViolationsAnalytics(filters, req.user);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      console.error('[ANALYTICS_CONTROLLER] getViolations error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to aggregate supervisory violations.',
      });
    }
  }

  /**
   * GET /api/analytics/inspections
   */
  public static async getInspections(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ASSISTANT_CONTROLLER) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Supervisory analytics requires Assistant Controller of Legal Metrology credentials.',
        });
        return;
      }

      const filters = AnalyticsController.parseFilters(req);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined;
      const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';

      const data = await AnalyticsService.getMonitoredInspections(
        { ...filters, page, limit, search, sortBy, sortDir },
        req.user
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err: any) {
      console.error('[ANALYTICS_CONTROLLER] getInspections error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to retrieve monitored inspections.',
      });
    }
  }
}
