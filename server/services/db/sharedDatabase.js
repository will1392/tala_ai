/**
 * Shared Database Instance
 * 
 * This module ensures that all parts of the application use the same
 * DatabaseService instance, now using real PostgreSQL via Supabase.
 */

import { SupabaseDatabaseService } from './SupabaseDatabaseService.js';

// Create a single shared instance
const sharedDb = new SupabaseDatabaseService();
let initialized = false;

// Initialize the database
export const initializeSharedDb = async () => {
  if (!initialized) {
    await sharedDb.initialize();
    initialized = true;
    console.log('✅ Shared database initialized');
  }
  return sharedDb;
};

// Get the shared database instance
export const getSharedDb = () => {
  if (!initialized) {
    console.warn('⚠️ Shared database accessed before initialization');
  }
  return sharedDb;
};

// Export the instance directly for convenience
export default sharedDb;