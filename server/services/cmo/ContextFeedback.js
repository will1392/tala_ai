/**
 * Context Feedback System
 * 
 * Learns from user corrections and improves context detection
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ContextFeedback {
  constructor() {
    this.feedbackFile = path.join(__dirname, '../../data/context-feedback.json');
    this.feedbackData = this.loadFeedback();
    this.learningRate = 0.1;
    
    // Pattern adjustments based on feedback
    this.patternAdjustments = new Map();
    
    // User preference tracking
    this.userPreferences = new Map();
  }
  
  /**
   * Load feedback data
   */
  loadFeedback() {
    try {
      if (fs.existsSync(this.feedbackFile)) {
        return JSON.parse(fs.readFileSync(this.feedbackFile, 'utf8'));
      }
    } catch (error) {
      console.error('Failed to load feedback data:', error);
    }
    
    return {
      corrections: [],
      patterns: {},
      statistics: {
        totalFeedback: 0,
        correctDetections: 0,
        corrections: 0,
        contextAccuracy: {}
      }
    };
  }
  
  /**
   * Save feedback data
   */
  saveFeedback() {
    try {
      const dir = path.dirname(this.feedbackFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.feedbackFile, JSON.stringify(this.feedbackData, null, 2));
    } catch (error) {
      console.error('Failed to save feedback data:', error);
    }
  }
  
  /**
   * Record user feedback
   */
  recordFeedback(query, detectedContext, actualContext, userId = 'default') {
    const feedback = {
      timestamp: new Date().toISOString(),
      query,
      detectedContext,
      actualContext,
      isCorrect: detectedContext === actualContext,
      userId
    };
    
    // Add to corrections history
    this.feedbackData.corrections.push(feedback);
    if (this.feedbackData.corrections.length > 10000) {
      this.feedbackData.corrections.shift(); // Keep last 10k entries
    }
    
    // Update statistics
    this.feedbackData.statistics.totalFeedback++;
    if (feedback.isCorrect) {
      this.feedbackData.statistics.correctDetections++;
    } else {
      this.feedbackData.statistics.corrections++;
    }
    
    // Update context accuracy
    const contextStats = this.feedbackData.statistics.contextAccuracy;
    if (!contextStats[detectedContext]) {
      contextStats[detectedContext] = { correct: 0, incorrect: 0 };
    }
    if (feedback.isCorrect) {
      contextStats[detectedContext].correct++;
    } else {
      contextStats[detectedContext].incorrect++;
    }
    
    // Learn from correction
    if (!feedback.isCorrect) {
      this.learnFromCorrection(query, detectedContext, actualContext);
    }
    
    // Update user preferences
    this.updateUserPreferences(userId, actualContext);
    
    // Save feedback
    this.saveFeedback();
    
    return feedback;
  }
  
  /**
   * Learn from correction
   */
  learnFromCorrection(query, detectedContext, actualContext) {
    // Extract key phrases from the query
    const keyPhrases = this.extractKeyPhrases(query);
    
    // Update pattern adjustments
    keyPhrases.forEach(phrase => {
      const key = `${phrase}:${actualContext}`;
      const currentWeight = this.patternAdjustments.get(key) || 0;
      this.patternAdjustments.set(key, currentWeight + this.learningRate);
      
      // Decrease weight for incorrect context
      const incorrectKey = `${phrase}:${detectedContext}`;
      const incorrectWeight = this.patternAdjustments.get(incorrectKey) || 0;
      this.patternAdjustments.set(incorrectKey, Math.max(0, incorrectWeight - this.learningRate));
    });
    
    // Store learned pattern
    if (!this.feedbackData.patterns[actualContext]) {
      this.feedbackData.patterns[actualContext] = {};
    }
    
    keyPhrases.forEach(phrase => {
      if (!this.feedbackData.patterns[actualContext][phrase]) {
        this.feedbackData.patterns[actualContext][phrase] = 0;
      }
      this.feedbackData.patterns[actualContext][phrase]++;
    });
  }
  
  /**
   * Extract key phrases from query
   */
  extractKeyPhrases(query) {
    const words = query.toLowerCase().split(/\s+/);
    const phrases = [];
    
    // Single words
    words.forEach(word => {
      if (word.length > 3 && !this.isStopWord(word)) {
        phrases.push(word);
      }
    });
    
    // Bigrams
    for (let i = 0; i < words.length - 1; i++) {
      if (!this.isStopWord(words[i]) && !this.isStopWord(words[i + 1])) {
        phrases.push(`${words[i]} ${words[i + 1]}`);
      }
    }
    
    return phrases;
  }
  
  /**
   * Check if word is a stop word
   */
  isStopWord(word) {
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by'];
    return stopWords.includes(word);
  }
  
  /**
   * Update user preferences
   */
  updateUserPreferences(userId, context) {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, {});
    }
    
    const prefs = this.userPreferences.get(userId);
    prefs[context] = (prefs[context] || 0) + 1;
  }
  
  /**
   * Get user's preferred contexts
   */
  getUserPreferences(userId) {
    const prefs = this.userPreferences.get(userId);
    if (!prefs) return null;
    
    // Sort by frequency
    const sorted = Object.entries(prefs)
      .sort(([, a], [, b]) => b - a)
      .map(([context, count]) => ({ context, count }));
    
    return sorted;
  }
  
  /**
   * Apply learned adjustments to detection
   */
  applyLearnedAdjustments(query, baseScores) {
    const adjustedScores = { ...baseScores };
    const keyPhrases = this.extractKeyPhrases(query);
    
    // Apply pattern adjustments
    Object.keys(adjustedScores).forEach(context => {
      keyPhrases.forEach(phrase => {
        const key = `${phrase}:${context}`;
        const adjustment = this.patternAdjustments.get(key) || 0;
        adjustedScores[context] += adjustment * 0.1; // Moderate influence
      });
    });
    
    // Normalize scores
    const maxScore = Math.max(...Object.values(adjustedScores));
    if (maxScore > 1) {
      Object.keys(adjustedScores).forEach(context => {
        adjustedScores[context] = adjustedScores[context] / maxScore;
      });
    }
    
    return adjustedScores;
  }
  
  /**
   * Get feedback statistics
   */
  getStatistics() {
    const stats = this.feedbackData.statistics;
    const accuracy = stats.totalFeedback > 0 
      ? (stats.correctDetections / stats.totalFeedback * 100).toFixed(1)
      : 0;
    
    return {
      totalFeedback: stats.totalFeedback,
      accuracy: accuracy + '%',
      corrections: stats.corrections,
      contextAccuracy: Object.entries(stats.contextAccuracy).map(([context, data]) => ({
        context,
        accuracy: ((data.correct / (data.correct + data.incorrect)) * 100).toFixed(1) + '%',
        samples: data.correct + data.incorrect
      })),
      learnedPatterns: Object.keys(this.feedbackData.patterns).reduce((acc, context) => {
        acc[context] = Object.keys(this.feedbackData.patterns[context]).length;
        return acc;
      }, {})
    };
  }
  
  /**
   * Generate clarification prompt
   */
  generateClarificationPrompt(detectedContext, confidence, possibleContexts) {
    if (confidence > 0.7) {
      return {
        type: 'confirmation',
        message: `I understood you're asking about ${detectedContext} marketing. Is that correct?`,
        options: ['Yes', 'No, I meant something else']
      };
    }
    
    if (possibleContexts && possibleContexts.length > 0) {
      const options = possibleContexts.slice(0, 3).map(c => c.context);
      return {
        type: 'disambiguation',
        message: 'Which marketing channel are you interested in?',
        options: options.map(opt => ({
          label: this.getContextLabel(opt),
          value: opt
        }))
      };
    }
    
    return {
      type: 'clarification',
      message: 'I\'m not sure which marketing channel you\'re asking about. Could you clarify?',
      options: [
        { label: 'SEO / Search Marketing', value: 'seo' },
        { label: 'Email Marketing', value: 'email' },
        { label: 'Social Media Marketing', value: 'social' },
        { label: 'Paid Advertising', value: 'ads' },
        { label: 'Direct Mail', value: 'directMail' }
      ]
    };
  }
  
  /**
   * Get user-friendly context label
   */
  getContextLabel(context) {
    const labels = {
      seo: 'SEO / Search Marketing',
      email: 'Email Marketing',
      social: 'Social Media Marketing',
      directMail: 'Direct Mail Marketing',
      ads: 'Paid Advertising (PPC/Display)'
    };
    
    return labels[context] || context;
  }
  
  /**
   * Process user clarification response
   */
  processClarificationResponse(originalQuery, detectedContext, userChoice, userId) {
    // Record the correction
    this.recordFeedback(originalQuery, detectedContext, userChoice, userId);
    
    // Return confirmation
    return {
      success: true,
      message: `Got it! I'll help you with ${this.getContextLabel(userChoice)}.`,
      context: userChoice,
      learned: true
    };
  }
  
  /**
   * Export feedback data for analysis
   */
  exportFeedbackData() {
    const exportData = {
      statistics: this.getStatistics(),
      recentCorrections: this.feedbackData.corrections.slice(-100),
      patternAdjustments: Array.from(this.patternAdjustments.entries()),
      topPatterns: this.getTopPatterns(),
      timestamp: new Date().toISOString()
    };
    
    const exportPath = path.join(__dirname, `../../data/feedback-export-${Date.now()}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    return exportPath;
  }
  
  /**
   * Get top learned patterns
   */
  getTopPatterns() {
    const patterns = [];
    
    Object.entries(this.feedbackData.patterns).forEach(([context, contextPatterns]) => {
      Object.entries(contextPatterns).forEach(([pattern, count]) => {
        patterns.push({ context, pattern, count });
      });
    });
    
    return patterns
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }
}

// Export singleton instance
export const contextFeedback = new ContextFeedback();
export default ContextFeedback;