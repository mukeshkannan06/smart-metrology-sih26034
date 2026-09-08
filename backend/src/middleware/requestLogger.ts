import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (config.isDevelopment) {
      const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
      const resetColor = '\x1b[0m';
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${statusColor}${res.statusCode}${resetColor} - ${duration}ms`
      );
    }
  });

  next();
};

