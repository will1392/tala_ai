#!/usr/bin/env node

/**
 * Test authentication system - JWT generation and validation
 */

import LocalAuthProvider from './auth/providers/LocalAuthProvider.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔐 Testing Authentication System...\n');

async function testAuthSystem() {
  try {
    // Create provider with test configuration
    const authConfig = {
      jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret-for-testing',
      jwtExpiresIn: '1h',
      refreshTokenExpiresIn: '7d',
      bcryptRounds: 10,
      requireEmailVerification: false,
      createDefaultAdmin: true,
      defaultAdminEmail: 'admin@test.com',
      defaultAdminPassword: 'Admin123!'
    };

    console.log('1️⃣ Initializing LocalAuthProvider...');
    const authProvider = new LocalAuthProvider(authConfig);
    await authProvider.initialize();
    console.log('✅ Provider initialized successfully\n');

    // Test user registration
    console.log('2️⃣ Testing user registration...');
    const registrationResult = await authProvider.register({
      email: 'test@example.com',
      password: 'Test123!@#',
      firstName: 'Test',
      lastName: 'User'
    });

    if (registrationResult.success) {
      console.log('✅ User registered successfully');
      console.log('   User ID:', registrationResult.user.id);
      console.log('   Email:', registrationResult.user.email);
      console.log('   Roles:', registrationResult.user.roles);
    } else {
      console.log('❌ Registration failed:', registrationResult.error);
    }
    console.log();

    // Test authentication
    console.log('3️⃣ Testing authentication...');
    const authResult = await authProvider.authenticate({
      email: 'test@example.com',
      password: 'Test123!@#'
    });

    if (authResult.success) {
      console.log('✅ Authentication successful');
      console.log('   Access Token:', authResult.tokens.accessToken.substring(0, 50) + '...');
      console.log('   Refresh Token:', authResult.tokens.refreshToken.substring(0, 20) + '...');
      console.log('   Expires In:', authResult.tokens.expiresIn);
      
      // Test token validation
      console.log('\n4️⃣ Testing token validation...');
      const validationResult = await authProvider.validateToken(authResult.tokens.accessToken);
      
      if (validationResult.valid) {
        console.log('✅ Token is valid');
        console.log('   User ID:', validationResult.decoded.userId);
        console.log('   Email:', validationResult.decoded.email);
        console.log('   Roles:', validationResult.decoded.roles);
      } else {
        console.log('❌ Token validation failed:', validationResult.error);
      }
    } else {
      console.log('❌ Authentication failed:', authResult.error);
    }
    console.log();

    // Test invalid credentials
    console.log('5️⃣ Testing invalid credentials...');
    const invalidAuthResult = await authProvider.authenticate({
      email: 'test@example.com',
      password: 'WrongPassword'
    });

    if (!invalidAuthResult.success) {
      console.log('✅ Correctly rejected invalid credentials');
      console.log('   Error:', invalidAuthResult.error);
      console.log('   Code:', invalidAuthResult.code);
    } else {
      console.log('❌ Security issue: Invalid credentials were accepted');
    }
    console.log();

    // Test admin authentication
    console.log('6️⃣ Testing admin authentication...');
    const adminAuthResult = await authProvider.authenticate({
      email: 'admin@test.com',
      password: 'Admin123!'
    });

    if (adminAuthResult.success) {
      console.log('✅ Admin authentication successful');
      console.log('   Roles:', adminAuthResult.user.roles);
    } else {
      console.log('❌ Admin authentication failed:', adminAuthResult.error);
    }
    console.log();

    // Test health status
    console.log('7️⃣ Getting provider health status...');
    const healthStatus = authProvider.getHealthStatus();
    console.log('✅ Health Status:');
    console.log('   Provider:', healthStatus.provider);
    console.log('   Status:', healthStatus.status);
    console.log('   User Count:', healthStatus.userCount);
    console.log('   Active Tokens:', healthStatus.activeTokens);

    console.log('\n🎉 All authentication tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Run tests
testAuthSystem();