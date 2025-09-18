#!/usr/bin/env node
/**
 * Quick Patch Script for Credit System
 * Applies immediate fixes to get the system working
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.join(__dirname, '..');

console.log('🚀 Applying Quick Patches for Credit System\n');

// Patch 1: Update .env to disable credits temporarily
function patchEnvFile() {
  console.log('1. Patching .env file...');
  const envPath = path.join(serverDir, '.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Add or update CREDITS_ENABLED
    if (envContent.includes('CREDITS_ENABLED=')) {
      envContent = envContent.replace(/CREDITS_ENABLED=.*/g, 'CREDITS_ENABLED=false');
    } else {
      envContent += '\n# Temporary credit system bypass\nCREDITS_ENABLED=false\n';
    }
    
    // Add mock auth if not present
    if (!envContent.includes('MOCK_AUTH=')) {
      envContent += '\n# Mock authentication for development\nMOCK_AUTH=true\n';
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env patched with CREDITS_ENABLED=false and MOCK_AUTH=true\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to patch .env:', error.message);
    return false;
  }
}

// Patch 2: Create a bypass middleware
function createBypassMiddleware() {
  console.log('2. Creating bypass middleware...');
  
  const bypassCode = `/**
 * Temporary Bypass Middleware
 * Allows requests to proceed without credit checks
 */

export function bypassCredits(operation) {
  return async (req, res, next) => {
    console.log(\`⚠️ Credits bypassed for operation: \${operation}\`);
    next();
  };
}

export const requireCredits = bypassCredits;
`;

  try {
    const bypassPath = path.join(serverDir, 'middleware', 'creditsMiddleware.bypass.js');
    fs.writeFileSync(bypassPath, bypassCode);
    console.log('✅ Bypass middleware created at middleware/creditsMiddleware.bypass.js\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to create bypass middleware:', error.message);
    return false;
  }
}

// Patch 3: Update creditSystem.js to always return default credits
function patchCreditSystem() {
  console.log('3. Patching creditSystem.js...');
  
  const creditSystemPath = path.join(serverDir, 'services', 'creditSystem.js');
  
  try {
    // Create backup
    const backupPath = creditSystemPath + '.original';
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(creditSystemPath, backupPath);
      console.log('   Backup created at creditSystem.js.original');
    }
    
    let content = fs.readFileSync(creditSystemPath, 'utf8');
    
    // Find getUserCredits method and add early return
    const getUserCreditsStart = content.indexOf('async getUserCredits(userId) {');
    if (getUserCreditsStart !== -1) {
      const methodEnd = content.indexOf('try {', getUserCreditsStart);
      if (methodEnd !== -1) {
        const earlyReturn = `
    // TEMPORARY PATCH: Return default credits without database
    if (process.env.CREDITS_ENABLED === 'false') {
      return {
        success: true,
        data: {
          user_id: userId,
          total_credits: 5000,
          used_credits: 0,
          bonus_credits: 0,
          available_credits: 5000,
          percentage_used: 0,
          plan_type: 'agent',
          is_organization_pool: false,
          last_reset_date: new Date().toISOString()
        }
      };
    }
    `;
        
        content = content.slice(0, methodEnd + 6) + earlyReturn + content.slice(methodEnd + 6);
        fs.writeFileSync(creditSystemPath, content);
        console.log('✅ creditSystem.js patched with bypass logic\n');
        return true;
      }
    }
    
    console.log('⚠️  Could not patch creditSystem.js - method structure different than expected\n');
    return false;
  } catch (error) {
    console.error('❌ Failed to patch creditSystem.js:', error.message);
    return false;
  }
}

// Patch 4: Create test endpoint
function createTestEndpoint() {
  console.log('4. Creating test endpoint...');
  
  const testEndpointCode = `/**
 * Test endpoint for credit system
 */

import express from 'express';
const router = express.Router();

// Simple test endpoint that bypasses all middleware
router.post('/test', async (req, res) => {
  const { message } = req.body;
  
  res.json({
    success: true,
    response: \`Test response for: \${message || 'no message'}\`,
    credits: {
      bypassed: true,
      reason: 'CREDITS_ENABLED=false'
    },
    timestamp: new Date().toISOString()
  });
});

// Credit status endpoint
router.get('/status', async (req, res) => {
  res.json({
    creditsEnabled: process.env.CREDITS_ENABLED !== 'false',
    mockAuth: process.env.MOCK_AUTH === 'true',
    supabaseConfigured: !!process.env.SUPABASE_URL,
    timestamp: new Date().toISOString()
  });
});

export default router;
`;

  try {
    const testPath = path.join(serverDir, 'routes', 'testChat.js');
    fs.writeFileSync(testPath, testEndpointCode);
    console.log('✅ Test endpoint created at routes/testChat.js');
    console.log('   Available at: POST /api/chat/test and GET /api/chat/status\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to create test endpoint:', error.message);
    return false;
  }
}

// Run all patches
async function runPatches() {
  const results = {
    env: patchEnvFile(),
    bypass: createBypassMiddleware(),
    creditSystem: patchCreditSystem(),
    testEndpoint: createTestEndpoint()
  };
  
  console.log('=' + '='.repeat(59));
  console.log('PATCH SUMMARY');
  console.log('=' + '='.repeat(59));
  
  const successful = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  if (successful === total) {
    console.log('✅ All patches applied successfully!\n');
    console.log('Next steps:');
    console.log('1. Restart the server: npm run dev');
    console.log('2. Test the chat endpoint - it should work without credits');
    console.log('3. To re-enable credits later:');
    console.log('   - Run the migration in Supabase');
    console.log('   - Set CREDITS_ENABLED=true in .env');
    console.log('   - Restart the server\n');
  } else {
    console.log(\`⚠️  \${successful}/\${total} patches applied\n\`);
    console.log('Some patches failed. Check the errors above.');
  }
  
  // Show current configuration
  console.log('\nCurrent Configuration:');
  console.log('- Credits: DISABLED (requests will proceed without credit checks)');
  console.log('- Authentication: MOCK (using default user/org)');
  console.log('- Database: Optional (will work without Supabase)');
}

// Execute patches
runPatches().catch(error => {
  console.error('💥 Patch script failed:', error);
  process.exit(1);
});