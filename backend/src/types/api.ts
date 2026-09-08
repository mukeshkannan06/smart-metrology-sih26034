export interface ApiResponse<T = unknown> {
  success: boolean;
  status?: string;
  data?: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
  details?: unknown;
}

export interface HealthData {
  service: string;
  status: string;
  phase: number;
  tagline: string;
  environment: string;
  uptime: number;
  uptimeFormatted: string;
  memoryUsage: {
    rssMb: number;
    heapTotalMb: number;
    heapUsedMb: number;
  };
}

