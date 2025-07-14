/**
 * Role-Based Access Control (RBAC) - Permission Definitions
 * 
 * This file defines all granular permissions used in the Tala AI system.
 * Permissions follow a hierarchical naming convention: resource:action:scope
 * 
 * Permission Structure:
 * - resource: The entity being accessed (documents, conversations, etc.)
 * - action: The operation being performed (create, read, update, delete, etc.)
 * - scope: The access level (own, assigned, agency, all, system)
 * 
 * Examples:
 * - documents:read:own - Can read own documents
 * - documents:read:agency - Can read all documents in agency
 * - users:create:agent - Can create agent-level users
 */

/**
 * Permission scopes define the breadth of access
 */
export const PERMISSION_SCOPES = {
  OWN: 'own',           // User's own resources
  ASSIGNED: 'assigned', // Resources assigned to user
  SHARED: 'shared',     // Resources shared with user
  AGENCY: 'agency',     // All resources within user's agency
  ALL: 'all',          // All resources across agencies
  SYSTEM: 'system'      // System-wide resources
};

/**
 * Permission categories for organization
 */
export const PERMISSION_CATEGORIES = {
  DOCUMENTS: 'documents',
  CONVERSATIONS: 'conversations',
  ITINERARIES: 'itineraries',
  CLIENTS: 'clients',
  USERS: 'users',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  BILLING: 'billing',
  SECURITY: 'security'
};

/**
 * Complete permission definitions organized by category
 */
