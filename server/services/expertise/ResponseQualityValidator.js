/**
 * Response Quality Validator
 * Ensures responses follow the established patterns from examples
 */

class ResponseQualityValidator {
  constructor() {
    this.qualityMetrics = this.initializeQualityMetrics();
    this.patternCheckers = this.initializePatternCheckers();
  }

  /**
   * Initialize quality metrics for different expertise levels
   */
  initializeQualityMetrics() {
    return {
      beginner: {
        required_patterns: [
          'concrete_explanations',
          'simple_analogies', 
          'encouraging_tone',
          'helpful_offer'
        ],
        forbidden_patterns: [
          'unexplained_jargon',
          'complex_sentences',
          'abstract_concepts'
        ],
        structure_requirements: [
          'clear_sections',
          'mathematical_examples',
          'step_by_step_guidance'
        ]
      },
      expert: {
        required_patterns: [
          'industry_benchmarks',
          'technical_categories',
          'precise_terminology',
          'strategic_questions'
        ],
        forbidden_patterns: [
          'basic_explanations',
          'analogies',
          'encouraging_language'
        ],
        structure_requirements: [
          'data_driven_opening',
          'technical_sections',
          'performance_metrics'
        ]
      }
    };
  }

  /**
   * Initialize pattern checking functions
   */
  initializePatternCheckers() {
    return {
      // Beginner pattern checkers
      concrete_explanations: (response) => {
        const patterns = [
          /tell you what percentage/i,
          /think of it like this/i,
          /if you send 100.*and.*people/i,
          /that's a.*% /i
        ];
        return patterns.some(pattern => pattern.test(response));
      },

      simple_analogies: (response) => {
        const analogyMarkers = [
          'like a doorbell',
          'think of it like',
          'is like',
          'imagine'
        ];
        return analogyMarkers.some(marker => response.toLowerCase().includes(marker));
      },

      encouraging_tone: (response) => {
        const encouragingPhrases = [
          'great question',
          'don\'t worry',
          'would you like me to help',
          'let me help you'
        ];
        return encouragingPhrases.some(phrase => response.toLowerCase().includes(phrase));
      },

      helpful_offer: (response) => {
        return /would you like me to help.*\?/i.test(response);
      },

      // Expert pattern checkers
      industry_benchmarks: (response) => {
        const benchmarkPatterns = [
          /\d+\.?\d*% average/i,
          /industry benchmark/i,
          /current.*benchmark/i,
          /\d+\.?\d*%\+ is excellent/i
        ];
        return benchmarkPatterns.some(pattern => pattern.test(response)) ||
               response.includes('21.5% average') || 
               response.includes('25%+ is excellent');
      },

      technical_categories: (response) => {
        const categoryHeaders = [
          'Technical Factors:',
          'Content Optimization:',
          'Advanced Tactics:',
          'Implementation:',
          'Architecture:'
        ];
        return categoryHeaders.some(header => response.includes(header));
      },

      precise_terminology: (response) => {
        const technicalTerms = [
          'SPF/DKIM/DMARC',
          'segmentation',
          'authentication',
          'deliverability',
          'attribution'
        ];
        return technicalTerms.some(term => response.toLowerCase().includes(term.toLowerCase()));
      },

      strategic_questions: (response) => {
        const strategicQuestions = [
          /what's your current.*\?/i,
          /what are your.*metrics/i,
          /current.*performance/i
        ];
        return strategicQuestions.some(pattern => pattern.test(response));
      },

      // Forbidden pattern checkers
      unexplained_jargon: (response, level) => {
        if (level !== 'beginner') return false;
        
        const jargonTerms = ['CTR', 'ROI', 'CPA', 'CAC', 'LTV', 'ROAS'];
        return jargonTerms.some(term => {
          const regex = new RegExp(`\\b${term}\\b`, 'g');
          const matches = response.match(regex) || [];
          const explanations = response.match(new RegExp(`${term}.*?\\(.*?\\)`, 'g')) || [];
          return matches.length > explanations.length; // Jargon without explanation
        });
      },

      complex_sentences: (response, level) => {
        if (level !== 'beginner') return false;
        
        const sentences = response.split(/[.!?]+/);
        const complexSentences = sentences.filter(sentence => {
          const words = sentence.trim().split(/\s+/);
          return words.length > 25; // More than 25 words per sentence
        });
        
        return complexSentences.length / sentences.length > 0.3; // More than 30% complex
      },

      basic_explanations: (response, level) => {
        if (level !== 'expert') return false;
        
        const basicPhrases = [
          'this means',
          'think of it like',
          'in simple terms',
          'basically'
        ];
        return basicPhrases.some(phrase => response.toLowerCase().includes(phrase));
      }
    };
  }

