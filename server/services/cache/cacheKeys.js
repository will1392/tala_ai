/**
 * Cache Key Generators for Tala AI
 * 
 * Provides standardized cache key generation with:
 * - Consistent naming conventions
 * - Hierarchical key structures
 * - Easy pattern matching for bulk operations
 * - Type safety and validation
 */

/**
 * Cache key prefixes for different data types
 */
export const CACHE_PREFIXES = {
  USER: 'user',
  ORGANIZATION: 'org',
  CONVERSATION: 'conv',
  MESSAGE: 'msg',
  DOCUMENT: 'doc',
  FOLDER: 'folder',
  TAG: 'tag',
  SEARCH: 'search',
  RATE_LIMIT: 'rate',
  SESSION: 'session',
  ANALYTICS: 'analytics'
};

/**
 * Cache key separators
 */
const SEPARATOR = ':';
const WILDCARD = '*';

/**
 * Validate UUID format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid UUID
 */
function isValidUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Sanitize key component (remove special characters)
 * @param {string} component - Key component to sanitize
 * @returns {string} Sanitized component
 */
function sanitize(component) {
  if (typeof component !== 'string') {
    component = String(component);
  }
  return component.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Build cache key from components
 * @param {...string} components - Key components
 * @returns {string} Cache key
 */
function buildKey(...components) {
  return components
    .filter(component => component !== null && component !== undefined)
    .map(component => sanitize(component))
    .join(SEPARATOR);
}

/**
 * User-related cache keys
 */
export const userKeys = {
  /**
   * Individual user data
   * @param {string} userId - User UUID
   * @returns {string} Cache key
   */
  user(userId) {
    if (!isValidUUID(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    return buildKey(CACHE_PREFIXES.USER, userId);
  },

  /**
   * User profile data
   * @param {string} userId - User UUID
   * @returns {string} Cache key
   */
  profile(userId) {
    if (!isValidUUID(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    return buildKey(CACHE_PREFIXES.USER, userId, 'profile');
  },

  /**
   * User preferences
   * @param {string} userId - User UUID
   * @returns {string} Cache key
   */
  preferences(userId) {
    if (!isValidUUID(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    return buildKey(CACHE_PREFIXES.USER, userId, 'preferences');
  },

  /**
   * User session data
   * @param {string} userId - User UUID
   * @returns {string} Cache key
   */
  session(userId) {
    if (!isValidUUID(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    return buildKey(CACHE_PREFIXES.SESSION, userId);
  },

  /**
   * All user-related keys pattern
   * @param {string} [userId] - Optional specific user ID
   * @returns {string} Pattern for matching user keys
   */
  pattern(userId = null) {
    if (userId) {
      if (!isValidUUID(userId)) {
        throw new Error(`Invalid user ID: ${userId}`);
      }
      return buildKey(CACHE_PREFIXES.USER, userId, WILDCARD);
    }
    return buildKey(CACHE_PREFIXES.USER, WILDCARD);
  }
};

/**
 * Organization-related cache keys
 */
export const organizationKeys = {
  /**
   * Organization data
   * @param {string} orgId - Organization UUID
   * @returns {string} Cache key
   */
  organization(orgId) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    return buildKey(CACHE_PREFIXES.ORGANIZATION, orgId);
  },

  /**
   * Organization members list
   * @param {string} orgId - Organization UUID
   * @returns {string} Cache key
   */
  members(orgId) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    return buildKey(CACHE_PREFIXES.ORGANIZATION, orgId, 'members');
  },

  /**
   * Organization settings
   * @param {string} orgId - Organization UUID
   * @returns {string} Cache key
   */
  settings(orgId) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    return buildKey(CACHE_PREFIXES.ORGANIZATION, orgId, 'settings');
  },

  /**
   * All organization keys pattern
   * @param {string} [orgId] - Optional specific organization ID
   * @returns {string} Pattern for matching organization keys
   */
  pattern(orgId = null) {
    if (orgId) {
      if (!isValidUUID(orgId)) {
        throw new Error(`Invalid organization ID: ${orgId}`);
      }
      return buildKey(CACHE_PREFIXES.ORGANIZATION, orgId, WILDCARD);
    }
    return buildKey(CACHE_PREFIXES.ORGANIZATION, WILDCARD);
  }
};

/**
 * Conversation-related cache keys
 */
export const conversationKeys = {
  /**
   * Individual conversation data
   * @param {string} conversationId - Conversation UUID
   * @returns {string} Cache key
   */
  conversation(conversationId) {
    if (!isValidUUID(conversationId)) {
      throw new Error(`Invalid conversation ID: ${conversationId}`);
    }
    return buildKey(CACHE_PREFIXES.CONVERSATION, conversationId);
  },

  /**
   * Conversation messages
   * @param {string} conversationId - Conversation UUID
   * @returns {string} Cache key
   */
  messages(conversationId) {
    if (!isValidUUID(conversationId)) {
      throw new Error(`Invalid conversation ID: ${conversationId}`);
    }
    return buildKey(CACHE_PREFIXES.CONVERSATION, conversationId, 'messages');
  },

  /**
   * Conversation list for user
   * @param {string} userId - User UUID
   * @returns {string} Cache key
   */
  listByUser(userId) {
    if (!isValidUUID(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    return buildKey(CACHE_PREFIXES.CONVERSATION, 'list', 'user', userId);
  },

  /**
   * Conversation list for organization
   * @param {string} orgId - Organization UUID
   * @returns {string} Cache key
   */
  listByOrg(orgId) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    return buildKey(CACHE_PREFIXES.CONVERSATION, 'list', 'org', orgId);
  },

  /**
   * Conversation summary
   * @param {string} conversationId - Conversation UUID
   * @returns {string} Cache key
   */
  summary(conversationId) {
    if (!isValidUUID(conversationId)) {
      throw new Error(`Invalid conversation ID: ${conversationId}`);
    }
    return buildKey(CACHE_PREFIXES.CONVERSATION, conversationId, 'summary');
  },

  /**
   * All conversation keys pattern
   * @param {string} [conversationId] - Optional specific conversation ID
   * @returns {string} Pattern for matching conversation keys
   */
  pattern(conversationId = null) {
    if (conversationId) {
      if (!isValidUUID(conversationId)) {
        throw new Error(`Invalid conversation ID: ${conversationId}`);
      }
      return buildKey(CACHE_PREFIXES.CONVERSATION, conversationId, WILDCARD);
    }
    return buildKey(CACHE_PREFIXES.CONVERSATION, WILDCARD);
  }
};

/**
 * Document-related cache keys
 */
export const documentKeys = {
  /**
   * Individual document data
   * @param {string} documentId - Document UUID
   * @returns {string} Cache key
   */
  document(documentId) {
    if (!isValidUUID(documentId)) {
      throw new Error(`Invalid document ID: ${documentId}`);
    }
    return buildKey(CACHE_PREFIXES.DOCUMENT, documentId);
  },

  /**
   * Document content/text
   * @param {string} documentId - Document UUID
   * @returns {string} Cache key
   */
  content(documentId) {
    if (!isValidUUID(documentId)) {
      throw new Error(`Invalid document ID: ${documentId}`);
    }
    return buildKey(CACHE_PREFIXES.DOCUMENT, documentId, 'content');
  },

  /**
   * Document metadata
   * @param {string} documentId - Document UUID
   * @returns {string} Cache key
   */
  metadata(documentId) {
    if (!isValidUUID(documentId)) {
      throw new Error(`Invalid document ID: ${documentId}`);
    }
    return buildKey(CACHE_PREFIXES.DOCUMENT, documentId, 'metadata');
  },

  /**
   * Documents in folder
   * @param {string} folderId - Folder UUID
   * @returns {string} Cache key
   */
  listByFolder(folderId) {
    if (!isValidUUID(folderId)) {
      throw new Error(`Invalid folder ID: ${folderId}`);
    }
    return buildKey(CACHE_PREFIXES.DOCUMENT, 'list', 'folder', folderId);
  },

  /**
   * Documents by organization
   * @param {string} orgId - Organization UUID
   * @returns {string} Cache key
   */
  listByOrg(orgId) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    return buildKey(CACHE_PREFIXES.DOCUMENT, 'list', 'org', orgId);
  },

  /**
   * All document keys pattern
   * @param {string} [documentId] - Optional specific document ID
   * @returns {string} Pattern for matching document keys
   */
  pattern(documentId = null) {
    if (documentId) {
      if (!isValidUUID(documentId)) {
        throw new Error(`Invalid document ID: ${documentId}`);
      }
      return buildKey(CACHE_PREFIXES.DOCUMENT, documentId, WILDCARD);
    }
    return buildKey(CACHE_PREFIXES.DOCUMENT, WILDCARD);
  }
};

/**
 * Folder-related cache keys
 */
export const folderKeys = {
  /**
   * Individual folder data
   * @param {string} folderId - Folder UUID
   * @returns {string} Cache key
   */
  folder(folderId) {
    if (!isValidUUID(folderId)) {
      throw new Error(`Invalid folder ID: ${folderId}`);
    }
    return buildKey(CACHE_PREFIXES.FOLDER, folderId);
  },

  /**
   * Folder tree structure for organization
   * @param {string} orgId - Organization UUID
   * @returns {string} Cache key
   */
  tree(orgId) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    return buildKey(CACHE_PREFIXES.FOLDER, 'tree', orgId);
  },

  /**
   * Folder hierarchy for user
   * @param {string} userId - User UUID
   * @returns {string} Cache key
   */
  userTree(userId) {
    if (!isValidUUID(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    return buildKey(CACHE_PREFIXES.FOLDER, 'user_tree', userId);
  },

  /**
   * Folder children
   * @param {string} folderId - Parent folder UUID
   * @returns {string} Cache key
   */
  children(folderId) {
    if (!isValidUUID(folderId)) {
      throw new Error(`Invalid folder ID: ${folderId}`);
    }
    return buildKey(CACHE_PREFIXES.FOLDER, folderId, 'children');
  },

  /**
   * All folder keys pattern
   * @param {string} [folderId] - Optional specific folder ID
   * @returns {string} Pattern for matching folder keys
   */
  pattern(folderId = null) {
    if (folderId) {
      if (!isValidUUID(folderId)) {
        throw new Error(`Invalid folder ID: ${folderId}`);
      }
      return buildKey(CACHE_PREFIXES.FOLDER, folderId, WILDCARD);
    }
    return buildKey(CACHE_PREFIXES.FOLDER, WILDCARD);
  }
};

/**
 * Search-related cache keys
 */
export const searchKeys = {
  /**
   * Search results for organization and query
   * @param {string} orgId - Organization UUID
   * @param {string} query - Search query (will be hashed for key)
   * @returns {string} Cache key
   */
  results(orgId, query) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    
    // Hash the query for consistent key generation
    const queryHash = Buffer.from(query).toString('base64').slice(0, 16);
    return buildKey(CACHE_PREFIXES.SEARCH, 'results', orgId, queryHash);
  },

  /**
   * Popular search terms for organization
   * @param {string} orgId - Organization UUID
   * @returns {string} Cache key
   */
  popularTerms(orgId) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    return buildKey(CACHE_PREFIXES.SEARCH, 'popular', orgId);
  },

  /**
   * Search suggestions for organization
   * @param {string} orgId - Organization UUID
   * @returns {string} Cache key
   */
  suggestions(orgId) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    return buildKey(CACHE_PREFIXES.SEARCH, 'suggestions', orgId);
  },

  /**
   * All search keys pattern
   * @param {string} [orgId] - Optional specific organization ID
   * @returns {string} Pattern for matching search keys
   */
  pattern(orgId = null) {
    if (orgId) {
      if (!isValidUUID(orgId)) {
        throw new Error(`Invalid organization ID: ${orgId}`);
      }
      return buildKey(CACHE_PREFIXES.SEARCH, WILDCARD, orgId, WILDCARD);
    }
    return buildKey(CACHE_PREFIXES.SEARCH, WILDCARD);
  }
};

/**
 * Rate limiting cache keys
 */
export const rateLimitKeys = {
  /**
   * Rate limit by IP address
   * @param {string} ipAddress - IP address
   * @param {string} [endpoint] - Optional endpoint identifier
   * @returns {string} Cache key
   */
  ip(ipAddress, endpoint = 'general') {
    return buildKey(CACHE_PREFIXES.RATE_LIMIT, 'ip', sanitize(ipAddress), endpoint);
  },

  /**
   * Rate limit by user ID
   * @param {string} userId - User UUID
   * @param {string} [endpoint] - Optional endpoint identifier
   * @returns {string} Cache key
   */
  user(userId, endpoint = 'general') {
    if (!isValidUUID(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    return buildKey(CACHE_PREFIXES.RATE_LIMIT, 'user', userId, endpoint);
  },

  /**
   * Rate limit by API key
   * @param {string} apiKey - API key (will be hashed)
   * @param {string} [endpoint] - Optional endpoint identifier
   * @returns {string} Cache key
   */
  apiKey(apiKey, endpoint = 'general') {
    const keyHash = Buffer.from(apiKey).toString('base64').slice(0, 16);
    return buildKey(CACHE_PREFIXES.RATE_LIMIT, 'api', keyHash, endpoint);
  },

  /**
   * All rate limit keys pattern
   * @returns {string} Pattern for matching rate limit keys
   */
  pattern() {
    return buildKey(CACHE_PREFIXES.RATE_LIMIT, WILDCARD);
  }
};

/**
 * Analytics cache keys
 */
export const analyticsKeys = {
  /**
   * Daily analytics for organization
   * @param {string} orgId - Organization UUID
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {string} Cache key
   */
  daily(orgId, date) {
    if (!isValidUUID(orgId)) {
      throw new Error(`Invalid organization ID: ${orgId}`);
    }
    return buildKey(CACHE_PREFIXES.ANALYTICS, 'daily', orgId, date);
  },

  /**
   * User activity summary
   * @param {string} userId - User UUID
   * @param {string} period - Period identifier (daily, weekly, monthly)
   * @returns {string} Cache key
   */
  userActivity(userId, period = 'daily') {
    if (!isValidUUID(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    return buildKey(CACHE_PREFIXES.ANALYTICS, 'activity', userId, period);
  },

  /**
   * All analytics keys pattern
   * @param {string} [orgId] - Optional specific organization ID
   * @returns {string} Pattern for matching analytics keys
   */
  pattern(orgId = null) {
    if (orgId) {
      if (!isValidUUID(orgId)) {
        throw new Error(`Invalid organization ID: ${orgId}`);
      }
      return buildKey(CACHE_PREFIXES.ANALYTICS, WILDCARD, orgId, WILDCARD);
    }
    return buildKey(CACHE_PREFIXES.ANALYTICS, WILDCARD);
  }
};

/**
 * Utility functions for working with cache keys
 */
export const cacheKeyUtils = {
  /**
   * Extract organization ID from a cache key
   * @param {string} key - Cache key
   * @returns {string|null} Organization ID if found
   */
  extractOrgId(key) {
    const parts = key.split(SEPARATOR);
    const orgIndex = parts.indexOf('org');
    
    if (orgIndex !== -1 && parts[orgIndex + 1]) {
      return parts[orgIndex + 1];
    }
    
    return null;
  },

  /**
   * Extract user ID from a cache key
   * @param {string} key - Cache key
   * @returns {string|null} User ID if found
   */
  extractUserId(key) {
    const parts = key.split(SEPARATOR);
    const userIndex = parts.indexOf('user');
    
    if (userIndex !== -1 && parts[userIndex + 1]) {
      return parts[userIndex + 1];
    }
    
    return null;
  },

  /**
   * Get the prefix from a cache key
   * @param {string} key - Cache key
   * @returns {string} Key prefix
   */
  getPrefix(key) {
    return key.split(SEPARATOR)[0];
  },

  /**
   * Check if key matches pattern
   * @param {string} key - Cache key
   * @param {string} pattern - Pattern with wildcards
   * @returns {boolean} True if key matches pattern
   */
  matchesPattern(key, pattern) {
    const keyParts = key.split(SEPARATOR);
    const patternParts = pattern.split(SEPARATOR);
    
    if (keyParts.length !== patternParts.length) {
      return false;
    }
    
    return patternParts.every((part, index) => {
      return part === WILDCARD || part === keyParts[index];
    });
  }
};

// Export all key generators as default
export default {
  user: userKeys,
  organization: organizationKeys,
  conversation: conversationKeys,
  document: documentKeys,
  folder: folderKeys,
  search: searchKeys,
  rateLimit: rateLimitKeys,
  analytics: analyticsKeys,
  utils: cacheKeyUtils,
  prefixes: CACHE_PREFIXES
};