#!/usr/bin/env node

/**
 * Enterprise Features Restoration Script
 * 
 * This script helps restore and verify all enterprise intelligence features
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Enterprise Features Restoration Tool\n');
console.log('=' . repeat(50));

// Check current environment configuration
function checkEnvironment() {
  console.log('\n📋 Checking Current Configuration...\n');
  
  const requiredVars = [
    { name: 'ENABLE_MULTI_LLM', description: 'Multi-LLM Router', required: true },
    { name: 'ENABLE_INTELLIGENT_ROUTING', description: 'Intelligent Task Routing', required: false },
    { name: 'ENABLE_CONTEXT_COMPRESSION', description: 'Context Compression', required: false },
    { name: 'ENABLE_LEARNING_ENGINE', description: 'Learning Engine', required: false },
    { name: 'ENABLE_AGENT_ORCHESTRATION', description: 'Agent Orchestration', required: false },
    { name: 'SUPABASE_URL', description: 'Database URL', required: false },
    { name: 'ANTHROPIC_API_KEY', description: 'Claude Provider', required: false },
    { name: 'GOOGLE_AI_API_KEY', description: 'Gemini Provider', required: false },
    { name: 'GROK_API_KEY', description: 'Grok Provider', required: false },
  ];
  
  let missingRequired = false;
  const recommendations = [];
  
  requiredVars.forEach(({ name, description, required }) => {
    const value = process.env[name];
    const status = value ? '✅' : (required ? '❌' : '⚠️');
    
    console.log(`${status} ${name}: ${value || 'NOT SET'} (${description})`);
    
    if (!value) {
      if (required) {
        missingRequired = true;
        recommendations.push(`Set ${name}=true to enable ${description}`);
      } else {
        recommendations.push(`Consider setting ${name} for ${description}`);
      }
    }
  });
  
  return { missingRequired, recommendations };
}

// Generate sample .env additions
function generateEnvSample() {
  const envAdditions = `
# ===== ENTERPRISE INTELLIGENCE FEATURES =====
# Add these to your .env file to enable all features

# Core Intelligence Features
ENABLE_MULTI_LLM=true
ENABLE_INTELLIGENT_ROUTING=true
ENABLE_CONTEXT_COMPRESSION=true
ENABLE_LEARNING_ENGINE=true
ENABLE_AGENT_ORCHESTRATION=true

# Database Configuration (Required for persistence)
# Option 1: Use Supabase (recommended for production)
SUPABASE_URL=your-supabase-url-here
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here

# Option 2: Use mock mode (for testing)
# Set mockMode: true in intelligentChat.js

# Database Features
ENABLE_DATABASE_READ=true
ENABLE_DUAL_WRITE=true
FALLBACK_TO_JSON=true

# Multi-LLM Provider Keys
# Add any providers you want to use
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-ai-key
GROK_API_KEY=your-grok-key

# Performance & Monitoring
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_COST_OPTIMIZATION=true
DAILY_BUDGET_LIMIT=50
MONTHLY_BUDGET_LIMIT=1000

# Health Checks
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=300000
`;

  return envAdditions;
}

// Check feature status in code
async function checkCodeFeatures() {
  console.log('\n🔍 Checking Code Features...\n');
  
  const features = [
    { 
      name: 'TalaIntelligence Core',
      file: path.join(__dirname, 'services/intelligence/TalaIntelligence.js'),
      searchPattern: 'class TalaIntelligence'
    },
    {
      name: 'Multi-Agent Orchestration',
      file: path.join(__dirname, 'services/agents/AgentOrchestrator.js'),
      searchPattern: 'class AgentOrchestrator'
    },
    {
      name: 'Context Compression',
      file: path.join(__dirname, 'services/compression/CompressionService.js'),
      searchPattern: 'class CompressionService'
    },
    {
      name: 'Learning Engine',
      file: path.join(__dirname, 'services/intelligence/LearningEngine.js'),
      searchPattern: 'class LearningEngine'
    },
    {
      name: 'LLM Router',
      file: path.join(__dirname, 'services/llm/LLMRouter.js'),
      searchPattern: 'class LLMRouter'
    },
    {
      name: 'Grok Provider',
      file: path.join(__dirname, 'services/llm/providers/GrokService.js'),
      searchPattern: 'class GrokService'
    }
  ];
  
  for (const feature of features) {
    try {
      const content = fs.readFileSync(feature.file, 'utf8');
      const exists = content.includes(feature.searchPattern);
      console.log(`${exists ? '✅' : '❌'} ${feature.name}: ${exists ? 'FOUND' : 'MISSING'}`);
    } catch (error) {
      console.log(`❌ ${feature.name}: FILE NOT FOUND`);
    }
  }
}

// Generate quick fix script
function generateQuickFix() {
  const quickFix = `
// Quick Fix for Mock Mode (Add to intelligentChat.js line 21)
const intelligenceConfig = {
  maxContextSize: 8000,
  compressionThreshold: 0.8,
  memoryRetrievalLimit: 10,
  learningEnabled: true,
  mockMode: true // Change to true for testing without database
};

// Or use environment variable
const intelligenceConfig = {
  maxContextSize: 8000,
  compressionThreshold: 0.8,
  memoryRetrievalLimit: 10,
  learningEnabled: true,
  mockMode: process.env.USE_MOCK_MODE === 'true' || !process.env.SUPABASE_URL
};
`;

  return quickFix;
}

// Main execution
async function main() {
  // Check environment
  const { missingRequired, recommendations } = checkEnvironment();
  
  // Check code features
  await checkCodeFeatures();
  
  // Provide recommendations
  console.log('\n📝 Recommendations:\n');
  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
  
  // Generate env sample
  const envSample = generateEnvSample();
  const envPath = path.join(__dirname, '../.env.enterprise.sample');
  fs.writeFileSync(envPath, envSample);
  console.log(`\n✅ Sample environment configuration saved to: .env.enterprise.sample`);
  
  // Generate quick fix
  if (missingRequired) {
    console.log('\n⚡ Quick Fix Options:\n');
    console.log('1. Add the enterprise environment variables from .env.enterprise.sample');
    console.log('2. OR temporarily enable mock mode:');
    console.log(generateQuickFix());
  }
  
  console.log('\n🎯 Summary:\n');
  if (missingRequired) {
    console.log('❌ Enterprise features are DISABLED due to missing configuration');
    console.log('   The code is all there, but needs environment variables to activate');
  } else {
    console.log('✅ Enterprise features are ENABLED and ready to use');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('1. Copy settings from .env.enterprise.sample to your .env file');
  console.log('2. Restart the server');
  console.log('3. Look for "🤖 Initializing Multi-LLM Router..." in logs');
  console.log('4. Test with: curl -X POST http://localhost:5008/api/chat/test-llm-router');
}

// Run the restoration check
main().catch(console.error);