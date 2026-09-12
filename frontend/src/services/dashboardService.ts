import { getApiUrl, getAuthHeaders } from './apiConfig';

export interface InspectorDashboardData {
  officer: {
    name: string;
    badgeNumber: string;
    role: string;
  };
  summary: {
    totalInspections: number;
    inProgress: number;
    completed: number;
    archived: number;
    totalSamples: number;
  };
  recentInspections: Array<{
    id: string;
    inspectionNumber: string;
    commodity: string;
    brand?: string;
    packageContext: string;
    location: string;
    market?: string;
    samplesCount: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
    createdAt: string;
  }>;
  charts: {
    statusDistribution: Array<{ name: string; value: number; color: string }>;
    contextDistribution: Array<{ context: string; count: number }>;
  };
}

export interface ControllerDashboardData {
  officer: {
    name: string;
    role: string;
    roleTitle: string;
  };
  summary: {
    totalInspectors: number;
    totalInspections: number;
    inProgress: number;
    completed: number;
    archived: number;
    totalSamples: number;
    totalRules: number;
  };
  inspectorActivity: Array<{
    id: string;
    name: string;
    username: string;
    badgeNumber: string;
    totalInspections: number;
    inProgress: number;
    completed: number;
    status: string;
  }>;
  recentInspections: Array<{
    id: string;
    inspectionNumber: string;
    inspectorName: string;
    inspectorBadge: string;
    commodity: string;
    brand?: string;
    packageContext: string;
    location: string;
    market?: string;
    samplesCount: number;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
    createdAt: string;
  }>;
  charts: {
    statusDistribution: Array<{ name: string; value: number; color: string }>;
    contextDistribution: Array<{ context: string; count: number }>;
    inspectorWorkload: Array<{ name: string; badge: string; inspections: number }>;
  };
}

interface CacheRecord<T> {
  data: T;
  timestamp: number;
}

const dashboardClientCache = new Map<string, CacheRecord<any>>();
const DASHBOARD_CACHE_TTL = 30 * 1000; // 30 seconds

export function clearDashboardClientCache(): void {
  dashboardClientCache.clear();
}

/**
 * Fetch Inspector Dashboard metrics from backend API.
 * Uses HTTP-only session cookie (credentials: 'include').
 */
export async function fetchInspectorDashboard(forceRefresh: boolean = false): Promise<InspectorDashboardData> {
  const cacheKey = 'inspector:dashboard';
  if (!forceRefresh) {
    const cached = dashboardClientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL) {
      return cached.data;
    }
  }

  const response = await fetch(getApiUrl('/api/dashboard/inspector'), {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access denied: Inspector role required.');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to load inspector dashboard data.');
  }

  const json = await response.json();
  dashboardClientCache.set(cacheKey, { data: json.data, timestamp: Date.now() });
  return json.data;
}

/**
 * Fetch Assistant Controller supervisory dashboard metrics from backend API.
 * Uses HTTP-only session cookie (credentials: 'include').
 */
export async function fetchControllerDashboard(forceRefresh: boolean = false): Promise<ControllerDashboardData> {
  const cacheKey = 'controller:dashboard';
  if (!forceRefresh) {
    const cached = dashboardClientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < DASHBOARD_CACHE_TTL) {
      return cached.data;
    }
  }

  const response = await fetch(getApiUrl('/api/dashboard/controller'), {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication expired. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Access denied: Supervisory authorization required.');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to load supervisory dashboard data.');
  }

  const json = await response.json();
  dashboardClientCache.set(cacheKey, { data: json.data, timestamp: Date.now() });
  return json.data;
}


