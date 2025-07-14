#!/usr/bin/env node

/**
 * Test AuthManager integration
 */

import authManager from './auth/AuthManager.js';
import { getAuthConfig } from './config/auth.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔐 Testing AuthManager Integration...\n');

async function testAuthManager() {
  try {
    // Get auth configuration
    const authConfig = getAuthConfig();
    
    console.log('1️⃣ Initializing AuthManager...');
    await authManager.initialize(authConfig);
    console.log('✅ AuthManager initialized successfully');
    console.log('   Available providers:', authManager.getAvailableProviders());
    console.log('   Default provider:', authConfig.global.defaultProvider);
    console.log();

    // Test user registration through AuthManager
    console.log('2️⃣ Testing user registration through AuthManager...');
    const registrationResult = await authManager.register({
      email: 'manager-test@example.com',
      password: 'Manager123!@#',
      firstName: 'Manager',
      lastName: 'Test'
    });

    if (registrationResult.success) {
      console.log('✅ User registered successfully via AuthManager');
      console.log('   User ID:', registrationResult.user.id);
      console.log('   Email:', registrationResult.user.email);
    } else {
      console.log('❌ Registration failed:', registrationResult.error);
    }
    console.log();

    // Test authentication through AuthManager
    console.log('3️⃣ Testing authentication through AuthManager...');
    const authResult = await authManager.authenticate({
      email: 'manager-test@example.com',
      password: 'Manager123!@#'
    }, {
      ip: '127.0.0.1',
      userAgent: 'test-script'
    });

    let accessToken = null;
    let refreshToken = null;

    if (authResult.success) {
      console.log('✅ Authentication successful via AuthManager');
      console.log('   User ID:', authResult.user.id);
      console.log('   Access Token:', authResult.tokens.accessToken.substring(0, 50) + '...');
      accessToken = authResult.tokens.accessToken;
      refreshToken = authResult.tokens.refreshToken;
    } else {
      console.log('❌ Authentication failed:', authResult.error);
    }
    console.log();

    // Test token validation through AuthManager
    if (accessToken) {
      console.log('4️⃣ Testing token validation through AuthManager...');
      const validationResult = await authManager.validateToken(accessToken);
      
      if (validationResult.valid) {
        console.log('✅ Token validated successfully');
        console.log('   User ID:', validationResult.user.id);
        console.log('   Email:', validationResult.user.email);
      } else {
        console.log('❌ Token validation failed:', validationResult.error);
      }
      console.log();
    }

    // Test token refresh
    if (refreshToken) {
      console.log('5️⃣ Testing token refresh...');
      const refreshResult = await authManager.refresh(refreshToken);
      
      if (refreshResult.success) {
        console.log('✅ Token refreshed successfully');
        console.log('   New Access Token:', refreshResult.tokens.accessToken.substring(0, 50) + '...');
      } else {
        console.log('❌ Token refresh failed:', refreshResult.error);
      }
      console.log();
    }

    // Test middleware functionality
    console.log('6️⃣ Testing middleware functionality...');
    const middleware = authManager.middleware({ required: true });
    console.log('✅ Middleware created successfully');
    console.log('   Type:', typeof middleware);
    console.log('   Length:', middleware.length);
    console.log();

    // Test health status
    console.log('7️⃣ Getting AuthManager health status...');
    const healthStatus = authManager.getHealthStatus();
    console.log('✅ Health Status:');
    console.log('   Status:', healthStatus.status);
    console.log('   Initialized:', healthStatus.initialized);
    console.log('   Default Provider:', healthStatus.defaultProvider);
    console.log('   Total Providers:', healthStatus.totalProviders);
    console.log('   Healthy Providers:', healthStatus.healthyProviders);
    
    if (healthStatus.providers.local) {
      console.log('   Local Provider:');
      console.log('     - Status:', healthStatus.providers.local.status);
      console.log('     - User Count:', healthStatus.providers.local.userCount);
      console.log('     - Active Tokens:', healthStatus.providers.local.activeTokens);
    }

    console.log('\n🎉 All AuthManager tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Run tests
testAuthManager();