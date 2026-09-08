import { Request, Response } from 'express';
import { config } from '../config';
import { getDatabaseHealth } from '../config/database';

export class HealthController {
  /**
   * GET /api/health
   * Returns system health, uptime, memory, and database status
   */
  public static getHealth(_req: Request, res: Response): void {
    const uptimeSeconds = process.uptime();
    const memory = process.memoryUsage();
    const dbHealth = getDatabaseHealth();

    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = Math.floor(uptimeSeconds % 60);
    const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;

    res.status(200).json({
      success: true,
      status: 'ok',
      service: 'smart-metrology-backend',
      phase: 4,
      tagline: 'Scan. Verify. Comply.',
      environment: config.env,
      database: dbHealth,
      uptime: uptimeSeconds,
      uptimeFormatted,
      memory: {
        rssMb: +(memory.rss / (1024 * 1024)).toFixed(2),
        heapTotalMb: +(memory.heapTotal / (1024 * 1024)).toFixed(2),
        heapUsedMb: +(memory.heapUsed / (1024 * 1024)).toFixed(2),
      },
      timestamp: new Date().toISOString(),
    });
  }
}

