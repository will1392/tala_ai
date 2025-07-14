#!/usr/bin/env node

/**
 * Test Multi-Provider Authentication System
 */

import authManager from './auth/AuthManager.js';
import { getAuthConfig } from './config/auth.js';

console.log('🔐 Testing Multi-Provider Authentication System...\n');

async function testProviderInitialization() {
  console.log('1️⃣ Testing Provider Initialization:');
  
  try {
    // Get auth configuration
    const authConfig = getAuthConfig();
    console.log('   Configuration loaded successfully');
    
    // Initialize AuthManager with config
    await authManager.initialize(authConfig);
    console.log('   ✅ AuthManager initialized successfully');
    
    // Check available providers
    const providers = authManager.getAvailableProviders();
    console.log(`   Available providers (${providers.length}):`);
    providers.forEach(provider => {
      console.log(`     - ${provider.displayName} (${provider.name}): ${provider.status}`);
      console.log(`       Default: ${provider.isDefault}, Registration: ${provider.supportsRegistration}, Reset: ${provider.supportsPasswordReset}`);
    });
    
    console.log(`   Default provider: ${authManager.defaultProvider}`);
    
  } catch (error) {
    console.error('   ❌ Provider initialization failed:', error.message);
  }
  
  console.log();
}

async function testMockProvider() {
  console.log('2️⃣ Testing Mock Provider:');
  
  try {
    // Test mock authentication
    const credentials = {
      email: 'admin@tala.ai',
      password: 'admin123'
    };
    
    const authResult = await authManager.authenticate(credentials, { provider: 'mock' });
    
    if (authResult.success) {
      console.log('   ✅ Mock authentication successful');
      console.log(`     User: ${authResult.user.name} (${authResult.user.email})`);
      console.log(`     Roles: ${authResult.user.roles.join(', ')}`);
      console.log(`     Token: ${authResult.tokens.accessToken.substring(0, 20)}...`);
      
      // Test token validation
      const validation = await authManager.validateToken(authResult.tokens.accessToken, { provider: 'mock' });
      if (validation.valid) {
        console.log('   ✅ Token validation successful');
      } else {
        console.log('   ❌ Token validation failed:', validation.error);
      }
      
    } else {
      console.log('   ❌ Mock authentication failed:', authResult.error);
    }
    
  } catch (error) {
    console.error('   ❌ Mock provider test failed:', error.message);
  }
  
  console.log();
}

async function testAutoDetection() {
  console.log('3️⃣ Testing Auto Provider Detection:');
  
  try {
    // Test with mock token
    const mockCredentials = {
      token: 'mock-access-12345'
    };
    
    const detectedProvider = authManager.detectProviderFromCredentials(mockCredentials);
    console.log(`   Detected provider for mock token: ${detectedProvider}`);
    
    // Test with JWT-like token
    const jwtCredentials = {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
    };
    
    const jwtProvider = authManager.detectProviderFromCredentials(jwtCredentials);
    console.log(`   Detected provider for JWT token: ${jwtProvider}`);
    
    // Test with Clerk session
    const clerkCredentials = {
      sessionToken: 'sess_abc123',
      sessionId: 'sess_def456'
    };
    
    const clerkProvider = authManager.detectProviderFromCredentials(clerkCredentials);
    console.log(`   Detected provider for Clerk session: ${clerkProvider}`);
    
    // Test with email/password
    const emailCredentials = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const emailProvider = authManager.detectProviderFromCredentials(emailCredentials);
    console.log(`   Detected provider for email/password: ${emailProvider}`);
    
  } catch (error) {
    console.error('   ❌ Auto detection test failed:', error.message);
  }
  
  console.log();
}

async function testProviderFailover() {
  console.log('4️⃣ Testing Provider Failover:');
  
  try {
    // Simulate failover scenario
    const credentials = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    // Test failover from non-existent provider
    const failoverResult = await authManager.handleProviderFailover('nonexistent', credentials);
    
    console.log(`   Failover result: ${failoverResult.success ? 'SUCCESS' : 'FAILED'}`);
    if (failoverResult.success) {
      console.log(`     Failed over from: ${failoverResult.originalProvider}`);
      console.log(`     Current provider: ${failoverResult.currentProvider}`);
    } else {
      console.log(`     Reason: ${failoverResult.error}`);
      console.log(`     Attempted providers: ${failoverResult.attemptedProviders?.join(', ') || 'none'}`);
    }
    
  } catch (error) {
    console.error('   ❌ Provider failover test failed:', error.message);
  }
  
  console.log();
}

