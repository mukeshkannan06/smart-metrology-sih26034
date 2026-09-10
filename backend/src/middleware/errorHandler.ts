import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const errorHandler = (
  err: Error | (Error & { status?: number; type?: string }),
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Express body-parser malformed JSON syntax error
  if ('type' in err && err.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Malformed JSON payload in request body',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle Express body-parser payload too large error (413)
  if (('type' in err && err.type === 'entity.too.large') || ('status' in err && err.status === 413)) {
    res.status(413).json({
      success: false,
      error: 'Payload Too Large',
      message: 'The uploaded image payload exceeds the allowed upload limit of 15 MB.',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Handle explicit status or default to 500 Internal Server Error
  const statusCode = ('status' in err && typeof err.status === 'number') ? err.status : 500;
  const isDev = config.isDevelopment;

  if (isDev) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  } else {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}: ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: isDev ? err.message : 'An unexpected server error occurred',
    timestamp: new Date().toISOString(),
    ...(isDev && { stack: err.stack }),
  });
};