export const PERMISSIONS = {
  
  /**
   * DOCUMENT PERMISSIONS
   * Control access to documents, files, and knowledge base
   */
  DOCUMENTS: {
    // Basic CRUD operations
    'documents:create': {
      name: 'Create Documents',
      description: 'Create new documents and upload files',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:create:agency': {
      name: 'Create Agency Documents',
      description: 'Create documents on behalf of agency',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    
    // Read permissions with different scopes
    'documents:read:own': {
      name: 'Read Own Documents',
      description: 'View own documents and files',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:read:shared': {
      name: 'Read Shared Documents',
      description: 'View documents shared with user',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:read:assigned': {
      name: 'Read Assigned Documents',
      description: 'View documents assigned to user',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:read:agency': {
      name: 'Read Agency Documents',
      description: 'View all documents within agency',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:read:all': {
      name: 'Read All Documents',
      description: 'View all documents system-wide',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: true
    },
    
    // Update permissions
    'documents:update:own': {
      name: 'Update Own Documents',
      description: 'Edit own documents and metadata',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:update:assigned': {
      name: 'Update Assigned Documents',
      description: 'Edit documents assigned to user',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:update:agency': {
      name: 'Update Agency Documents',
      description: 'Edit any documents within agency',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    
    // Delete permissions
    'documents:delete:own': {
      name: 'Delete Own Documents',
      description: 'Delete own documents',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:delete:agency': {
      name: 'Delete Agency Documents',
      description: 'Delete any documents within agency',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: true
    },
    'documents:delete:any:agency': {
      name: 'Delete Any Agency Documents',
      description: 'Delete any documents within agency (owner level)',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: true
    },
    'documents:delete:any': {
      name: 'Delete Any Documents',
      description: 'Delete any documents system-wide',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: true
    },
    
    // Sharing and collaboration
    'documents:share:assigned': {
      name: 'Share Assigned Documents',
      description: 'Share documents assigned to user',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:share:agency': {
      name: 'Share Agency Documents',
      description: 'Share any documents within agency',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    
    // Advanced document operations
    'documents:upload': {
      name: 'Upload Documents',
      description: 'Upload new files and documents',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:manage:folders': {
      name: 'Manage Folders',
      description: 'Create and manage document folders',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: false
    },
    'documents:transfer:ownership': {
      name: 'Transfer Document Ownership',
      description: 'Transfer ownership of documents',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: true
    },
    'documents:backup:agency': {
      name: 'Backup Agency Documents',
      description: 'Create backups of agency documents',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: true
    },
    'documents:system:backup': {
      name: 'System Document Backup',
      description: 'Create system-wide document backups',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: true
    },
    'documents:system:restore': {
      name: 'System Document Restore',
      description: 'Restore documents from system backups',
      category: PERMISSION_CATEGORIES.DOCUMENTS,
      critical: true
    }
  },

  /**
   * CONVERSATION PERMISSIONS
   * Control access to chat conversations and messages
   */
  CONVERSATIONS: {
    // Basic conversation operations
    'conversations:create': {
      name: 'Create Conversations',
      description: 'Start new conversations',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    'conversations:create:own': {
      name: 'Create Own Conversations',
      description: 'Start conversations for self',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    
    // Read permissions
    'conversations:read:own': {
      name: 'Read Own Conversations',
      description: 'View own conversation history',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    'conversations:read:assigned': {
      name: 'Read Assigned Conversations',
      description: 'View conversations assigned to user',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    'conversations:read:agency': {
      name: 'Read Agency Conversations',
      description: 'View all conversations within agency',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    'conversations:read:all': {
      name: 'Read All Conversations',
      description: 'View all conversations system-wide',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: true
    },
    
    // Update permissions
    'conversations:update:own': {
      name: 'Update Own Conversations',
      description: 'Edit own conversation metadata',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    'conversations:update:assigned': {
      name: 'Update Assigned Conversations',
      description: 'Edit conversations assigned to user',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    
    // Delete permissions
    'conversations:delete:own': {
      name: 'Delete Own Conversations',
      description: 'Delete own conversations',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    'conversations:delete:agency': {
      name: 'Delete Agency Conversations',
      description: 'Delete conversations within agency',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: true
    },
    'conversations:delete:any:agency': {
      name: 'Delete Any Agency Conversations',
      description: 'Delete any conversations within agency',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: true
    },
    'conversations:delete:any': {
      name: 'Delete Any Conversations',
      description: 'Delete any conversations system-wide',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: true
    },
    
    // Advanced conversation operations
    'conversations:view:all:agency': {
      name: 'View All Agency Conversations',
      description: 'View all conversations in agency dashboard',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    'conversations:view:clients': {
      name: 'View Client Conversations',
      description: 'View conversations with assigned clients',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    'conversations:export:agency': {
      name: 'Export Agency Conversations',
      description: 'Export conversation data for agency',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: false
    },
    'conversations:transfer:ownership': {
      name: 'Transfer Conversation Ownership',
      description: 'Transfer ownership of conversations',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: true
    },
    'conversations:backup:agency': {
      name: 'Backup Agency Conversations',
      description: 'Create backups of agency conversations',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: true
    },
    'conversations:system:monitor': {
      name: 'Monitor System Conversations',
      description: 'Monitor conversations for system health',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: true
    },
    'conversations:system:backup': {
      name: 'System Conversation Backup',
      description: 'Create system-wide conversation backups',
      category: PERMISSION_CATEGORIES.CONVERSATIONS,
      critical: true
    }
  },

  /**
   * ITINERARY PERMISSIONS
   * Control access to travel itineraries and trip planning
   */
  ITINERARIES: {
    // Basic itinerary operations
    'itineraries:create': {
      name: 'Create Itineraries',
      description: 'Create new travel itineraries',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    
    // Read permissions
    'itineraries:read:own': {
      name: 'Read Own Itineraries',
      description: 'View own travel itineraries',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:read:assigned': {
      name: 'Read Assigned Itineraries',
      description: 'View itineraries assigned to user',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:read:agency': {
      name: 'Read Agency Itineraries',
      description: 'View all itineraries within agency',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:read:all': {
      name: 'Read All Itineraries',
      description: 'View all itineraries system-wide',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: true
    },
    
    // Update permissions
    'itineraries:update:own': {
      name: 'Update Own Itineraries',
      description: 'Edit own itineraries',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:update:assigned': {
      name: 'Update Assigned Itineraries',
      description: 'Edit itineraries assigned to user',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:update:agency': {
      name: 'Update Agency Itineraries',
      description: 'Edit any itineraries within agency',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    
    // Delete permissions
    'itineraries:delete:own': {
      name: 'Delete Own Itineraries',
      description: 'Delete own itineraries',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:delete:agency': {
      name: 'Delete Agency Itineraries',
      description: 'Delete itineraries within agency',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: true
    },
    'itineraries:delete:any:agency': {
      name: 'Delete Any Agency Itineraries',
      description: 'Delete any itineraries within agency',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: true
    },
    'itineraries:delete:any': {
      name: 'Delete Any Itineraries',
      description: 'Delete any itineraries system-wide',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: true
    },
    
    // Publishing and sharing
    'itineraries:publish:assigned': {
      name: 'Publish Assigned Itineraries',
      description: 'Publish itineraries assigned to user',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:publish:agency': {
      name: 'Publish Agency Itineraries',
      description: 'Publish any itineraries within agency',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:share:assigned': {
      name: 'Share Assigned Itineraries',
      description: 'Share itineraries assigned to user',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:approve:agency': {
      name: 'Approve Agency Itineraries',
      description: 'Approve itineraries for publication',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    
    // Comments and feedback
    'itineraries:comment:own': {
      name: 'Comment on Own Itineraries',
      description: 'Add comments to own itineraries',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    
    // Advanced operations
    'itineraries:transfer:ownership': {
      name: 'Transfer Itinerary Ownership',
      description: 'Transfer ownership of itineraries',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: true
    },
    'itineraries:templates:manage': {
      name: 'Manage Itinerary Templates',
      description: 'Create and manage itinerary templates',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: false
    },
    'itineraries:system:templates': {
      name: 'Manage System Templates',
      description: 'Manage system-wide itinerary templates',
      category: PERMISSION_CATEGORIES.ITINERARIES,
      critical: true
    }
  },

  /**
   * CLIENT PERMISSIONS
   * Control access to client information and management
   */
  CLIENTS: {
    'clients:read:assigned': {
      name: 'Read Assigned Clients',
      description: 'View information for assigned clients',
      category: PERMISSION_CATEGORIES.CLIENTS,
      critical: false
    },
    'clients:update:assigned': {
      name: 'Update Assigned Clients',
      description: 'Edit information for assigned clients',
      category: PERMISSION_CATEGORIES.CLIENTS,
      critical: false
    },
    'clients:communicate': {
      name: 'Communicate with Clients',
      description: 'Send messages and communicate with clients',
      category: PERMISSION_CATEGORIES.CLIENTS,
      critical: false
    }
  },

  /**
   * USER PERMISSIONS
   * Control user management and administration
   */
  USERS: {
    // User creation
    'users:create:agent': {
      name: 'Create Agent Users',
      description: 'Create new travel agent accounts',
      category: PERMISSION_CATEGORIES.USERS,
      critical: false
    },
    'users:create:admin': {
      name: 'Create Admin Users',
      description: 'Create new admin accounts',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    'users:create:superadmin': {
      name: 'Create Super Admin Users',
      description: 'Create new super admin accounts',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    
    // User reading
    'users:read:agency': {
      name: 'Read Agency Users',
      description: 'View all users within agency',
      category: PERMISSION_CATEGORIES.USERS,
      critical: false
    },
    'users:read:all': {
      name: 'Read All Users',
      description: 'View all users system-wide',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    
    // User updating
    'users:update:agency': {
      name: 'Update Agency Users',
      description: 'Edit user accounts within agency',
      category: PERMISSION_CATEGORIES.USERS,
      critical: false
    },
    'users:update:any': {
      name: 'Update Any Users',
      description: 'Edit any user accounts system-wide',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    
    // User management
    'users:deactivate:agency': {
      name: 'Deactivate Agency Users',
      description: 'Deactivate user accounts within agency',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    'users:delete:agency': {
      name: 'Delete Agency Users',
      description: 'Delete user accounts within agency',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    'users:delete:any': {
      name: 'Delete Any Users',
      description: 'Delete any user accounts system-wide',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    
    // Assignment and roles
    'users:assign:clients': {
      name: 'Assign Clients to Users',
      description: 'Assign clients to agents and staff',
      category: PERMISSION_CATEGORIES.USERS,
      critical: false
    },
    'users:roles:manage:agency': {
      name: 'Manage Agency User Roles',
      description: 'Assign and modify roles within agency',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    'users:roles:manage:all': {
      name: 'Manage All User Roles',
      description: 'Assign and modify any user roles',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    
    // Advanced user operations
    'users:transfer:ownership': {
      name: 'Transfer User Ownership',
      description: 'Transfer user accounts between agencies',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    },
    'users:impersonate': {
      name: 'Impersonate Users',
      description: 'Login as other users for support',
      category: PERMISSION_CATEGORIES.USERS,
      critical: true
    }
  },

  /**
   * ANALYTICS PERMISSIONS
   * Control access to reporting and analytics
   */
  ANALYTICS: {
    'analytics:view:own': {
      name: 'View Own Analytics',
      description: 'View personal performance analytics',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: false
    },
    'analytics:view:assigned': {
      name: 'View Assigned Analytics',
      description: 'View analytics for assigned clients/resources',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: false
    },
    'analytics:view:agency': {
      name: 'View Agency Analytics',
      description: 'View analytics for entire agency',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: false
    },
    'analytics:view:system': {
      name: 'View System Analytics',
      description: 'View system-wide analytics and reports',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: true
    },
    'analytics:view:advanced': {
      name: 'View Advanced Analytics',
      description: 'Access advanced analytics and insights',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: false
    },
    'analytics:export:agency': {
      name: 'Export Agency Analytics',
      description: 'Export analytics data for agency',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: false
    },
    'analytics:reports:agency': {
      name: 'Generate Agency Reports',
      description: 'Generate custom reports for agency',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: false
    },
    'analytics:configure:agency': {
      name: 'Configure Agency Analytics',
      description: 'Configure analytics settings for agency',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: false
    },
    'analytics:custom:reports': {
      name: 'Create Custom Reports',
      description: 'Create and configure custom reports',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: false
    },
    'analytics:system:performance': {
      name: 'View System Performance',
      description: 'Monitor system performance metrics',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: true
    },
    'analytics:system:usage': {
      name: 'View System Usage',
      description: 'Monitor system usage statistics',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: true
    },
    'analytics:system:security': {
      name: 'View Security Analytics',
      description: 'Monitor security metrics and alerts',
      category: PERMISSION_CATEGORIES.ANALYTICS,
      critical: true
    }
  },

  /**
   * SETTINGS PERMISSIONS
   * Control access to configuration and settings
   */
  SETTINGS: {
    'settings:read:own': {
      name: 'Read Own Settings',
      description: 'View personal settings and preferences',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: false
    },
    'settings:update:own': {
      name: 'Update Own Settings',
      description: 'Modify personal settings and preferences',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: false
    },
    'settings:read:agency': {
      name: 'Read Agency Settings',
      description: 'View agency configuration and settings',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: false
    },
    'settings:update:agency': {
      name: 'Update Agency Settings',
      description: 'Modify agency configuration and settings',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:read:system': {
      name: 'Read System Settings',
      description: 'View system configuration',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:update:system': {
      name: 'Update System Settings',
      description: 'Modify system configuration',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:update:critical': {
      name: 'Update Critical Settings',
      description: 'Modify critical agency settings',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:manage:integrations': {
      name: 'Manage Integrations',
      description: 'Configure third-party integrations',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:api:manage': {
      name: 'Manage API Settings',
      description: 'Configure API keys and settings',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:backup:agency': {
      name: 'Backup Agency Settings',
      description: 'Create backups of agency settings',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:restore:agency': {
      name: 'Restore Agency Settings',
      description: 'Restore agency settings from backup',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:system:backup': {
      name: 'Backup System Settings',
      description: 'Create system configuration backups',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:system:restore': {
      name: 'Restore System Settings',
      description: 'Restore system configuration from backup',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:system:maintenance': {
      name: 'System Maintenance',
      description: 'Perform system maintenance operations',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    },
    'settings:system:monitoring': {
      name: 'System Monitoring',
      description: 'Configure system monitoring and alerts',
      category: PERMISSION_CATEGORIES.SETTINGS,
      critical: true
    }
  },

  /**
   * BILLING PERMISSIONS
   * Control access to billing and financial information
   */
  BILLING: {
    'billing:view:own': {
      name: 'View Own Billing',
      description: 'View personal billing and invoices',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: false
    },
    'billing:view:assigned': {
      name: 'View Assigned Billing',
      description: 'View billing for assigned clients',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: false
    },
    'billing:view:agency': {
      name: 'View Agency Billing',
      description: 'View billing for entire agency',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: false
    },
    'billing:view:all': {
      name: 'View All Billing',
      description: 'View billing information system-wide',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: true
    },
    'billing:manage:agency': {
      name: 'Manage Agency Billing',
      description: 'Manage billing settings for agency',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: true
    },
    'billing:manage:all': {
      name: 'Manage All Billing',
      description: 'Manage billing settings system-wide',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: true
    },
    'billing:reports:agency': {
      name: 'Generate Agency Billing Reports',
      description: 'Generate billing reports for agency',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: false
    },
    'billing:manage:subscription': {
      name: 'Manage Subscriptions',
      description: 'Manage subscription plans and billing',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: true
    },
    'billing:view:invoices': {
      name: 'View All Invoices',
      description: 'View detailed invoice information',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: false
    },
    'billing:update:payment': {
      name: 'Update Payment Methods',
      description: 'Update payment methods and billing info',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: true
    },
    'billing:cancel:subscription': {
      name: 'Cancel Subscriptions',
      description: 'Cancel agency subscriptions',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: true
    },
    'billing:system:reports': {
      name: 'Generate System Billing Reports',
      description: 'Generate system-wide billing reports',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: true
    },
    'billing:system:configuration': {
      name: 'Configure Billing System',
      description: 'Configure system billing settings',
      category: PERMISSION_CATEGORIES.BILLING,
      critical: true
    }
  },

  /**
   * SECURITY PERMISSIONS
   * Control access to security and audit features
   */
  SECURITY: {
    'security:audit:logs': {
      name: 'View Audit Logs',
      description: 'Access security audit logs',
      category: PERMISSION_CATEGORIES.SECURITY,
      critical: true
    },
    'security:system:monitor': {
      name: 'Monitor System Security',
      description: 'Monitor system security status',
      category: PERMISSION_CATEGORIES.SECURITY,
      critical: true
    },
    'security:access:control': {
      name: 'Manage Access Control',
      description: 'Configure access control settings',
      category: PERMISSION_CATEGORIES.SECURITY,
      critical: true
    },
    'security:backup:system': {
      name: 'Backup Security Data',
      description: 'Create security data backups',
      category: PERMISSION_CATEGORIES.SECURITY,
      critical: true
    }
  }
};

/**
 * Get all permissions as a flat array
 * @returns {Array} Array of all permission keys
 */
export function getAllPermissions() {
  const permissions = [];
  Object.values(PERMISSIONS).forEach(category => {
    permissions.push(...Object.keys(category));
  });
  return permissions.sort();
}

/**
 * Get permissions by category
 * @param {string} category - Permission category
 * @returns {Array} Array of permissions in category
 */
export function getPermissionsByCategory(category) {
  return Object.keys(PERMISSIONS[category.toUpperCase()] || {});
}

/**
 * Get permission details
 * @param {string} permission - Permission key
 * @returns {Object|null} Permission details or null if not found
 */
export function getPermissionDetails(permission) {
  for (const category of Object.values(PERMISSIONS)) {
    if (category[permission]) {
      return category[permission];
    }
  }
  return null;
}

/**
 * Check if permission exists
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether permission exists
 */
export function isValidPermission(permission) {
  return getAllPermissions().includes(permission);
}

/**
 * Get critical permissions (require special handling)
 * @returns {Array} Array of critical permission keys
 */
export function getCriticalPermissions() {
  const critical = [];
  Object.values(PERMISSIONS).forEach(category => {
    Object.entries(category).forEach(([key, details]) => {
      if (details.critical) {
        critical.push(key);
      }
    });
  });
  return critical.sort();
}

/**
 * Parse permission string into components
 * @param {string} permission - Permission string
 * @returns {Object} Parsed permission components
 */
export function parsePermission(permission) {
  const parts = permission.split(':');
  return {
    resource: parts[0] || null,
    action: parts[1] || null,
    scope: parts[2] || null,
    modifier: parts[3] || null
  };
}

/**
 * Build permission string from components
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @param {string} scope - Scope (optional)
 * @param {string} modifier - Modifier (optional)
 * @returns {string} Permission string
 */
export function buildPermission(resource, action, scope = null, modifier = null) {
  let permission = `${resource}:${action}`;
  if (scope) permission += `:${scope}`;
  if (modifier) permission += `:${modifier}`;
  return permission;
}

/**
 * Get permissions that match a pattern
 * @param {string} pattern - Pattern to match (supports wildcards)
 * @returns {Array} Array of matching permissions
 */
export function getPermissionsByPattern(pattern) {
  const allPermissions = getAllPermissions();
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  return allPermissions.filter(permission => regex.test(permission));
}

/**
 * Group permissions by resource
 * @returns {Object} Permissions grouped by resource
 */
export function getPermissionsByResource() {
  const grouped = {};
  getAllPermissions().forEach(permission => {
    const parsed = parsePermission(permission);
    if (!grouped[parsed.resource]) {
      grouped[parsed.resource] = [];
    }
    grouped[parsed.resource].push(permission);
  });
  return grouped;
}

export default PERMISSIONS;