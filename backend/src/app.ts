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

  // 4. Body and Cookie Parsers
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 5. API Routes (/api/...)
  app.use('/api', apiRouter);

  // 6. 404 Route Not Found Handler
  app.use(notFoundHandler);

  // 7. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export default createApp;