async function testProviderConfiguration() {
  console.log('5️⃣ Testing Provider Configuration:');
  
  try {
    const providers = authManager.getAvailableProviders();
    
    for (const providerInfo of providers) {
      const provider = authManager.getProvider(providerInfo.name);
      const health = provider.getHealthStatus();
      const config = provider.getConfig();
      
      console.log(`   ${providerInfo.displayName} (${providerInfo.name}):`);
      console.log(`     Health: ${health.status}`);
      console.log(`     Type: ${config.type}`);
      
      if (providerInfo.name === 'mock') {
        console.log(`     User count: ${health.userCount}`);
        console.log(`     Active sessions: ${health.activeSessions}`);
      }
      
      if (providerInfo.name === 'auth0') {
        console.log(`     Domain: ${config.domain || 'Not configured'}`);
        console.log(`     Audience: ${config.audience || 'Not configured'}`);
      }
      
      if (providerInfo.name === 'clerk') {
        console.log(`     Publishable key: ${config.publishableKey ? 'Configured' : 'Not configured'}`);
        console.log(`     Has JWT key: ${health.hasJwtKey}`);
      }
    }
    
  } catch (error) {
    console.error('   ❌ Provider configuration test failed:', error.message);
  }
  
  console.log();
}

async function testCurrentUserRetrieval() {
  console.log('6️⃣ Testing Current User Retrieval:');
  
  try {
    // First authenticate to get a token
    const authResult = await authManager.authenticate({
      email: 'owner@agency.com',
      password: 'owner123'
    }, { provider: 'mock' });
    
    if (authResult.success) {
      console.log('   ✅ Authenticated successfully');
      
      // Test getCurrentUser with provider
      const userWithProvider = await authManager.getCurrentUser(authResult.tokens.accessToken, 'mock');
      if (userWithProvider) {
        console.log(`   ✅ getCurrentUser with provider: ${userWithProvider.name}`);
      }
      
      // Test getCurrentUser without provider (auto-detect)
      const userAutoDetect = await authManager.getCurrentUser(authResult.tokens.accessToken);
      if (userAutoDetect) {
        console.log(`   ✅ getCurrentUser auto-detect: ${userAutoDetect.name} (provider: ${userAutoDetect.provider})`);
      }
      
    } else {
      console.log('   ❌ Authentication failed for current user test');
    }
    
  } catch (error) {
    console.error('   ❌ Current user retrieval test failed:', error.message);
  }
  
  console.log();
}

async function testMockProviderFeatures() {
  console.log('7️⃣ Testing Mock Provider Features:');
  
  try {
    const mockProvider = authManager.getProvider('mock');
    
    if (mockProvider) {
      // Test user creation
      const registerResult = await mockProvider.register({
        email: 'newuser@test.com',
        password: 'test123',
        firstName: 'New',
        lastName: 'User'
      });
      
      if (registerResult.success) {
        console.log('   ✅ User registration successful');
        console.log(`     User ID: ${registerResult.user.id}`);
        
        // Test role simulation
        const roleSimulated = await mockProvider.simulateRole(registerResult.user.id, ['TRAVEL_AGENT']);
        console.log(`   ✅ Role simulation: ${roleSimulated ? 'SUCCESS' : 'FAILED'}`);
        
        // Test organization simulation
        const orgSimulated = await mockProvider.simulateOrganization(registerResult.user.id, 'test-org-123');
        console.log(`   ✅ Organization simulation: ${orgSimulated ? 'SUCCESS' : 'FAILED'}`);
        
        // Get all users
        const allUsers = mockProvider.getAllUsers();
        console.log(`   ✅ Total mock users: ${allUsers.length}`);
        
      } else {
        console.log('   ❌ User registration failed:', registerResult.error);
      }
    } else {
      console.log('   ❌ Mock provider not available');
    }
    
  } catch (error) {
    console.error('   ❌ Mock provider features test failed:', error.message);
  }
  
  console.log();
}

async function testHealthAndStatus() {
  console.log('8️⃣ Testing Health and Status:');
  
  try {
    const health = authManager.getHealthStatus();
    
    console.log('   AuthManager Health:');
    console.log(`     Status: ${health.status}`);
    console.log(`     Initialized: ${health.initialized}`);
    console.log(`     Default provider: ${health.defaultProvider}`);
    console.log(`     Total providers: ${health.totalProviders}`);
    console.log(`     Healthy providers: ${health.healthyProviders}`);
    
    console.log('   Provider Details:');
    Object.entries(health.providers).forEach(([name, providerHealth]) => {
      console.log(`     ${name}: ${providerHealth.status} (${providerHealth.provider})`);
    });
    
  } catch (error) {
    console.error('   ❌ Health status test failed:', error.message);
  }
  
  console.log();
}

// Run all tests
async function runAllTests() {
  try {
    await testProviderInitialization();
    await testMockProvider();
    await testAutoDetection();
    await testProviderFailover();
    await testProviderConfiguration();
    await testCurrentUserRetrieval();
    await testMockProviderFeatures();
    await testHealthAndStatus();
    
    console.log('🎉 All multi-provider authentication tests completed!');
    
    // Clean up
    await authManager.shutdown();
    console.log('✅ AuthManager shutdown completed');
    
  } catch (error) {
    console.error('❌ Multi-provider test suite failed:', error.message);
    console.error(error);
  }
}

runAllTests();