  /**
   * Validate response quality against expertise level
   */
  validateResponse(response, level, context = {}) {
    const metrics = this.qualityMetrics[level];
    if (!metrics) {
      return { valid: true, score: 1.0, feedback: [] };
    }

    const results = {
      valid: true,
      score: 0,
      feedback: [],
      patterns_found: [],
      patterns_missing: [],
      forbidden_found: []
    };

    let totalChecks = 0;
    let passedChecks = 0;

    // Check required patterns
    metrics.required_patterns.forEach(pattern => {
      totalChecks++;
      const checker = this.patternCheckers[pattern];
      if (checker && checker(response, level, context)) {
        passedChecks++;
        results.patterns_found.push(pattern);
      } else {
        results.patterns_missing.push(pattern);
        results.feedback.push(`Missing required pattern: ${pattern.replace('_', ' ')}`);
      }
    });

    // Check forbidden patterns
    metrics.forbidden_patterns.forEach(pattern => {
      totalChecks++;
      const checker = this.patternCheckers[pattern];
      if (checker && checker(response, level, context)) {
        results.forbidden_found.push(pattern);
        results.feedback.push(`Found forbidden pattern: ${pattern.replace('_', ' ')}`);
        results.valid = false;
      } else {
        passedChecks++;
      }
    });

    // Calculate score
    results.score = totalChecks > 0 ? passedChecks / totalChecks : 1.0;
    results.valid = results.valid && results.score >= 0.7;

    return results;
  }

  /**
   * Validate specific example patterns
   */
  validateExamplePatterns(response, level, topic) {
    const validationResults = {
      email_open_rates_beginner: (response) => {
        const requiredElements = [
          'what percentage of people open your emails',
          'if you send 100 emails',
          'that\'s a 20% open rate',
          'subject line',
          'sender name',
          'timing',
          'would you like me to help'
        ];
        
        const found = requiredElements.filter(element => 
          response.toLowerCase().includes(element.toLowerCase())
        );
        
        return {
          score: found.length / requiredElements.length,
          found: found,
          missing: requiredElements.filter(el => !found.includes(el))
        };
      },

      email_open_rates_expert: (response) => {
        const requiredElements = [
          '21.5% average',
          '25%+ is excellent',
          'technical factors',
          'content optimization',
          'advanced tactics',
          'spf/dkim/dmarc',
          'behavior-based segments',
          'what\'s your current open rate'
        ];
        
        const found = requiredElements.filter(element => 
          response.toLowerCase().includes(element.toLowerCase())
        );
        
        return {
          score: found.length / requiredElements.length,
          found: found,
          missing: requiredElements.filter(el => !found.includes(el))
        };
      }
    };

    const validatorKey = `${topic}_${level}`;
    const validator = validationResults[validatorKey];
    
    if (validator) {
      return validator(response);
    }

    return { score: 1.0, found: [], missing: [] };
  }

  /**
   * Generate improvement suggestions
   */
  generateImprovementSuggestions(validationResults, level, topic) {
    const suggestions = [];

    if (level === 'beginner') {
      if (validationResults.patterns_missing.includes('concrete_explanations')) {
        suggestions.push('Add mathematical examples like "if you send 100 emails and 20 people open them, that\'s a 20% open rate"');
      }
      
      if (validationResults.patterns_missing.includes('helpful_offer')) {
        suggestions.push('End with a helpful offer like "Would you like me to help you write some subject lines to test?"');
      }
      
      if (validationResults.forbidden_found.includes('unexplained_jargon')) {
        suggestions.push('Explain all technical terms or replace with simple language');
      }
    }

    if (level === 'expert') {
      if (validationResults.patterns_missing.includes('industry_benchmarks')) {
        suggestions.push('Start with specific industry benchmarks and data points');
      }
      
      if (validationResults.patterns_missing.includes('technical_categories')) {
        suggestions.push('Structure response with technical categories like "Technical Factors:" and "Advanced Tactics:"');
      }
      
      if (validationResults.patterns_missing.includes('strategic_questions')) {
        suggestions.push('End with strategic questions about current performance data');
      }
    }

    return suggestions;
  }

  /**
   * Comprehensive response quality check
   */
  comprehensiveQualityCheck(response, level, topic, context = {}) {
    const generalValidation = this.validateResponse(response, level, context);
    const exampleValidation = this.validateExamplePatterns(response, level, topic);
    const suggestions = this.generateImprovementSuggestions(generalValidation, level, topic);

    return {
      overall_score: (generalValidation.score + exampleValidation.score) / 2,
      general_validation: generalValidation,
      example_validation: exampleValidation,
      improvement_suggestions: suggestions,
      passes_quality_check: generalValidation.valid && exampleValidation.score >= 0.8
    };
  }
}

module.exports = ResponseQualityValidator;