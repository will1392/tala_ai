/**
 * Comprehensive Security Test Suite for Tala AI
 * 
 * Tests all security components including:
 * - Authentication flows
 * - RBAC permissions
 * - API key validation
 * - Encryption/decryption
 * - Rate limiting
 * - Input validation
 * - Security headers
 * - Audit logging
 */

import assert from 'assert';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

// Import security components
import { AuthManager } from './security/AuthManager.js';
import { RBACManager } from './security/RBACManager.js';
import { APIKeyManager } from './security/APIKeyManager.js';
import encryptionService from './security/EncryptionService.js';
import keyManager from './security/KeyManager.js';
import securityManager from './security/SecurityManager.js';
import { auditLogger } from './utils/audit.js';
import { 
  sanitizeString, 
  sanitizeEmail, 
  sanitizeUrl, 
  validateFileUpload,
  checkForThreats,
  validatePasswordStrength 
} from './utils/security.js';

class SecurityTestSuite {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
    
    this.testUsers = {
      admin: {
        id: 'test-admin-123',
        email: 'admin@test.com',
        password: 'AdminPass123!',
        role: 'admin'
      },
      user: {
        id: 'test-user-456',
        email: 'user@test.com',
        password: 'UserPass123!',
        role: 'member'
      },
      viewer: {
        id: 'test-viewer-789',
        email: 'viewer@test.com',
        password: 'ViewerPass123!',
        role: 'viewer'
      }
    };
    
