/**
 * ImportanceScorer - Message Importance Scoring for Tala AI
 * 
 * Scores messages based on their importance (0-1) considering:
 * - Decisions made
 * - Entities mentioned
 * - User emphasis
 * - Critical information (bookings, preferences)
 */

export class ImportanceScorer {
  constructor(options = {}) {
    this.options = {
      // Base weights for different factors
      weights: {
        decision: options.weights?.decision || 0.9,
        preference: options.weights?.preference || 0.8,
        constraint: options.weights?.constraint || 0.85,
        entity: options.weights?.entity || 0.7,
        question: options.weights?.question || 0.6,
        booking: options.weights?.booking || 0.95,
        problem: options.weights?.problem || 0.75,
        emphasis: options.weights?.emphasis || 0.7,
        recency: options.weights?.recency || 0.3
      },
      
      // Entity importance levels
      entityImportance: {
        destination: 0.8,
        date: 0.9,
        budget: 0.85,
        airline: 0.7,
        hotel: 0.7,
        person: 0.6,
        activity: 0.5,
        ...options.entityImportance
      },
      
      // Patterns for detection
      patterns: {
        decision: [
          /\b(?:decided?|chose|select(?:ed)?|going with|will|let's)\b/i,
          /\b(?:final(?:ly)?|definite(?:ly)?|confirmed?|booked?)\b/i,
          /\b(?:yes|no|agreed?|disagree)\b/i
        ],
        preference: [
          /\b(?:prefer|like|love|want|wish|hope|favorite|enjoy)\b/i,
          /\b(?:would rather|instead of|over|better than)\b/i,
          /\b(?:important|priority|must-have|essential)\b/i
        ],
        constraint: [
          /\b(?:budget|limit|max(?:imum)?|min(?:imum)?|constraint)\b/i,
          /\b(?:must|need|require|have to|can't|cannot|unable)\b/i,
          /\b(?:allerg(?:y|ic)|diet(?:ary)?|restriction|avoid)\b/i
        ],
        booking: [
          /\b(?:book(?:ed|ing)?|reserv(?:e|ed|ation)|confirm(?:ed|ation))\b/i,
          /\b(?:flight|hotel|ticket|purchase|payment)\b/i,
          /\b(?:itinerary|confirmation number|booking reference)\b/i
        ],
        problem: [
          /\b(?:problem|issue|error|wrong|mistake|incorrect)\b/i,
          /\b(?:concern|worry|worried|anxious|unsure)\b/i,
          /\b(?:help|stuck|confused|don't understand)\b/i
        ],
        emphasis: [
          /\b(?:very|really|extremely|absolutely|definitely|crucial)\b/i,
          /\b(?:important|critical|essential|vital|key|major)\b/i,
          /[!]{2,}|[A-Z]{3,}/
        ],
        ...options.patterns
      },
      
      // Keywords that increase importance
      importantKeywords: options.importantKeywords || [
        'confirm', 'book', 'reserve', 'final', 'decision', 'important',
        'urgent', 'asap', 'immediately', 'deadline', 'must', 'critical'
      ],
      
      ...options
    };
    
    this.initialized = false;
  }

  /**
   * Initialize the importance scorer
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('📊 Initializing ImportanceScorer...');
      
      // Could initialize ML models or external services here
      
      this.initialized = true;
      console.log('✅ ImportanceScorer initialized successfully');
      
    } catch (error) {
      console.error('❌ ImportanceScorer initialization failed:', error);
      throw error;
    }
  }

  /**
   * Score multiple messages
   * @param {Array} messages - Messages to score
   * @returns {Array} Messages with scores and categories
   */
  async scoreMessages(messages) {
    try {
      this.ensureInitialized();
      
      console.log(`📊 Scoring ${messages.length} messages for importance`);
      
      const scoredMessages = await Promise.all(
        messages.map(async (msg, index) => {
          const score = await this.scoreMessage(msg, index, messages);
          return {
            message: msg,
            score: score.finalScore,
            factors: score.factors,
            categories: score.categories,
            entities: score.entities
          };
        })
      );
      
      return scoredMessages;
      
    } catch (error) {
      console.error('❌ Failed to score messages:', error);
      return messages.map(msg => ({
        message: msg,
        score: 0.5,
        factors: {},
        categories: [],
        entities: []
      }));
    }
  }

  /**
   * Score a single message
   * @param {Object} message - Message to score
   * @param {number} index - Message index in conversation
   * @param {Array} allMessages - All messages for context
   * @returns {Object} Score details
   */
  async scoreMessage(message, index = 0, allMessages = []) {
    try {
      const content = message.content || '';
      const role = message.role || 'user';
      
      // Initialize scoring factors
      const factors = {
        decision: 0,
        preference: 0,
        constraint: 0,
        entity: 0,
        question: 0,
        booking: 0,
        problem: 0,
        emphasis: 0,
        recency: 0,
        length: 0,
        role: 0
      };
      
      const categories = [];
      const entities = [];
      
      // 1. Pattern-based scoring
      factors.decision = this.scorePattern(content, this.options.patterns.decision);
      if (factors.decision > 0) categories.push('decision');
      
      factors.preference = this.scorePattern(content, this.options.patterns.preference);
      if (factors.preference > 0) categories.push('preference');
      
      factors.constraint = this.scorePattern(content, this.options.patterns.constraint);
      if (factors.constraint > 0) categories.push('constraint');
      
      factors.booking = this.scorePattern(content, this.options.patterns.booking);
      if (factors.booking > 0) categories.push('booking');
      
      factors.problem = this.scorePattern(content, this.options.patterns.problem);
      if (factors.problem > 0) categories.push('problem');
      
      factors.emphasis = this.scorePattern(content, this.options.patterns.emphasis);
      if (factors.emphasis > 0) categories.push('emphasis');
      
      // 2. Entity extraction and scoring
      const extractedEntities = this.extractEntities(content);
      entities.push(...extractedEntities);
      
      if (extractedEntities.length > 0) {
        const entityScores = extractedEntities.map(e => 
          this.options.entityImportance[e.type] || 0.5
        );
        factors.entity = Math.max(...entityScores);
        categories.push('entity-rich');
      }
      
      // 3. Question detection
      if (role === 'user' && content.includes('?')) {
        factors.question = 1.0;
        categories.push('question');
      }
      
      // 4. Recency factor
      if (allMessages.length > 0) {
        const position = index / allMessages.length;
        factors.recency = Math.pow(position, 1.5); // More recent = higher score
      }
      
      // 5. Length factor (longer messages often contain more info)
      const wordCount = content.split(/\s+/).length;
      if (wordCount > 50) {
        factors.length = Math.min(0.3, wordCount / 200);
        categories.push('detailed');
      }
      
      // 6. Role factor
      if (role === 'user') {
        factors.role = 0.1; // User messages slightly more important
      }
      
      // 7. Keyword presence
      const keywordScore = this.scoreKeywords(content);
      if (keywordScore > 0) {
        factors.emphasis = Math.max(factors.emphasis, keywordScore);
      }
      
      // Calculate final score
      const finalScore = this.calculateFinalScore(factors);
      
      return {
        finalScore,
        factors,
        categories,
        entities
      };
      
    } catch (error) {
      console.error('❌ Failed to score message:', error);
      return {
        finalScore: 0.5,
        factors: {},
        categories: [],
        entities: []
      };
    }
  }

  /**
   * Score pattern matches
   * @param {string} content - Content to check
   * @param {Array} patterns - Regex patterns
   * @returns {number} Score 0-1
   */
  scorePattern(content, patterns) {
    let matches = 0;
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        matches++;
      }
    }
    return Math.min(1.0, matches / Math.max(1, patterns.length));
  }

  /**
   * Extract entities from content
   * @param {string} content - Content to analyze
   * @returns {Array} Extracted entities
   */
  extractEntities(content) {
    const entities = [];
    
    // Destinations (proper nouns)
    const destinations = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    destinations.forEach(dest => {
      // Filter out common words
      if (!this.isCommonWord(dest)) {
        entities.push({ type: 'destination', value: dest });
      }
    });
    
    // Dates
    const datePatterns = [
      /\b\d{4}[-/]\d{2}[-/]\d{2}\b/g,
      /\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?\b/gi,
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?\b/gi
    ];
    
    datePatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(date => {
        entities.push({ type: 'date', value: date });
      });
    });
    
