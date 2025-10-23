/**
 * Credit Pricing Calculator
 * 
 * Calculates credit costs based on real API pricing with 20% markup
 * 
 * Assumptions for typical chat message:
 * - Input: ~500 tokens (user message + context)
 * - Output: ~300 tokens (AI response)
 * - Total: ~800 tokens per exchange
 */

import { LLM_MODELS } from './llm/config.js';

// Typical token usage per operation
const TYPICAL_TOKEN_USAGE = {
  chat_message: {
    input: 500,   // User message + context
    output: 300   // AI response
  },
  document_upload: {
    input: 2000,  // Document processing
    output: 500   // Summary/analysis
  },
  document_search: {
    input: 200,   // Query + metadata
    output: 100   // Search results
  },
  document_analyze: {
    input: 3000,  // Full document
    output: 1000  // Detailed analysis
  },
  image_analysis: {
    input: 1000,  // Image + prompt
    output: 500   // Description
  }
};

// Markup percentage (20% = 1.2x)
const MARKUP_MULTIPLIER = 1.2;

// Credit value: 1 credit = $0.001 (so 1000 credits = $1)
const CREDIT_VALUE = 0.001;

/**
 * Calculate credit cost for an operation with a specific model
 */
export function calculateCreditCost(operation, modelId) {
  // Get token usage for operation
  const tokenUsage = TYPICAL_TOKEN_USAGE[operation];
  if (!tokenUsage) {
    console.warn(`Unknown operation: ${operation}, using default`);
    return 30; // Default fallback
  }

  // Get model pricing
  const model = LLM_MODELS[modelId];
  if (!model || !model.pricing) {
    console.warn(`Unknown model: ${modelId}, using default`);
    return 30; // Default fallback
  }

  // Calculate API cost in dollars
  const inputCost = (tokenUsage.input / 1000) * model.pricing.input;
  const outputCost = (tokenUsage.output / 1000) * model.pricing.output;
  const totalApiCost = inputCost + outputCost;

  // Apply 20% markup
  const costWithMarkup = totalApiCost * MARKUP_MULTIPLIER;

  // Convert to credits (divide by credit value and round up)
  const credits = Math.ceil(costWithMarkup / CREDIT_VALUE);

  return credits;
}

/**
 * Generate CREDIT_COSTS object with 20% markup for all models
 */
export function generateCreditCosts() {
  const costs = {
    // Chat Operations (by model)
    chat_message: {}
  };

  // Calculate for each model
  const chatModels = [
    'gpt-4o-mini',
    'gpt-5-nano-2025-08-07',
    'gpt-5-mini-2025-08-07',
    'gpt-5-2025-08-07',
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514'
  ];

  for (const modelId of chatModels) {
    const model = LLM_MODELS[modelId];
    if (model && model.pricing) {
      costs.chat_message[modelId] = calculateCreditCost('chat_message', modelId);
    }
  }

  // Add friendly aliases
  costs.chat_message['gpt-4o'] = costs.chat_message['gpt-5-2025-08-07'] || 200;
  costs.chat_message['claude-3-5-haiku'] = costs.chat_message['gpt-4o-mini'] || 1; // Similar pricing
  costs.chat_message['claude-3-5-sonnet'] = costs.chat_message['claude-sonnet-4-20250514'] || 8;
  costs.chat_message['default'] = 30;

  // Document Operations (using GPT-4o-mini as baseline)
  costs.document_upload = calculateCreditCost('document_upload', 'gpt-4o-mini');
  costs.document_search = calculateCreditCost('document_search', 'gpt-4o-mini');
  costs.document_analyze = calculateCreditCost('document_analyze', 'gpt-4o-mini');
  costs.document_extract = Math.ceil(costs.document_analyze * 0.8); // Slightly less than full analysis

  // Voice Operations (using Whisper-equivalent pricing: ~$0.006/minute)
  costs.voice_transcription_per_minute = Math.ceil((0.006 * MARKUP_MULTIPLIER) / CREDIT_VALUE); // 8 credits
  costs.voice_to_document = Math.ceil((0.03 * MARKUP_MULTIPLIER) / CREDIT_VALUE); // ~36 credits for 5 min

  // Email Operations
  costs.email_parse = calculateCreditCost('document_search', 'gpt-4o-mini'); // Similar to search
  costs.email_batch_process = costs.email_parse * 10; // 10 emails
  costs.email_task_extraction = calculateCreditCost('document_analyze', 'gpt-4o-mini') * 0.5;

  // Advanced Features
  costs.image_analysis = calculateCreditCost('image_analysis', 'gpt-4o-mini');
  costs.multi_agent_task = costs.chat_message['claude-sonnet-4-20250514'] * 3; // 3 model calls
  costs.document_translation = calculateCreditCost('document_analyze', 'gpt-4o-mini') * 1.5;

  // Bulk Operations
  costs.bulk_document_process = costs.document_analyze * 5; // 5 documents
  costs.knowledge_base_search = calculateCreditCost('document_search', 'gpt-4o-mini');

  return costs;
}

/**
 * Display credit costs summary
 */
export function displayCreditCostsSummary() {
  const costs = generateCreditCosts();
  
  console.log('\n💰 CREDIT COSTS WITH 20% MARKUP:');
  console.log('================================\n');
  
  console.log('Chat Messages (by model):');
  Object.entries(costs.chat_message).forEach(([model, cost]) => {
    const modelInfo = LLM_MODELS[model];
    const apiCost = modelInfo?.pricing 
      ? ((500/1000 * modelInfo.pricing.input) + (300/1000 * modelInfo.pricing.output))
      : null;
    const markup = apiCost ? (cost * CREDIT_VALUE - apiCost) : null;
    
    console.log(`  ${model.padEnd(30)} = ${cost.toString().padStart(4)} credits` + 
                (apiCost ? ` (API: $${apiCost.toFixed(4)}, You charge: $${(cost * CREDIT_VALUE).toFixed(4)}, Profit: $${markup?.toFixed(4)})` : ''));
  });
  
  console.log('\nDocument Operations:');
  console.log(`  Upload:      ${costs.document_upload} credits`);
  console.log(`  Search:      ${costs.document_search} credits`);
  console.log(`  Analyze:     ${costs.document_analyze} credits`);
  console.log(`  Extract:     ${costs.document_extract} credits`);
  
  console.log('\nVoice Operations:');
  console.log(`  Transcription (per min): ${costs.voice_transcription_per_minute} credits`);
  console.log(`  Voice to Document:       ${costs.voice_to_document} credits`);
  
  console.log('\n1000 credits = $1.00 (user pays)');
  console.log('20% markup means you keep $0.20 per $1.00 spent\n');
  
  return costs;
}

// Export for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  displayCreditCostsSummary();
}
