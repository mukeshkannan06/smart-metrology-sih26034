import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';

const apiRouter = Router();

// Mount Health Check endpoint (/api/health)
apiRouter.use('/', healthRoutes);

// Mount Authentication endpoints (/api/auth/...)
apiRouter.use('/auth', authRoutes);

// Mount Dashboard endpoints (/api/dashboard/...)
apiRouter.use('/dashboard', dashboardRoutes);

export default apiRouter;

