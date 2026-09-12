import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import inspectionRoutes from './inspection.routes';
import ruleRoutes from './rule.routes';
import ruleEngineRoutes from './ruleEngine.routes';
import findingRoutes from './finding.routes';
import historyRoutes from './history.routes';
import reportRoutes from './report.routes';
import analyticsRoutes from './analytics.routes';

const apiRouter = Router();

// Mount Health Check endpoint (/api/health)
apiRouter.use('/', healthRoutes);

// Mount Authentication endpoints (/api/auth/...)
apiRouter.use('/auth', authRoutes);

// Mount Dashboard endpoints (/api/dashboard/...)
apiRouter.use('/dashboard', dashboardRoutes);

// Mount Inspection endpoints (/api/inspections/...)
apiRouter.use('/inspections', inspectionRoutes);

// Mount Rule Database endpoints (/api/rules/...)
apiRouter.use('/rules', ruleRoutes);

// Mount Rule Engine endpoints (/api/rule-engine/...)
apiRouter.use('/rule-engine', ruleEngineRoutes);

// Mount Compliance Findings endpoints (/api/findings/...)
apiRouter.use('/findings', findingRoutes);

// Mount Inspection History & Audit endpoints (/api/history/...)
apiRouter.use('/history', historyRoutes);

// Mount Consolidated Inspection Reports endpoints (/api/reports/...)
apiRouter.use('/reports', reportRoutes);

// Mount Supervisory Analytics endpoints (/api/analytics/...)
apiRouter.use('/analytics', analyticsRoutes);

export default apiRouter;



