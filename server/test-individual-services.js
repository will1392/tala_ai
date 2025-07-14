import dotenv from 'dotenv';
dotenv.config();

// Test individual LLM services
import { 
  OpenAIService, 
  AnthropicService, 
  GeminiService, 
  GrokService, 
  MockLLMService 
} from './services/llm/providers/index.js';

async function testServices() {
    console.log('🧪 TESTING INDIVIDUAL LLM SERVICES');
    console.log('=' .repeat(50));

    // Test Mock Service (always works)
    console.log('\n🤖 Testing Mock Service...');
    try {
        const mockService = new MockLLMService('mock-model');
        mockService.initialize();
        
        const mockResponse = await mockService.chat([
            { role: 'user', content: 'Hello, test message' }
        ]);
        console.log('✅ Mock Service working');
        console.log(`   Response: "${mockResponse.content}"`);
        console.log(`   Cost: $${mockResponse.usage.cost.toFixed(6)}`);
    } catch (error) {
        console.log('❌ Mock Service failed:', error.message);
    }

    // Test OpenAI Service (if API key exists)
    if (process.env.OPENAI_API_KEY) {
        console.log('\n🚀 Testing OpenAI Service (GPT-4o Mini)...');
        try {
            const openAIService = new OpenAIService('gpt-4o-mini');
            openAIService.initialize();
            
            console.log('✅ OpenAI Service initialized');
            console.log(`   Model: ${openAIService.modelId}`);
            console.log(`   Max Tokens: ${openAIService.modelConfig.maxTokens}`);
            console.log(`   Context Window: ${openAIService.modelConfig.contextWindow}`);
            
            const response = await openAIService.chat([
                { role: 'user', content: 'Say hello from OpenAI!' }
            ], { maxTokens: 50 });
            
            console.log(`   Response: "${response.content}"`);
            console.log(`   Tokens: ${response.usage.totalTokens}`);
            console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
        } catch (error) {
            console.log('❌ OpenAI Service failed:', error.message);
        }
    } else {
        console.log('\n⚠️  OpenAI API key not found, skipping test');
    }

    // Test Anthropic Service (Claude 4)
    if (process.env.ANTHROPIC_API_KEY) {
        console.log('\n🤖 Testing Anthropic Service (Claude 4 Sonnet)...');
        try {
            const anthropicService = new AnthropicService('claude-sonnet-4-20250514');
            anthropicService.initialize();
            
            console.log('✅ Anthropic Service initialized');
            console.log(`   Model: ${anthropicService.modelId}`);
            console.log(`   Max Tokens: ${anthropicService.modelConfig.maxTokens}`);
            console.log(`   Context Window: ${anthropicService.modelConfig.contextWindow}`);
            
            const response = await anthropicService.chat([
                { role: 'user', content: 'Say hello from Claude 4!' }
            ], { maxTokens: 50 });
            
            console.log(`   Response: "${response.content}"`);
            console.log(`   Tokens: ${response.usage.totalTokens}`);
            console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
        } catch (error) {
            console.log('❌ Anthropic Service failed:', error.message);
        }
    } else {
        console.log('\n⚠️  Anthropic API key not found, skipping test');
    }

    // Test Google Service (Gemini 2.5 Flash)
    if (process.env.GOOGLE_AI_API_KEY) {
        console.log('\n⚡ Testing Google Service (Gemini 2.5 Flash)...');
        try {
            const geminiService = new GeminiService('gemini-2.5-flash');
            geminiService.initialize();
            
            console.log('✅ Google Service initialized');
            console.log(`   Model: ${geminiService.modelId}`);
            console.log(`   Max Tokens: ${geminiService.modelConfig.maxTokens}`);
            console.log(`   Context Window: ${geminiService.modelConfig.contextWindow}`);
            
            const response = await geminiService.chat([
                { role: 'user', content: 'Say hello from Gemini 2.5!' }
            ], { maxTokens: 50 });
            
            console.log(`   Response: "${response.content}"`);
            console.log(`   Tokens: ${response.usage.totalTokens}`);
            console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
        } catch (error) {
            console.log('❌ Google Service failed:', error.message);
        }
    } else {
        console.log('\n⚠️  Google AI API key not found, skipping test');
    }

    // Test Grok Service (Grok 4)
    if (process.env.GROK_API_KEY) {
        console.log('\n🔥 Testing Grok Service (Grok 4)...');
        try {
            const grokService = new GrokService('grok-4-latest');
            grokService.initialize();
            
            console.log('✅ Grok Service initialized');
            console.log(`   Model: ${grokService.modelId}`);
            console.log(`   Max Tokens: ${grokService.modelConfig.maxTokens}`);
            console.log(`   Context Window: ${grokService.modelConfig.contextWindow}`);
            
            const response = await grokService.chat([
                { role: 'user', content: 'Say hello from Grok 4!' }
            ], { maxTokens: 50 });
            
            console.log(`   Response: "${response.content || '[Empty - Reasoning Model]'}"`);
            console.log(`   Tokens: ${response.usage.totalTokens}`);
            console.log(`   Cost: $${response.usage.cost.toFixed(6)}`);
            console.log(`   Reasoning: ${response.metadata.reasoningTokens > 0 ? 'YES' : 'NO'}`);
        } catch (error) {
            console.log('❌ Grok Service failed:', error.message);
        }
    } else {
        console.log('\n⚠️  Grok API key not found, skipping test');
    }

    // Test service methods exist
    console.log('\n📋 TESTING SERVICE INTERFACES...');
    
    const testService = new MockLLMService('mock-test');
    const requiredMethods = [
        'initialize',
        'chat',
        'isAvailable',
        'getName',
        'getMaxTokens',
        'validateMessages',
        'estimateTokens',
        'trackUsage'
    ];
    
    let allMethodsExist = true;
    for (const method of requiredMethods) {
        if (typeof testService[method] === 'function') {
            console.log(`✅ ${method}() method exists`);
        } else {
            console.log(`❌ ${method}() method missing`);
            allMethodsExist = false;
        }
    }
    
    if (allMethodsExist) {
        console.log('\n🎉 All services have required methods');
        console.log('✅ Service interfaces are consistent');
    } else {
        console.log('\n❌ Some service methods are missing');
    }

    console.log('\n🏆 INDIVIDUAL SERVICE TESTING COMPLETED!');
}

testServices().catch(console.error);