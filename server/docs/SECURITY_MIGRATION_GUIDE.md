# Security Migration Guide for Tala AI

This guide provides step-by-step instructions for migrating from mock authentication to a fully secured production environment.

## Overview

The security implementation includes:
- **Authentication System**: JWT tokens, sessions, API keys
- **Authorization (RBAC)**: Role-based access control with permissions
- **Encryption**: End-to-end document encryption
- **Security Hardening**: Input validation, rate limiting, audit logging
- **Vulnerability Protection**: XSS, SQL injection, CSRF protection

## Prerequisites

Before starting the migration:

1. **Database Setup**: Ensure PostgreSQL/Supabase is configured
2. **Environment Variables**: Set all required security environment variables
3. **SSL/TLS**: Configure HTTPS for production
4. **Monitoring**: Set up log monitoring and alerting

## Step 1: Database Migrations

Run all security-related database migrations:

```bash
# Navigate to server directory
cd server

# Run migrations in order
psql $DATABASE_URL -f migrations/create-rbac-tables.sql
psql $DATABASE_URL -f migrations/create-api-keys-table.sql
psql $DATABASE_URL -f migrations/create-encryption-tables.sql
psql $DATABASE_URL -f migrations/create-audit-logs.sql
```

Verify tables were created:
```sql
-- Check that all security tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'roles', 'permissions', 'user_roles', 'user_permissions',
  'api_keys', 'user_encryption_keys', 'audit_logs'
);
```

## Step 2: Environment Configuration

Update your `.env` file with security settings:

```env
# Disable mock authentication
MOCK_AUTH=false
NODE_ENV=production

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-min-256-bits
JWT_ISSUER=https://api.tala.ai
JWT_AUDIENCE=tala-ai-users
JWT_EXPIRES_IN=24h

# API Key Configuration
API_KEY_PREFIX=tala_
API_KEY_LENGTH=32

# Security Headers
ALLOWED_ORIGINS=https://app.tala.ai,https://tala.ai
CSP_REPORT_URI=https://api.tala.ai/security/csp-report

# Rate Limiting
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Encryption
ENCRYPTION_KEY_SIZE=4096
ARGON2_MEMORY=65536
ARGON2_ITERATIONS=3

# Audit Logging
AUDIT_CONSOLE_LOG=false
AUDIT_RETENTION_DAYS=90

# Security Features
ENABLE_CSRF_PROTECTION=true
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOGGING=true
ENABLE_ENCRYPTION=true
```

## Step 3: Initialize Security Services

Update your main server file to initialize security services:

```javascript
import { initializeAuth } from './middleware/authentication.js';
import securityManager from './security/SecurityManager.js';
import { auditLogger } from './utils/audit.js';
import { createCompleteSecurityMiddleware } from './middleware/security-headers.js';

// Initialize security services
async function initializeSecurity() {
  try {
    // Initialize core security services
    await securityManager.initialize();
    await auditLogger.initialize();
    await initializeAuth();
    
    console.log('✅ Security services initialized');
  } catch (error) {
    console.error('❌ Security initialization failed:', error);
    process.exit(1);
  }
}

// Apply security middleware
app.use(createCompleteSecurityMiddleware());
app.use(securityManager.createSecurityMiddleware({
  rateLimitType: 'global',
  validateInput: true,
  blockSuspicious: true
}));
```

## Step 4: Create Initial Roles and Users

Run the initial setup script to create default roles and admin user:

```javascript
// setup-initial-security.js
import { RBACManager } from './security/RBACManager.js';
import { AuthManager } from './security/AuthManager.js';
import { UserService } from './services/db/userService.js';

async function setupInitialSecurity() {
  const rbacManager = new RBACManager();
  const authManager = new AuthManager();
  const userService = new UserService();
  
  await rbacManager.initialize();
  await authManager.initialize();
  
  // Create default roles
  await rbacManager.createRole('owner', 'Full system access', [
    'users:*', 'documents:*', 'admin:*', 'encryption:*'
  ]);
  
  await rbacManager.createRole('admin', 'Administrative access', [
    'users:read', 'users:write', 'documents:*', 'encryption:read'
  ]);
  
  await rbacManager.createRole('member', 'Standard user access', [
    'documents:read', 'documents:write', 'documents:share'
  ]);
  
  await rbacManager.createRole('viewer', 'Read-only access', [
    'documents:read'
  ]);
  
  // Create initial admin user
  const adminUser = await userService.createUser({
    email: 'admin@tala.ai',
    display_name: 'System Administrator',
    organization_id: 'your-org-id',
    status: 'active',
    email_verified: true
  });
  
  // Assign owner role
  await rbacManager.assignRole(adminUser.id, 'owner');
  
  console.log('✅ Initial security setup completed');
  console.log('👤 Admin user created:', adminUser.email);
}

setupInitialSecurity().catch(console.error);
```

Run the setup:
```bash
node setup-initial-security.js
```

## Step 5: Enable Encryption

