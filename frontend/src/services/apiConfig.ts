/**
 * Centralized API configuration and authentication header management.
 * Supports seamless transitions between local development (Vite proxy / relative paths)
 * and production deployment (configurable Render backend URL).
 */

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

const TOKEN_STORAGE_KEY = 'smart_metrology_auth_token';

/**
 * Resolves full API endpoint URL.
 * In development without VITE_API_BASE_URL, returns clean relative path '/api/...'.
 * In production with VITE_API_BASE_URL, prepends backend host URL.
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!API_BASE_URL) {
    return cleanEndpoint;
  }
  return `${API_BASE_URL}${cleanEndpoint}`;
}

/**
 * Saves authenticated JWT session token for cross-origin header resilience.
 */
export function saveAuthToken(token: string): void {
  if (typeof window !== 'undefined' && token) {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } catch {
      // Ignore storage restrictions if running in restricted sandboxes
    }
  }
}

/**
 * Clears authenticated JWT session token on logout.
 */
export function clearAuthToken(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore storage restrictions
    }
  }
}

/**
 * Retrieves stored JWT token if available.
 */
export function getStoredAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Generates standardized HTTP headers with Authorization Bearer token where available.
 */
export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const token = getStoredAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