    // Budget/Money
    const money = content.match(/[$£€]\s*[\d,]+(?:\.\d{2})?/g) || [];
    money.forEach(amount => {
      entities.push({ type: 'budget', value: amount });
    });
    
    // Airlines
    const airlinePatterns = [
      /\b(?:United|Delta|American|Southwest|JetBlue|Alaska|Spirit|Frontier)\b/gi,
      /\b(?:Emirates|Qatar|Singapore|Lufthansa|British Airways|Air France)\b/gi,
      /\b[A-Z]{2}\s*\d{3,4}\b/g // Flight numbers
    ];
    
    airlinePatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(airline => {
        entities.push({ type: 'airline', value: airline });
      });
    });
    
    // Hotels
    const hotelPatterns = [
      /\b(?:Hilton|Marriott|Hyatt|Sheraton|Holiday Inn|Best Western|Ritz)\b/gi,
      /\b(?:hotel|resort|inn|lodge|hostel|airbnb)\b/gi
    ];
    
    hotelPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(hotel => {
        entities.push({ type: 'hotel', value: hotel });
      });
    });
    
    // People/Companions
    const peoplePatterns = [
      /\b(?:husband|wife|spouse|partner|friend|family|kids?|children)\b/gi,
      /\b\d+\s*(?:people|persons?|adults?|children|kids?)\b/gi
    ];
    
    peoplePatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      matches.forEach(person => {
        entities.push({ type: 'person', value: person });
      });
    });
    
    return entities;
  }

  /**
   * Score keyword presence
   * @param {string} content - Content to check
   * @returns {number} Score 0-1
   */
  scoreKeywords(content) {
    const contentLower = content.toLowerCase();
    let keywordCount = 0;
    
    for (const keyword of this.options.importantKeywords) {
      if (contentLower.includes(keyword.toLowerCase())) {
        keywordCount++;
      }
    }
    
    return Math.min(1.0, keywordCount / 3); // Cap at 3 keywords for max score
  }

  /**
   * Calculate final importance score
   * @param {Object} factors - Individual scoring factors
   * @returns {number} Final score 0-1
   */
  calculateFinalScore(factors) {
    const weights = this.options.weights;
    let weightedSum = 0;
    let totalWeight = 0;
    
    // Apply weights to each factor
    Object.entries(factors).forEach(([factor, score]) => {
      if (weights[factor] !== undefined && score > 0) {
        weightedSum += score * weights[factor];
        totalWeight += weights[factor];
      }
    });
    
    // Calculate base score
    let finalScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;
    
    // Apply special case boosts
    if (factors.booking > 0.5) {
      finalScore = Math.max(finalScore, 0.9); // Bookings are always important
    }
    
    if (factors.decision > 0.7 && factors.emphasis > 0.5) {
      finalScore = Math.max(finalScore, 0.85); // Emphasized decisions
    }
    
    if (factors.problem > 0.5 && factors.question > 0.5) {
      finalScore = Math.max(finalScore, 0.8); // Problems needing resolution
    }
    
    // Ensure score is within bounds
    return Math.max(0, Math.min(1, finalScore));
  }

  /**
   * Check if word is common (to filter out from destinations)
   */
  isCommonWord(word) {
    const commonWords = [
      'The', 'This', 'That', 'What', 'Where', 'When', 'Why', 'How',
      'Yes', 'No', 'Maybe', 'Please', 'Thank', 'Thanks', 'Hello', 'Hi',
      'Good', 'Great', 'Best', 'New', 'Old', 'First', 'Last', 'Next'
    ];
    return commonWords.includes(word);
  }

  /**
   * Analyze importance trends over conversation
   * @param {Array} scoredMessages - Messages with scores
   * @returns {Object} Trend analysis
   */
  analyzeTrends(scoredMessages) {
    const trends = {
      averageImportance: 0,
      importanceOverTime: [],
      peakMoments: [],
      categories: {}
    };
    
    // Calculate average
    const scores = scoredMessages.map(m => m.score);
    trends.averageImportance = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    // Find peaks (local maxima)
    for (let i = 1; i < scores.length - 1; i++) {
      if (scores[i] > scores[i-1] && scores[i] > scores[i+1] && scores[i] > 0.7) {
        trends.peakMoments.push({
          index: i,
          score: scores[i],
          message: scoredMessages[i].message
        });
      }
    }
    
    // Category distribution
    scoredMessages.forEach(msg => {
      msg.categories.forEach(cat => {
        trends.categories[cat] = (trends.categories[cat] || 0) + 1;
      });
    });
    
    // Smooth importance over time
    const windowSize = 3;
    for (let i = 0; i < scores.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(scores.length, i + Math.floor(windowSize / 2) + 1);
      const window = scores.slice(start, end);
      trends.importanceOverTime.push(
        window.reduce((sum, s) => sum + s, 0) / window.length
      );
    }
    
    return trends;
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('ImportanceScorer not initialized. Call initialize() first.');
    }
  }
}

export default ImportanceScorer;