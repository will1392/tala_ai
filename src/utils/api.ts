/**
 * Utility helpers for building backend API URLs consistently across the app.
 * This ensures that requests work both in local development (where we rely on
 * Vite's `/api` proxy) and in production where the backend might live on a
 * different domain provided via `VITE_API_URL`.
 */

const getEnvApiUrl = () => (import.meta.env.VITE_API_URL || '').trim();

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
 */
export const getApiBaseUrl = () => {
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
 */
export const buildApiUrl = (path: string = '') => {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  if (!path) {
    return base || '/api';
  }

  const normalizedPath = path.replace(/^\/+/, '');
  return `${base}/${normalizedPath}`;
};

export default buildApiUrl;
