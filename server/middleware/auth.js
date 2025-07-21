/**
 * Auth middleware exports
 */

import { authenticate } from './authentication.js';
import { requireTestAuth } from './testAuth.js';

// Export requireAuth that uses test auth in test mode
export const requireAuth = process.env.ALLOW_TEST_AUTH === 'true' 
  ? requireTestAuth 
  : authenticate;

export { authenticate } from './authentication.js';
export { requireTestAuth } from './testAuth.js';