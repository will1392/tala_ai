/**
 * Utility helpers for building backend API URLs consistently across the app.
 * This ensures that requests work both in local development (where we rely on
 * Vite's `/api` proxy) and in production where the backend might live on a
 * different domain provided via `VITE_API_URL`.
 */

const getEnvApiUrl = () => (import.meta.env.VITE_API_URL || '').trim();

/**
 * Check if we're in local development mode.
 * In development, we should use relative URLs to leverage Vite's proxy.
 */
const isLocalDevelopment = () => {
  const envUrl = getEnvApiUrl();
  // If VITE_API_URL points to localhost, we're in development
  return !envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
};

/**
 * Returns the base backend URL without any trailing slashes.
 */
export const getBackendBaseUrl = () => {
  const envUrl = getEnvApiUrl();
  if (!envUrl) {
    return '';
  }

  return envUrl.replace(/\/+$/, '');
};

/**
 * Returns the API base URL (always ending with `/api`).
 * In local development, returns relative path to use Vite proxy.
 * In production, returns the full URL from VITE_API_URL.
 */
export const getApiBaseUrl = () => {
  // In local development, always use relative URLs for Vite proxy
  if (isLocalDevelopment()) {
    return '/api';
  }

  // In production, use the configured API URL
  const backendBase = getBackendBaseUrl();
  if (!backendBase) {
    return '/api';
  }

  if (backendBase.toLowerCase().endsWith('/api')) {
    return backendBase;
  }

  return `${backendBase}/api`;
};

/**
 * Build a fully qualified API URL for the provided path. The path can be with
 * or without a leading slash.
 * 
 * In local development (localhost), this returns a relative URL (e.g., '/api/credits/balance')
 * to leverage Vite's proxy configuration, avoiding CORS issues.
 * 
 * In production, this returns an absolute URL using VITE_API_URL.
 */
export const buildApiUrl = (path: string = '') => {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  if (!path) {
    return base || '/api';
  }

  // Remove leading slashes from path
  let normalizedPath = path.replace(/^\/+/, '');
  
  // If the path already starts with 'api/', remove it to prevent double /api
  // This handles cases where someone might pass 'api/conversations' or '/api/conversations'
  if (normalizedPath.startsWith('api/')) {
    normalizedPath = normalizedPath.substring(4); // Remove 'api/'
  }
  
  // Remove any trailing slashes from the final path
  return `${base}/${normalizedPath}`.replace(/\/+$/, '');
};

export default buildApiUrl;