### Generate Encryption Keys for Existing Users

```javascript
// migrate-to-encryption.js
import { EncryptionService } from './security/EncryptionService.js';
import { KeyManager } from './security/KeyManager.js';
import { UserService } from './services/db/userService.js';

async function migrateToEncryption() {
  const encryptionService = new EncryptionService();
  const keyManager = new KeyManager();
  const userService = new UserService();
  
  await encryptionService.initialize();
  await keyManager.initialize();
  
  // Get all existing users
  const usersResult = await userService.getMany({}, { pagination: { page: 1, pageSize: 1000 } });
  
  for (const user of usersResult.data) {
    try {
      // Skip if user already has keys
      const existingKey = await keyManager.getUserPublicKey(user.id);
      if (existingKey) {
        console.log(`Skipping ${user.email} - already has encryption keys`);
        continue;
      }
      
      // Generate temporary password for encryption
      const tempPassword = `TempPass123!${Date.now()}`;
      
      // Generate encryption keys
      const keyPair = await encryptionService.generateKeyPair(user.id, tempPassword);
      
      // Store keys
      await keyManager.storeUserKeyPair(
        user.id,
        keyPair.publicKey,
        keyPair.encryptedPrivateKey,
        tempPassword,
        { migratedAt: new Date().toISOString() }
      );
      
      console.log(`✅ Generated encryption keys for ${user.email}`);
      
      // Note: In production, you should notify users to set their own passwords
      
    } catch (error) {
      console.error(`❌ Failed to generate keys for ${user.email}:`, error.message);
    }
  }
  
  console.log('🔐 Encryption migration completed');
}

migrateToEncryption().catch(console.error);
```

### Encrypt Existing Documents (Optional)

```javascript
// encrypt-existing-documents.js
import { DocumentService } from './services/db/documentService.js';
import { EncryptedDocumentService } from './services/db/encryptedDocumentService.js';

async function encryptExistingDocuments() {
  const documentService = new DocumentService();
  const encryptedDocumentService = new EncryptedDocumentService();
  
  await encryptedDocumentService.initializeEncryption();
  
  // Get documents to encrypt (example: sensitive documents)
  const documents = await documentService.getMany({
    // Add criteria for documents to encrypt
    tags: { contains: 'confidential' }
  });
  
  for (const doc of documents.data) {
    try {
      // This requires user password - in practice, you'd need a migration strategy
      // that either prompts users or uses a master key approach
      console.log(`Would encrypt document: ${doc.title}`);
      
    } catch (error) {
      console.error(`Failed to encrypt document ${doc.id}:`, error.message);
    }
  }
}
```

## Step 6: Update Client Applications

### Frontend Authentication Integration

```javascript
// auth-client.js
class AuthClient {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.token = localStorage.getItem('auth_token');
  }
  
  async login(email, password) {
    const response = await fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    
    if (result.success) {
      this.token = result.token;
      localStorage.setItem('auth_token', this.token);
      return true;
    }
    
    throw new Error(result.message);
  }
  
  getAuthHeaders() {
    return this.token ? {
      'Authorization': `Bearer ${this.token}`
    } : {};
  }
  
  async makeAuthenticatedRequest(endpoint, options = {}) {
    return fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        ...this.getAuthHeaders()
      }
    });
  }
}
```

### API Client with Security Headers

```javascript
// api-client.js
class SecureAPIClient {
  constructor(apiUrl, apiKey = null) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.csrfToken = null;
  }
  
  async getCSRFToken() {
    if (!this.csrfToken) {
      const response = await fetch(`${this.apiUrl}/auth/csrf-token`);
      const result = await response.json();
      this.csrfToken = result.csrfToken;
    }
    return this.csrfToken;
  }
  
  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add API key if available
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    
    // Add CSRF token for non-GET requests
    if (options.method && options.method !== 'GET') {
      headers['X-CSRF-Token'] = await this.getCSRFToken();
    }
    
    return fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers
    });
  }
}
```

## Step 7: Testing and Validation

### Run Security Tests

```bash
# Run the comprehensive security test suite
node test-security.js

# Run specific test categories
npm test -- --grep "authentication"
npm test -- --grep "encryption"
npm test -- --grep "rate-limiting"
```

### Security Checklist

- [ ] All database migrations completed successfully
- [ ] Mock authentication disabled (`MOCK_AUTH=false`)
- [ ] SSL/TLS certificates configured
- [ ] Security headers implemented
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Encryption keys generated for all users
- [ ] RBAC roles and permissions set up
- [ ] API keys working for external integrations
- [ ] Security tests passing
- [ ] Monitoring and alerting configured

### Validation Scripts

```bash
# Verify security configuration
node scripts/validate-security-config.js

# Test authentication flows
node scripts/test-auth-flows.js

# Verify encryption works
node scripts/test-encryption.js
```

## Step 8: Production Deployment

### Pre-deployment Checklist

