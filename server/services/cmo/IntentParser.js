/**
 * IntentParser - Lightweight LLM-based intent extraction for ambiguous inputs
 * 
 * Uses gpt-4o-mini to parse user intent when pattern matching fails.
 * This provides flexibility without sacrificing speed for clear inputs.
 */

import llmManager from '../llm/LLMManager.js';

class IntentParser {
  constructor() {
    this.llmManager = llmManager;
  }

  /**
   * Parse ambiguous user input into structured intent
   * @param {string} userInput - Raw user message
   * @param {string} context - Conversation context (e.g., 'travel_type_selection')
   * @returns {object} Parsed intent object
   */
  async parseIntent(userInput, context = 'general') {
    const startTime = Date.now();
    
    try {
      const systemPrompt = this.getSystemPrompt(context);
      const userPrompt = this.getUserPrompt(userInput, context);
      
      const response = await this.llmManager.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.1, // Low temperature for consistent parsing
        max_tokens: 200,
        response_format: { type: 'json_object' }
      });

      const parsed = JSON.parse(response.content);
      
      console.log(`🧠 Intent parsed in ${Date.now() - startTime}ms:`, parsed);
      return this.validateAndNormalize(parsed, context);
      
    } catch (error) {
      console.error('❌ Intent parsing failed:', error.message);
      return this.getDefaultIntent(context);
    }
  }

  /**
   * Get system prompt based on context
   */
  getSystemPrompt(context) {
    const basePrompt = `You are an intent parser for a travel agency postcard campaign assistant. 
Extract structured information from user messages. Be precise and conservative - only extract information that is clearly stated.
Return JSON only.`;

    const contextPrompts = {
      travel_type_selection: `${basePrompt}
Focus on identifying the type of travel being discussed. Common types include:
- Cruises (river, ocean, expedition, luxury)
- Hotels/Resorts (all-inclusive, luxury, boutique)
- Tours (escorted, adventure, cultural)
- Specialty (safari, yacht, private jet)`,

      audience_definition: `${basePrompt}
Focus on identifying the target audience. Look for:
- Demographics (age, income level)
- Travel preferences (luxury, budget, adventure)
- Geographic location
- Client type (past clients, new prospects)`,

      general: basePrompt
    };

    return contextPrompts[context] || contextPrompts.general;
  }

  /**
   * Get user prompt with structured output format
   */
  getUserPrompt(userInput, context) {
    const prompts = {
      travel_type_selection: `Parse this message about travel type:
"${userInput}"

Return JSON with these fields:
{
  "travel_type": "specific type or null",
  "is_luxury": boolean,
  "needs_clarification": boolean,
  "detected_keywords": ["keyword1", "keyword2"],
  "confidence": 0.0-1.0
}

Examples:
"lux travel" → {"travel_type": "luxury", "is_luxury": true, "needs_clarification": true, "detected_keywords": ["lux"], "confidence": 0.7}
"upscale Mediterranean cruises" → {"travel_type": "cruise", "is_luxury": true, "needs_clarification": false, "detected_keywords": ["upscale", "mediterranean", "cruises"], "confidence": 0.9}`,

      audience_definition: `Parse this message about target audience:
"${userInput}"

Return JSON with these fields:
{
  "audience_type": "type or null",
  "income_level": "high/medium/low/unknown",
  "age_range": "range or null",
  "location": "location or null",
  "is_past_clients": boolean,
  "confidence": 0.0-1.0
}`,

      general: `Parse this message:
"${userInput}"

Return JSON with:
{
  "intent": "primary intent",
  "entities": {"key": "value"},
  "confidence": 0.0-1.0
}`
    };

    return prompts[context] || prompts.general;
  }

  /**
   * Validate and normalize parsed intent
   */
  validateAndNormalize(parsed, context) {
    // Ensure required fields exist
    if (!parsed.confidence) {
      parsed.confidence = 0.5;
    }

    // Context-specific validation
    if (context === 'travel_type_selection') {
      // Normalize travel types
      const typeMap = {
        'luxury': 'luxury travel',
        'cruise': 'cruise',
        'cruises': 'cruise',
        'hotel': 'hotel',
        'hotels': 'hotel',
        'resort': 'resort',
        'resorts': 'resort',
        'tour': 'tour',
        'tours': 'tour'
      };

      if (parsed.travel_type) {
        const normalized = typeMap[parsed.travel_type.toLowerCase()];
        if (normalized) {
          parsed.travel_type = normalized;
        }
      }

      // If luxury is detected, ensure we ask for clarification
      if (parsed.is_luxury && !parsed.travel_type?.includes('luxury')) {
        parsed.needs_clarification = true;
      }
    }

    return parsed;
  }

  /**
   * Get default intent when parsing fails
   */
  getDefaultIntent(context) {
    const defaults = {
      travel_type_selection: {
        travel_type: null,
        is_luxury: false,
        needs_clarification: true,
        detected_keywords: [],
        confidence: 0
      },
      audience_definition: {
        audience_type: null,
        income_level: 'unknown',
        age_range: null,
        location: null,
        is_past_clients: false,
        confidence: 0
      },
      general: {
        intent: 'unknown',
        entities: {},
        confidence: 0
      }
    };

    return defaults[context] || defaults.general;
  }

  /**
   * Check if input is ambiguous enough to warrant LLM parsing
   */
  isAmbiguous(userInput, patterns) {
    // If any pattern matches with high confidence, it's not ambiguous
    for (const pattern of patterns) {
      if (pattern.test(userInput)) {
        return false;
      }
    }

    // Check for indicators of ambiguity
    const ambiguousIndicators = [
      /upscale|high.?end|premium|exclusive/i,  // Vague luxury terms
      /getaway|vacation|trip|travel/i,          // Generic travel terms
      /something|anything|whatever/i,           // Uncertain language
      /or|maybe|either/i,                       // Multiple options
      /\?/                                      // Questions
    ];

    return ambiguousIndicators.some(pattern => pattern.test(userInput));
  }
}

export default IntentParser;