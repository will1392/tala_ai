/**
 * Shared Task Manager Instance
 * 
 * This ensures all parts of the application use the same TaskManager instance
 * to maintain consistency in task operations.
 */

import { TaskManager } from './TaskManager.js';
import { getSharedDb } from '../db/sharedDatabase.js';

// Create a single shared instance using the default test user
const sharedTaskManager = new TaskManager({ 
  userId: 'test_user_123', // Default user for shared operations
  db: getSharedDb() 
});

// Initialize flag
let initialized = false;

export async function getSharedTaskManager() {
  if (!initialized) {
    await sharedTaskManager.initialize();
    initialized = true;
  }
  return sharedTaskManager;
}

// Export for backward compatibility
export default sharedTaskManager;