1. **Environment Variables**: All security-related env vars set
2. **Database**: Migrations run and verified
3. **SSL/TLS**: HTTPS enforced
4. **DNS**: Security headers configured at DNS level
5. **Monitoring**: Log aggregation and alerting set up
6. **Backup**: Database backup strategy in place
7. **Recovery**: Disaster recovery plan documented

### Deployment Steps

1. **Backup Current System**
   ```bash
   pg_dump $DATABASE_URL > backup-pre-security-migration.sql
   ```

2. **Deploy with Feature Flags**
   ```env
   ENABLE_NEW_AUTH=true
   SECURITY_MIGRATION_MODE=true
   ```

3. **Gradual Rollout**
   - Deploy to staging environment first
   - Test all functionality thoroughly
   - Deploy to production with monitoring
   - Monitor error rates and performance

4. **Post-deployment Verification**
   ```bash
   # Test authentication
   curl -X POST https://api.tala.ai/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass"}'
   
   # Test security headers
   curl -I https://api.tala.ai/
   
   # Test rate limiting
   for i in {1..10}; do curl https://api.tala.ai/api/documents; done
   ```

## Step 9: User Communication and Training

### Notify Users of Changes

1. **Email existing users** about security improvements
2. **Update documentation** with new authentication flows
3. **Provide migration tools** for API key users
4. **Schedule training sessions** for admin users

### User Migration Steps

For existing users:
1. First login will prompt for encryption password setup
2. API key users need to regenerate keys
3. Admin users need to assign roles to team members
4. Update any saved bookmarks/URLs

## Step 10: Ongoing Security Maintenance

### Regular Tasks

**Daily:**
- Monitor audit logs for suspicious activity
- Check security incident alerts
- Review failed authentication attempts

**Weekly:**
- Review user access and permissions
- Check for security updates
- Analyze security metrics

**Monthly:**
- Rotate API keys
- Review and update security policies
- Conduct security training
- Test backup and recovery procedures

**Quarterly:**
- Full security audit
- Penetration testing
- Update security documentation
- Review and update incident response plan

### Monitoring and Alerting

Set up alerts for:
- Failed authentication attempts > 5 per IP
- High-risk audit events
- Rate limit violations
- Encryption/decryption failures
- Security header violations

### Security Metrics to Track

- Authentication success/failure rates
- API key usage patterns
- Document encryption adoption
- Security incident frequency
- User permission changes
- Failed authorization attempts

## Troubleshooting Common Issues

### Authentication Issues

**Problem**: Users can't log in after migration
**Solution**: 
- Check JWT secret is set correctly
- Verify database tables exist
- Check user status is 'active'

**Problem**: API keys not working
**Solution**:
- Verify API key format (tala_ prefix)
- Check API key hasn't expired
- Ensure correct permissions assigned

### Encryption Issues

**Problem**: Can't decrypt existing documents
**Solution**:
- Verify user has encryption keys
- Check password is correct
- Ensure user has access to document

**Problem**: Encryption key generation fails
**Solution**:
- Check node-forge and argon2 packages installed
- Verify sufficient system entropy
- Check database permissions

### Performance Issues

**Problem**: Slow response times after security implementation
**Solution**:
- Optimize database indexes
- Configure Redis for caching
- Adjust rate limiting settings
- Profile authentication middleware

### Security Alerts

**Problem**: Many false positive security alerts
**Solution**:
- Adjust threat detection thresholds
- Whitelist known good IPs
- Update security patterns
- Improve logging context

## Emergency Procedures

### Security Incident Response

1. **Immediate Actions**
   - Block suspicious IPs
   - Disable compromised accounts
   - Revoke affected API keys
   - Enable enhanced monitoring

2. **Investigation**
   - Review audit logs
   - Analyze attack patterns
   - Identify affected resources
   - Document findings

3. **Recovery**
   - Reset compromised credentials
   - Update security measures
   - Notify affected users
   - Update security documentation

### Rollback Procedure

If migration needs to be rolled back:

1. **Immediate Rollback**
   ```env
   MOCK_AUTH=true
   SECURITY_MIGRATION_MODE=false
   ```

2. **Database Rollback**
   ```bash
   psql $DATABASE_URL < backup-pre-security-migration.sql
   ```

3. **Notification**
   - Notify users of temporary rollback
   - Document issues encountered
   - Plan remediation steps

## Best Practices

### Security Development Lifecycle

1. **Threat Modeling**: Regular assessment of security threats
2. **Secure Coding**: Follow secure coding guidelines
3. **Code Review**: Security-focused code reviews
4. **Testing**: Automated security testing in CI/CD
5. **Monitoring**: Continuous security monitoring
6. **Response**: Incident response procedures

### Compliance Considerations

- **GDPR**: User data protection and right to erasure
- **SOC 2**: Security controls and monitoring
- **ISO 27001**: Information security management
- **HIPAA**: Healthcare data protection (if applicable)

This completes the comprehensive security migration guide for Tala AI. Following these steps will ensure a secure, production-ready authentication and authorization system.