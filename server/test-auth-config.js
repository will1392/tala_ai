#!/usr/bin/env node

/**
 * Test authentication configuration
 */

import { getAuthConfig, validateAuthConfig, getEnabledProviders, isProviderEnabled } from './config/auth.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('⚙️ Testing Authentication Configuration...\n');

function testAuthConfig() {
  try {
    // Test getting configuration
    console.log('1️⃣ Testing configuration loading...');
    const config = getAuthConfig();
    console.log('✅ Configuration loaded successfully');
    console.log('   Default provider:', config.global.defaultProvider);
    console.log('   Multi-provider:', config.global.multiProvider);
    console.log('   Local enabled:', config.local.enabled);
    console.log('   Auth0 enabled:', config.auth0.enabled);
    console.log('   Clerk enabled:', config.clerk.enabled);
    console.log();

    // Test configuration validation
    console.log('2️⃣ Testing configuration validation...');
    const validationErrors = validateAuthConfig(config);
    
    if (validationErrors.length === 0) {
      console.log('✅ Configuration is valid');
    } else {
      console.log('⚠️  Configuration validation warnings/errors:');
      validationErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    console.log();

    // Test provider utilities
    console.log('3️⃣ Testing provider utilities...');
    console.log('   Enabled providers:', getEnabledProviders());
    console.log('   Local provider enabled:', isProviderEnabled('local'));
    console.log('   Auth0 provider enabled:', isProviderEnabled('auth0'));
    console.log('   Clerk provider enabled:', isProviderEnabled('clerk'));
    console.log();

    // Test specific configurations
    console.log('4️⃣ Testing specific provider configurations...');
    
    if (config.local.enabled) {
      console.log('   Local Provider Settings:');
      console.log('     - JWT Secret length:', config.local.jwtSecret.length);
      console.log('     - JWT Expires In:', config.local.jwtExpiresIn);
      console.log('     - BCrypt Rounds:', config.local.bcryptRounds);
      console.log('     - Min Password Length:', config.local.minPasswordLength);
      console.log('     - Require Email Verification:', config.local.requireEmailVerification);
      console.log('     - Max Failed Attempts:', config.local.maxFailedAttempts);
    }
    
    console.log('   Session Settings:');
    console.log('     - Session Secret length:', config.global.session.secret.length);
    console.log('     - Session Max Age:', config.global.session.maxAge);
    console.log('     - Secure:', config.global.session.secure);
    console.log();

    // Test security settings
    console.log('5️⃣ Testing security settings...');
    console.log('   Security Configuration:');
    console.log('     - Require Email Verification:', config.global.security.requireEmailVerification);
    console.log('     - Enable Account Lockout:', config.global.security.enableAccountLockout);
    console.log('     - Max Failed Attempts:', config.global.security.maxFailedAttempts);
    console.log('     - Lockout Duration:', config.global.security.lockoutDuration, 'ms');
    console.log('     - Password Reset Expiry:', config.global.security.passwordResetExpiry, 'ms');
    console.log();

    // Test rate limiting settings
    console.log('6️⃣ Testing rate limiting settings...');
    console.log('   Rate Limiting Configuration:');
    console.log('     - Window (ms):', config.global.rateLimiting.windowMs);
    console.log('     - Max Attempts:', config.global.rateLimiting.maxAttempts);
    console.log('     - Skip Successful Requests:', config.global.rateLimiting.skipSuccessfulRequests);
    console.log();

    // Test email configuration
    console.log('7️⃣ Testing email configuration...');
    console.log('   Email Service:', config.email.service);
    if (config.email.smtp.host) {
      console.log('   SMTP Configuration:');
      console.log('     - Host:', config.email.smtp.host);
      console.log('     - Port:', config.email.smtp.port);
      console.log('     - Secure:', config.email.smtp.secure);
    }
    console.log('   Email Templates:');
    console.log('     - Verification Subject:', config.email.templates.verification.subject);
    console.log('     - Password Reset Subject:', config.email.templates.passwordReset.subject);
    console.log('     - Welcome Subject:', config.email.templates.welcomeEmail.subject);
    console.log();

    console.log('🎉 All configuration tests completed successfully!');

  } catch (error) {
    console.error('❌ Configuration test failed:', error.message);
    console.error(error);
  }
}

// Run tests
testAuthConfig();