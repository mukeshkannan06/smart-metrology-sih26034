import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import apiRouter from './routes';
import { requestLogger } from './middleware/requestLogger';
import { notFoundHandler } from './middleware/notFoundHandler';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): Express => {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS Configuration
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 3. Request Logging
  app.use(requestLogger);

  // 4. Body and Cookie Parsers (Support high-resolution packaging image uploads up to 25MB)
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));
  app.use(cookieParser());

  // 5. Root Ping & Service Status
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      service: 'Smart Metrology Backend API (Legal Metrology)',
      status: 'OPERATIONAL',
      message: 'Backend server is running healthy. Access the web user application at http://localhost:5173',
      endpoints: {
        health: '/api/health',
        inspections: '/api/inspections',
        findings: '/api/findings',
      },
      timestamp: new Date().toISOString(),
    });
  });

  // 6. API Routes (/api/...)
  app.use('/api', apiRouter);

  // 6. 404 Route Not Found Handler
  app.use(notFoundHandler);

  // 7. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export default createApp;