    this.testOrganization = {
      id: 'test-org-123',
      name: 'Test Organization',
      slug: 'test-org'
    };
  }

  /**
   * Run all security tests
   */
  async runAllTests() {
    console.log('🔒 Starting Comprehensive Security Test Suite...\n');
    
    const startTime = performance.now();
    
    try {
      // Initialize test environment
      await this.setupTestEnvironment();
      
      // Run test categories
      await this.testAuthentication();
      await this.testRBAC();
      await this.testAPIKeys();
      await this.testEncryption();
      await this.testRateLimiting();
      await this.testInputValidation();
      await this.testSecurityHeaders();
      await this.testAuditLogging();
      await this.testVulnerabilities();
      
      // Cleanup
      await this.cleanupTestEnvironment();
      
    } catch (error) {
      this.recordError('Test Suite Setup', error);
    }
    
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    // Print results
    this.printResults(duration);
    
    return this.testResults;
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('📋 Setting up test environment...');
    
    try {
      // Initialize security services
      await securityManager.initialize();
      await auditLogger.initialize();
      
      console.log('✅ Test environment ready\n');
    } catch (error) {
      throw new Error(`Failed to setup test environment: ${error.message}`);
    }
  }

  /**
   * Test authentication flows
   */
  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    const authManager = new AuthManager();
    await authManager.initialize();
    
    // Test 1: Valid JWT creation and validation
    await this.runTest('JWT Creation and Validation', async () => {
      const payload = {
        userId: this.testUsers.admin.id,
        organizationId: this.testOrganization.id,
        role: this.testUsers.admin.role
      };
      
      const token = await authManager.createJWT(payload);
      assert(token, 'JWT token should be created');
      
      const validation = await authManager.validateJWT(token);
      assert(validation.success, 'JWT should be valid');
      assert.strictEqual(validation.decoded.userId, payload.userId, 'User ID should match');
    });
    
    // Test 2: Invalid JWT validation
    await this.runTest('Invalid JWT Validation', async () => {
      const invalidToken = 'invalid.jwt.token';
      const validation = await authManager.validateJWT(invalidToken);
      assert(!validation.success, 'Invalid JWT should be rejected');
    });
    
    // Test 3: Expired JWT validation
    await this.runTest('Expired JWT Validation', async () => {
      const payload = {
        userId: this.testUsers.user.id,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };
      
      const expiredToken = await authManager.createJWT(payload, { expiresIn: '-1h' });
      const validation = await authManager.validateJWT(expiredToken);
      assert(!validation.success, 'Expired JWT should be rejected');
    });
    
    // Test 4: Session management
    await this.runTest('Session Management', async () => {
      const sessionData = {
        userId: this.testUsers.admin.id,
        organizationId: this.testOrganization.id
      };
      
      const sessionId = await authManager.createSession(sessionData);
      assert(sessionId, 'Session should be created');
      
      const sessionValidation = await authManager.validateSession(sessionId);
      assert(sessionValidation.success, 'Session should be valid');
      
      await authManager.destroySession(sessionId);
      const invalidSessionValidation = await authManager.validateSession(sessionId);
      assert(!invalidSessionValidation.success, 'Destroyed session should be invalid');
    });
    
    console.log('✅ Authentication tests completed\n');
  }

  /**
   * Test RBAC permissions
   */
  async testRBAC() {
    console.log('👥 Testing RBAC Permissions...');
    
    const rbacManager = new RBACManager();
    await rbacManager.initialize();
    
    // Test 1: Role hierarchy
    await this.runTest('Role Hierarchy', async () => {
      const hasOwnerRole = await rbacManager.userHasRole(this.testUsers.admin.id, 'admin');
      assert(hasOwnerRole, 'Admin should have admin role');
      
      const hasLowerRole = await rbacManager.userHasRole(this.testUsers.admin.id, 'member');
      assert(hasLowerRole, 'Admin should have member role (hierarchy)');
      
      const hasHigherRole = await rbacManager.userHasRole(this.testUsers.viewer.id, 'admin');
      assert(!hasHigherRole, 'Viewer should not have admin role');
    });
    
    // Test 2: Permission checking
    await this.runTest('Permission Checking', async () => {
      const hasDocumentWrite = await rbacManager.userHasPermission(
        this.testUsers.admin.id, 
        'documents:write'
      );
      assert(hasDocumentWrite, 'Admin should have document write permission');
      
      const viewerHasWrite = await rbacManager.userHasPermission(
        this.testUsers.viewer.id, 
        'documents:write'
      );
      assert(!viewerHasWrite, 'Viewer should not have write permission');
    });
    
    // Test 3: Resource access control
    await this.runTest('Resource Access Control', async () => {
      const documentId = 'test-doc-123';
      
      // Grant access
      await rbacManager.grantResourceAccess(
        this.testUsers.user.id,
        'document',
        documentId,
        ['read', 'write']
      );
      
      const hasAccess = await rbacManager.userHasResourceAccess(
        this.testUsers.user.id,
        'document',
        documentId
      );
      assert(hasAccess, 'User should have access to granted resource');
      
      // Revoke access
      await rbacManager.revokeResourceAccess(
        this.testUsers.user.id,
        'document',
        documentId
      );
      
      const noAccess = await rbacManager.userHasResourceAccess(
        this.testUsers.user.id,
        'document',
        documentId
      );
      assert(!noAccess, 'User should not have access after revocation');
    });
    
    console.log('✅ RBAC tests completed\n');
  }

  /**
   * Test API key validation
   */
  async testAPIKeys() {
    console.log('🔑 Testing API Keys...');
    
    const apiKeyManager = new APIKeyManager();
    await apiKeyManager.initialize();
    
    // Test 1: API key generation
    await this.runTest('API Key Generation', async () => {
      const keyData = await apiKeyManager.generateAPIKey(
        this.testUsers.admin.id,
        this.testOrganization.id,
        {
          name: 'Test API Key',
          permissions: ['documents:read', 'documents:write'],
          rateLimit: 1000
        }
      );
      
      assert(keyData.success, 'API key should be generated successfully');
      assert(keyData.apiKey, 'API key should be returned');
      assert(keyData.keyId, 'Key ID should be returned');
    });
    
    // Test 2: API key validation
    await this.runTest('API Key Validation', async () => {
      // Create test API key
      const keyData = await apiKeyManager.generateAPIKey(
        this.testUsers.user.id,
        this.testOrganization.id,
        { name: 'Validation Test Key' }
      );
      
      const validation = await apiKeyManager.validateAPIKey(keyData.apiKey);
      assert(validation.success, 'Valid API key should be accepted');
      assert.strictEqual(validation.userId, this.testUsers.user.id, 'User ID should match');
    });
    
    // Test 3: Invalid API key validation
    await this.runTest('Invalid API Key Validation', async () => {
      const invalidKey = 'tala_invalid_key_' + crypto.randomBytes(16).toString('hex');
      const validation = await apiKeyManager.validateAPIKey(invalidKey);
      assert(!validation.success, 'Invalid API key should be rejected');
    });
    
    // Test 4: API key revocation
    await this.runTest('API Key Revocation', async () => {
      // Create and revoke API key
      const keyData = await apiKeyManager.generateAPIKey(
        this.testUsers.user.id,
        this.testOrganization.id,
        { name: 'Revocation Test Key' }
      );
      
      await apiKeyManager.revokeAPIKey(keyData.keyId, this.testUsers.user.id);
      
      const validation = await apiKeyManager.validateAPIKey(keyData.apiKey);
      assert(!validation.success, 'Revoked API key should be rejected');
    });
    
    console.log('✅ API Key tests completed\n');
  }

  /**
   * Test encryption/decryption
   */
  async testEncryption() {
    console.log('🔐 Testing Encryption...');
    
    await encryptionService.initialize();
    await keyManager.initialize();
    
    // Test 1: Key pair generation
    await this.runTest('Key Pair Generation', async () => {
      const keyPair = await encryptionService.generateKeyPair(
        this.testUsers.admin.id,
        this.testUsers.admin.password
      );
      
      assert(keyPair.publicKey, 'Public key should be generated');
      assert(keyPair.encryptedPrivateKey, 'Encrypted private key should be generated');
      assert(keyPair.fingerprint, 'Key fingerprint should be generated');
    });
    
    // Test 2: Document encryption and decryption
    await this.runTest('Document Encryption/Decryption', async () => {
      // Generate keys for test users
      const adminKeyPair = await encryptionService.generateKeyPair(
        this.testUsers.admin.id,
        this.testUsers.admin.password
      );
      
      const userKeyPair = await encryptionService.generateKeyPair(
        this.testUsers.user.id,
        this.testUsers.user.password
      );
      
      // Store keys
      await keyManager.storeUserKeyPair(
        this.testUsers.admin.id,
        adminKeyPair.publicKey,
        adminKeyPair.encryptedPrivateKey,
        this.testUsers.admin.password
      );
      
      await keyManager.storeUserKeyPair(
        this.testUsers.user.id,
        userKeyPair.publicKey,
        userKeyPair.encryptedPrivateKey,
        this.testUsers.user.password
      );
      
      // Encrypt document for multiple recipients
      const testContent = 'This is a confidential test document.';
      const recipientKeys = [adminKeyPair.publicKey, userKeyPair.publicKey];
      
      const encryptedDoc = await encryptionService.encryptDocument(
        testContent,
        recipientKeys,
        { documentId: 'test-doc-encrypt' }
      );
      
      assert(encryptedDoc.encryptedContent, 'Document should be encrypted');
      assert.strictEqual(encryptedDoc.encryptedKeys.length, 2, 'Should have keys for both recipients');
      
      // Decrypt for admin user
      const adminPrivateKey = await keyManager.getDecryptedPrivateKey(
        this.testUsers.admin.id,
        this.testUsers.admin.password
      );
      
      const decryptedContent = await encryptionService.decryptDocument(
        encryptedDoc,
        adminPrivateKey,
        this.testUsers.admin.password
      );
      
      assert.strictEqual(decryptedContent.toString(), testContent, 'Decrypted content should match original');
    });
    
    // Test 3: Document sharing
    await this.runTest('Document Key Sharing', async () => {
      const viewerKeyPair = await encryptionService.generateKeyPair(
        this.testUsers.viewer.id,
        this.testUsers.viewer.password
      );
      
      await keyManager.storeUserKeyPair(
        this.testUsers.viewer.id,
        viewerKeyPair.publicKey,
        viewerKeyPair.encryptedPrivateKey,
        this.testUsers.viewer.password
      );
      
      // Create encrypted document
      const testContent = 'Shared document content';
      const encryptedDoc = await encryptionService.encryptDocument(
        testContent,
        [viewerKeyPair.publicKey]
      );
      
      // Share with additional user
      const userPrivateKey = await keyManager.getDecryptedPrivateKey(
        this.testUsers.user.id,
        this.testUsers.user.password
      );
      
      const userPublicKey = await keyManager.getUserPublicKey(this.testUsers.user.id);
      
      const sharedDoc = await encryptionService.shareDocumentKey(
        encryptedDoc,
        [userPublicKey],
        userPrivateKey,
        this.testUsers.user.password
      );
      
      assert(sharedDoc.encryptedKeys.length > encryptedDoc.encryptedKeys.length, 
        'Should have additional encrypted key after sharing');
    });
    
    console.log('✅ Encryption tests completed\n');
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log('⏱️ Testing Rate Limiting...');
    
    // Test 1: Basic rate limiting
    await this.runTest('Basic Rate Limiting', async () => {
      const testIp = '192.168.1.100';
      
      // Make requests within limit
      for (let i = 0; i < 5; i++) {
        const result = await securityManager.checkRequest(testIp);
        assert(result.allowed, `Request ${i + 1} should be allowed`);
      }
    });
    
    // Test 2: Rate limit exceeded
    await this.runTest('Rate Limit Exceeded', async () => {
      const testIp = '192.168.1.101';
      
      // Exhaust rate limit
      for (let i = 0; i < 1001; i++) {
        await securityManager.incrementRequestCount(testIp, 60000);
      }
      
      const result = await securityManager.checkRequest(testIp);
      assert(!result.allowed, 'Request should be blocked after exceeding limit');
    });
    
    // Test 3: API key rate limiting
    await this.runTest('API Key Rate Limiting', async () => {
      const testApiKey = 'test_api_key_rate_limit';
      const testIp = '192.168.1.102';
      
      // Test within limit
      const result1 = await securityManager.checkAPIKeyLimit(testApiKey, testIp);
      assert(result1.allowed, 'API key request should be allowed within limit');
      
      // Exhaust API key limit
      for (let i = 0; i < 1001; i++) {
        await securityManager.incrementRequestCount(`api:${testApiKey}:${testIp}`, 60000);
      }
      
      const result2 = await securityManager.checkAPIKeyLimit(testApiKey, testIp);
      assert(!result2.allowed, 'API key request should be blocked after exceeding limit');
    });
    
    console.log('✅ Rate limiting tests completed\n');
  }

  /**
   * Test input validation and sanitization
   */
  async testInputValidation() {
    console.log('🧹 Testing Input Validation...');
    
    // Test 1: String sanitization
    await this.runTest('String Sanitization', async () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeString(maliciousInput);
      assert(!sanitized.includes('<script>'), 'HTML tags should be removed');
      assert(sanitized.includes('Hello World'), 'Safe content should be preserved');
    });
    
    // Test 2: Email validation
    await this.runTest('Email Validation', async () => {
      const validEmail = 'user@example.com';
      const invalidEmail = 'not-an-email';
      
      const sanitizedValid = sanitizeEmail(validEmail);
      assert.strictEqual(sanitizedValid, validEmail.toLowerCase(), 'Valid email should be normalized');
      
      try {
        sanitizeEmail(invalidEmail);
        assert.fail('Invalid email should throw error');
      } catch (error) {
        assert(error.message.includes('Invalid email'), 'Should throw email validation error');
      }
    });
    
    // Test 3: URL validation
    await this.runTest('URL Validation', async () => {
      const validUrl = 'https://example.com/path';
      const invalidUrl = 'javascript:alert("xss")';
      
      const sanitizedValid = sanitizeUrl(validUrl);
      assert.strictEqual(sanitizedValid, validUrl, 'Valid HTTPS URL should be preserved');
      
      try {
        sanitizeUrl(invalidUrl);
        assert.fail('Invalid URL protocol should throw error');
      } catch (error) {
        assert(error.message.includes('not allowed'), 'Should reject dangerous protocols');
      }
    });
    
    // Test 4: Threat detection
    await this.runTest('Threat Detection', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const xssAttempt = '<iframe src="javascript:alert(1)"></iframe>';
      const pathTraversal = '../../../etc/passwd';
      
      const sqlThreat = checkForThreats(sqlInjection);
      assert(!sqlThreat.isSafe, 'SQL injection should be detected');
      assert.strictEqual(sqlThreat.threat, 'sql_injection', 'Should identify as SQL injection');
      
      const xssThreat = checkForThreats(xssAttempt);
      assert(!xssThreat.isSafe, 'XSS attempt should be detected');
      assert.strictEqual(xssThreat.threat, 'xss', 'Should identify as XSS');
      
      const pathThreat = checkForThreats(pathTraversal);
      assert(!pathThreat.isSafe, 'Path traversal should be detected');
      assert.strictEqual(pathThreat.threat, 'path_traversal', 'Should identify as path traversal');
    });
    
    // Test 5: Password strength validation
    await this.runTest('Password Strength Validation', async () => {
      const weakPassword = '123456';
      const strongPassword = 'StrongP@ssw0rd123!';
      
      const weakResult = validatePasswordStrength(weakPassword);
      assert(!weakResult.isValid, 'Weak password should be rejected');
      assert(weakResult.issues.length > 0, 'Should have validation issues');
      
      const strongResult = validatePasswordStrength(strongPassword);
      assert(strongResult.isValid, 'Strong password should be accepted');
      assert(strongResult.score >= 70, 'Strong password should have high score');
    });
    
    console.log('✅ Input validation tests completed\n');
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    console.log('🛡️ Testing Security Headers...');
    
    // Mock response object for testing
    const mockResponse = {
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
      removeHeader(name) {
        delete this.headers[name];
      }
    };
    
    // Test 1: Security headers are set
    await this.runTest('Security Headers Setting', async () => {
      // Import and use security headers middleware
      const { createSecurityHeadersMiddleware } = await import('./middleware/security-headers.js');
      const middleware = createSecurityHeadersMiddleware();
      
      // Mock request and response
      const mockRequest = { path: '/api/test' };
      
      // Apply middleware
      await new Promise((resolve) => {
        middleware(mockRequest, mockResponse, resolve);
      });
      
      // Verify important security headers are set
      assert(mockResponse.headers['X-Content-Type-Options'], 'X-Content-Type-Options should be set');
      assert(mockResponse.headers['X-Frame-Options'], 'X-Frame-Options should be set');
      assert(mockResponse.headers['X-XSS-Protection'], 'X-XSS-Protection should be set');
      assert(mockResponse.headers['Referrer-Policy'], 'Referrer-Policy should be set');
      
      // Verify sensitive headers are removed
      assert(!mockResponse.headers['X-Powered-By'], 'X-Powered-By should be removed');
      assert(!mockResponse.headers['Server'], 'Server header should be removed');
    });
    
    console.log('✅ Security headers tests completed\n');
  }

  /**
   * Test audit logging
   */
  async testAuditLogging() {
    console.log('📝 Testing Audit Logging...');
    
    // Test 1: Basic audit logging
    await this.runTest('Basic Audit Logging', async () => {
      const eventId = await auditLogger.logEvent(
        'test_event',
        'security',
        this.testUsers.admin.id,
        '192.168.1.200',
        {
          testData: 'test value',
          timestamp: new Date().toISOString()
        },
        'low'
      );
      
      assert(eventId, 'Audit log should return event ID');
    });
    
    // Test 2: Authentication event logging
    await this.runTest('Authentication Event Logging', async () => {
      const eventId = await auditLogger.logAuthentication(
        'login_success',
        this.testUsers.user.id,
        '192.168.1.201',
        {
          authMethod: 'password',
          userAgent: 'Test Browser'
        }
      );
      
      assert(eventId, 'Authentication event should be logged');
    });
    
    // Test 3: Security incident logging
    await this.runTest('Security Incident Logging', async () => {
      const eventId = await auditLogger.logSecurityIncident(
        'suspicious_activity',
        null,
        '192.168.1.202',
        {
          incidentType: 'brute_force',
          severity: 'high',
          blocked: true
        }
      );
      
      assert(eventId, 'Security incident should be logged');
    });
    
    console.log('✅ Audit logging tests completed\n');
  }

  /**
   * Test for common vulnerabilities
   */
  async testVulnerabilities() {
    console.log('🚨 Testing Vulnerability Protection...');
    
    // Test 1: SQL injection protection
    await this.runTest('SQL Injection Protection', async () => {
      const injectionAttempts = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'; DELETE FROM audit_logs; --"
      ];
      
      for (const attempt of injectionAttempts) {
        const threat = checkForThreats(attempt);
        assert(!threat.isSafe, `SQL injection attempt should be detected: ${attempt}`);
      }
    });
    
    // Test 2: XSS protection
    await this.runTest('XSS Protection', async () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];
      
      for (const attempt of xssAttempts) {
        const threat = checkForThreats(attempt);
        assert(!threat.isSafe, `XSS attempt should be detected: ${attempt}`);
      }
    });
    
    // Test 3: Path traversal protection
    await this.runTest('Path Traversal Protection', async () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];
      
      for (const attempt of traversalAttempts) {
        const threat = checkForThreats(attempt);
        assert(!threat.isSafe, `Path traversal attempt should be detected: ${attempt}`);
      }
    });
    
    // Test 4: File upload validation
    await this.runTest('File Upload Validation', async () => {
      // Test malicious file
      const maliciousFile = {
        originalname: 'malicious.exe',
        mimetype: 'application/octet-stream',
        size: 1024,
        buffer: Buffer.from('MZ') // PE header for executable
      };
      
      try {
        await validateFileUpload(maliciousFile);
        assert.fail('Malicious file should be rejected');
      } catch (error) {
        assert(error.message.includes('not allowed'), 'Should reject dangerous file types');
      }
      
      // Test legitimate file
      const legitimateFile = {
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('%PDF') // PDF header
      };
      
      const result = await validateFileUpload(legitimateFile);
      assert(result.isValid, 'Legitimate file should be accepted');
    });
    
    console.log('✅ Vulnerability protection tests completed\n');
  }

  /**
   * Run a single test
   */
  async runTest(testName, testFunction) {
    try {
      await testFunction();
      this.testResults.passed++;
      this.testResults.details.push({
        name: testName,
        status: 'PASSED',
        error: null
      });
      console.log(`  ✅ ${testName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: testName,
        error: error.message,
        stack: error.stack
      });
      this.testResults.details.push({
        name: testName,
        status: 'FAILED',
        error: error.message
      });
      console.log(`  ❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * Record a test error
   */
  recordError(testName, error) {
    this.testResults.failed++;
    this.testResults.errors.push({
      test: testName,
      error: error.message,
      stack: error.stack
    });
  }

  /**
   * Print test results
   */
  printResults(duration) {
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? Math.round((this.testResults.passed / total) * 100) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY TEST SUITE RESULTS');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${total}`);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️ Duration: ${duration}ms`);
    
    if (this.testResults.failed > 0) {
      console.log('\n' + '❌ FAILED TESTS:');
      console.log('-'.repeat(40));
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}`);
        console.log(`   Error: ${error.error}`);
        console.log('');
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.testResults.failed === 0) {
      console.log('🎉 ALL SECURITY TESTS PASSED!');
    } else {
      console.log('⚠️  SOME SECURITY TESTS FAILED - REVIEW REQUIRED');
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Cleanup test environment
   */
  async cleanupTestEnvironment() {
    console.log('🧹 Cleaning up test environment...');
    
    try {
      // Clean up test data if needed
      // (In a real environment, you might want to clean up test users, API keys, etc.)
      
      console.log('✅ Test environment cleaned up');
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error.message);
    }
  }
}

// Export the test suite
export { SecurityTestSuite };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new SecurityTestSuite();
  
  testSuite.runAllTests()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test suite failed to run:', error);
      process.exit(1);
    });
}

export default SecurityTestSuite;