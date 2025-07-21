/**
 * Auth utility functions
 * 
 * Helper functions for authentication
 */

/**
 * Get auth token from storage
 * @returns {string|null} Auth token
 */
export const getAuthToken = () => {
  // First check session storage, then local storage
  return sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
};

/**
 * Set auth token in storage
 * @param {string} token - Auth token
 * @param {boolean} remember - Store in localStorage if true
 */
export const setAuthToken = (token, remember = false) => {
  if (remember) {
    localStorage.setItem('authToken', token);
  } else {
    sessionStorage.setItem('authToken', token);
  }
};

/**
 * Remove auth token from storage
 */
export const removeAuthToken = () => {
  sessionStorage.removeItem('authToken');
  localStorage.removeItem('authToken');
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export const isAuthenticated = () => {
  return !!getAuthToken();
};