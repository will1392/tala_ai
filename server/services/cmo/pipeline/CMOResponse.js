/**
 * CMOResponse - Unified response contract for all CMO components
 * 
 * Provides an immutable response structure that flows through the pipeline
 * with clear ownership and transformation tracking.
 */

export class CMOResponse {
  constructor(data = {}) {
    // Core response data
    this.content = data.content || '';           // Main text response
    this.structured = data.structured || {};     // Structured data (metrics, recommendations, etc)
    this.source = data.source || 'unknown';      // Which component generated this
    this.confidence = data.confidence || 0;      // Response confidence (0-1)
    this.final = data.final || false;           // Should pipeline stop processing
    
    // Metadata for tracking and debugging
    this.metadata = {
      timestamp: Date.now(),
      pipeline_version: '2.0',
      transformations: [],
      ...data.metadata
    };
    
    // Additional UI hints
    this.ui = {
      format: data.ui?.format || 'markdown',
      quickActions: data.ui?.quickActions || [],
      followUpQuestions: data.ui?.followUpQuestions || [],
      citations: data.ui?.citations || [],
      ...data.ui
    };
    
    // Make response immutable
    Object.freeze(this);
    Object.freeze(this.metadata);
    Object.freeze(this.ui);
  }

  /**
   * Create a new response with content transformation
   */
  withContent(transformer) {
    const newContent = typeof transformer === 'function' 
      ? transformer(this.content) 
      : transformer;
      
    return new CMOResponse({
      ...this.toJSON(),
      content: newContent,
      metadata: {
        ...this.metadata,
        transformations: [
          ...this.metadata.transformations,
          { type: 'content', timestamp: Date.now() }
        ]
      }
    });
  }

  /**
   * Create a new response with structured data transformation
   */
  withStructured(transformer) {
    const newStructured = typeof transformer === 'function'
      ? transformer(this.structured)
      : { ...this.structured, ...transformer };
      
    return new CMOResponse({
      ...this.toJSON(),
      structured: newStructured,
      metadata: {
        ...this.metadata,
        transformations: [
          ...this.metadata.transformations,
          { type: 'structured', timestamp: Date.now() }
        ]
      }
    });
  }

  /**
   * Create a new response with UI hints
   */
  withUI(uiData) {
    return new CMOResponse({
      ...this.toJSON(),
      ui: { ...this.ui, ...uiData },
      metadata: {
        ...this.metadata,
        transformations: [
          ...this.metadata.transformations,
          { type: 'ui', timestamp: Date.now() }
        ]
      }
    });
  }

  /**
   * Mark response as final (no further processing)
   */
  asFinal() {
    return new CMOResponse({
      ...this.toJSON(),
      final: true
    });
  }

  /**
   * Merge with another response (for aggregating multiple sources)
   */
  merge(otherResponse) {
    if (!otherResponse) return this;
    
    return new CMOResponse({
      content: this.content + '\n\n' + otherResponse.content,
      structured: {
        ...this.structured,
        ...otherResponse.structured,
        _sources: [
          ...(this.structured._sources || []),
          ...(otherResponse.structured._sources || [])
        ]
      },
      source: `merged:${this.source}+${otherResponse.source}`,
      confidence: Math.max(this.confidence, otherResponse.confidence),
      final: this.final || otherResponse.final,
      metadata: {
        ...this.metadata,
        ...otherResponse.metadata,
        transformations: [
          ...this.metadata.transformations,
          ...otherResponse.metadata.transformations,
          { type: 'merge', timestamp: Date.now() }
        ]
      },
      ui: {
        ...this.ui,
        quickActions: [...this.ui.quickActions, ...otherResponse.ui.quickActions],
        followUpQuestions: [...this.ui.followUpQuestions, ...otherResponse.ui.followUpQuestions],
        citations: [...this.ui.citations, ...otherResponse.ui.citations]
      }
    });
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON() {
    return {
      content: this.content,
      structured: this.structured,
      source: this.source,
      confidence: this.confidence,
      final: this.final,
      metadata: this.metadata,
      ui: this.ui
    };
  }

  /**
   * Check if response has meaningful content
   */
  hasContent() {
    return !!(
      this.content?.trim() || 
      Object.keys(this.structured).length > 0 ||
      this.ui.citations?.length > 0
    );
  }

  /**
   * Get a summary for logging
   */
  summary() {
    return {
      source: this.source,
      confidence: this.confidence,
      contentLength: this.content.length,
      hasStructured: Object.keys(this.structured).length > 0,
      final: this.final,
      transformations: this.metadata.transformations.length
    };
  }
}

/**
 * Factory for creating responses from legacy formats
 */
export class CMOResponseFactory {
  static fromLegacy(legacyResponse) {
    // Handle old CMOAssistant format
    if (legacyResponse.content && typeof legacyResponse.content === 'string') {
      return new CMOResponse({
        content: legacyResponse.content,
        structured: legacyResponse.structured || {},
        source: 'legacy:cmo_assistant',
        confidence: legacyResponse.confidence || 0.7,
        metadata: legacyResponse.metadata || {},
        ui: {
          quickActions: legacyResponse.quickActions || [],
          citations: legacyResponse.citations || []
        }
      });
    }
    
    // Handle old agent format
    if (legacyResponse.data && legacyResponse.type) {
      return new CMOResponse({
        content: legacyResponse.data.narrative || legacyResponse.data.summary || '',
        structured: legacyResponse.data,
        source: `legacy:${legacyResponse.type}`,
        confidence: legacyResponse.metadata?.confidence || 0.8,
        metadata: legacyResponse.metadata || {}
      });
    }
    
    // Handle string responses
    if (typeof legacyResponse === 'string') {
      return new CMOResponse({
        content: legacyResponse,
        source: 'legacy:string',
        confidence: 0.5
      });
    }
    
    // Default
    return new CMOResponse({
      content: JSON.stringify(legacyResponse),
      source: 'legacy:unknown',
      confidence: 0.3
    });
  }
}

export default CMOResponse;