/**
 * ResponseContract - Enforces consistent response handling across pipeline
 * 
 * Ensures that agent responses are preserved and enhancers only add polish
 * without overriding core content.
 */

export class ResponseContract {
  /**
   * Validate that a response meets the contract requirements
   */
  static validate(response) {
    if (!response) {
      throw new Error('Response cannot be null or undefined');
    }
    
    // Must have content
    if (!response.content && !response.structured) {
      throw new Error('Response must have either content or structured data');
    }
    
    // Must have source identification
    if (!response.source) {
      throw new Error('Response must identify its source');
    }
    
    // Must have confidence
    if (typeof response.confidence !== 'number') {
      throw new Error('Response must have numeric confidence');
    }
    
    return true;
  }
  
  /**
   * Merge responses with clear precedence rules
   */
  static merge(primary, secondary) {
    // Primary response takes precedence
    const merged = {
      ...secondary,
      ...primary
    };
    
    // Preserve primary content
    if (primary.content) {
      merged.content = primary.content;
    }
    
    // Merge structured data
    if (primary.structured || secondary.structured) {
      merged.structured = {
        ...(secondary.structured || {}),
        ...(primary.structured || {})
      };
    }
    
    // Merge UI elements
    if (primary.ui || secondary.ui) {
      merged.ui = {
        ...(secondary.ui || {}),
        ...(primary.ui || {})
      };
    }
    
    // Combine metadata
    if (primary.metadata || secondary.metadata) {
      merged.metadata = {
        ...(secondary.metadata || {}),
        ...(primary.metadata || {}),
        mergedFrom: [primary.source, secondary.source].filter(Boolean)
      };
    }
    
    return merged;
  }
  
  /**
   * Apply enhancements without overriding core content
   */
  static enhance(response, enhancements) {
    const enhanced = { ...response };
    
    // Only add formatting, never replace content
    if (enhancements.formatting && !response.formatted) {
      enhanced.formatted = enhancements.formatting;
    }
    
    // Add additional context
    if (enhancements.additionalContext) {
      enhanced.additionalContext = enhancements.additionalContext;
    }
    
    // Add UI elements
    if (enhancements.ui) {
      enhanced.ui = {
        ...enhanced.ui,
        ...enhancements.ui
      };
    }
    
    // Log enhancement
    enhanced.metadata = {
      ...enhanced.metadata,
      enhanced: true,
      enhancementSource: enhancements.source
    };
    
    return enhanced;
  }
  
  /**
   * Check if response is from a specialized agent
   */
  static isSpecializedResponse(response) {
    return response.source?.startsWith('agent:') || 
           response.metadata?.agent;
  }
  
  /**
   * Check if response should be final (no more processing)
   */
  static shouldBeFinal(response) {
    return response.final === true ||
           response.confidence >= 0.9 ||
           this.isSpecializedResponse(response);
  }
}

export default ResponseContract;