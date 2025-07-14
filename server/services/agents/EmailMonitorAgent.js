/**
 * EmailMonitorAgent - Specialized agent for parsing and monitoring travel emails
 * 
 * Extracts bookings, confirmations, requests, and action items from email content
 * with a focus on travel-related information.
 */

import BaseAgent from './BaseAgent.js';

export class EmailMonitorAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      preferredLLM: 'gpt-4',
      confidence_threshold: 0.8,
      temperature: 0.3 // Lower temperature for more consistent extraction
    });
    
    // Email patterns for common travel providers
    this.emailPatterns = {
      airlines: [
        /booking confirmation/i,
        /flight confirmation/i,
        /e-ticket/i,
        /boarding pass/i,
        /flight itinerary/i,
        /reservation code/i,
        /PNR:/i
      ],
      hotels: [
        /hotel confirmation/i,
        /accommodation booking/i,
        /reservation number/i,
        /check-in:/i,
        /check-out:/i,
        /room type/i,
        /booking reference/i
      ],
      general: [
        /confirmation number/i,
        /booking id/i,
        /reference number/i,
        /total amount/i,
        /payment received/i,
        /cancellation policy/i
      ]
    };
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return [
      'email-parsing',
      'booking-extraction',
      'confirmation-detection',
      'action-item-identification',
      'deadline-extraction',
      'contact-extraction',
      'travel-document-parsing'
    ];
  }

  /**
   * Get agent specialization
   */
  getSpecialization() {
    return 'email-monitoring-travel';
  }

  /**
   * Get preferred LLM
   */
  getPreferredLLM() {
    return 'gpt-4';
  }

  /**
   * Get supported task types
   */
  getSupportedTaskTypes() {
    return [
      'parse-email',
      'extract-booking',
      'monitor-inbox',
      'identify-actions',
      'extract-confirmations'
    ];
  }

  /**
   * Evaluate if agent can handle task
   */
  async evaluateTask(task) {
    // Check if task involves email content
    if (task.type === 'parse-email' || task.data?.source === 'email') {
      return 0.95;
    }
    
    // Check for email-related keywords
    const taskText = JSON.stringify(task).toLowerCase();
    const emailKeywords = ['email', 'message', 'inbox', 'mail', 'confirmation', 'booking'];
    
    const keywordMatches = emailKeywords.filter(keyword => taskText.includes(keyword));
    if (keywordMatches.length > 0) {
      return 0.8 + (keywordMatches.length * 0.05);
    }
    
    // Check if content matches email patterns
    if (task.content) {
      const patternScore = this.calculatePatternScore(task.content);
      if (patternScore > 0.5) {
        return patternScore;
      }
    }
    
    return 0.3;
  }

  /**
   * Validate task
   */
  async validateTask(task) {
    if (!task.content && !task.data?.emailContent) {
      return { valid: false, reason: 'No email content provided' };
    }
    
    return { valid: true };
  }

  /**
   * Perform the email parsing task
   */
  async performTask(task, context) {
    const emailContent = task.content || task.data?.emailContent;
    const taskType = task.type || 'parse-email';
    
    console.log(`📧 Processing email task: ${taskType}`);
    
    let result;
    
    switch (taskType) {
      case 'parse-email':
        result = await this.parseEmail(emailContent, context);
        break;
        
      case 'extract-booking':
        result = await this.extractBookingDetails(emailContent, context);
        break;
        
      case 'identify-actions':
        result = await this.identifyActionItems(emailContent, context);
        break;
        
      case 'extract-confirmations':
        result = await this.extractConfirmations(emailContent, context);
        break;
        
      default:
        result = await this.parseEmail(emailContent, context);
    }
    
    return result;
  }

  /**
   * Parse email content comprehensively
   */
  async parseEmail(emailContent, context) {
    const prompt = `You are an expert travel email parser. Analyze the following email and extract all relevant travel information.

Email Content:
${emailContent}

Extract and structure the following information:
1. Email Type (booking confirmation, request, inquiry, etc.)
2. Primary Subject (flight, hotel, car rental, tour, etc.)
3. Booking Details:
   - Confirmation/Reference numbers
   - Provider name
   - Dates and times
   - Locations (from/to, address)
   - Passenger/Guest names
   - Contact information
4. Financial Information:
   - Total amount
   - Currency
   - Payment status
   - Cancellation policy
5. Action Items:
   - Required actions from recipient
   - Deadlines
   - Documents needed
6. Important Notes:
   - Special instructions
   - Warnings or alerts
   - Policy information

Format the response as a structured JSON object.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.3,
        maxTokens: 1500,
        responseFormat: { type: 'json_object' }
      });
      
      const parsed = this.parseAIResponse(response);
      
      // Enhance with pattern matching
      const patterns = this.detectPatterns(emailContent);
      
      return {
        emailType: parsed.emailType || patterns.type,
        subject: parsed.primarySubject,
        bookingDetails: {
          ...parsed.bookingDetails,
          confirmationNumbers: this.extractConfirmationNumbers(emailContent),
          dates: this.extractDates(emailContent),
          ...patterns.details
        },
        financial: parsed.financialInformation,
        actionItems: parsed.actionItems || [],
        importantNotes: parsed.importantNotes || [],
        metadata: {
          confidence: this.calculateConfidence(parsed, patterns),
          patternMatches: patterns.matches,
          extractedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Email parsing error:', error);
      throw error;
    }
  }

  /**
   * Extract booking details specifically
   */
  async extractBookingDetails(emailContent, context) {
    const prompt = `Extract booking details from this travel email. Focus on:
- Confirmation/PNR/Reference numbers
- Travel dates and times
- Departure and arrival locations
- Provider/airline/hotel name
- Passenger/guest names
- Seat/room information
- Total cost

Email Content:
${emailContent}

Return a structured JSON with all booking details found.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.2,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' }
      });
      
      const details = this.parseAIResponse(response);
      
      // Validate and enhance extraction
      const enhanced = {
        ...details,
        confirmationNumber: details.confirmationNumber || this.extractConfirmationNumbers(emailContent)[0],
        dates: this.standardizeDates(details.dates || this.extractDates(emailContent)),
        provider: this.identifyProvider(emailContent, details.provider),
        bookingType: this.classifyBookingType(emailContent)
      };
      
      return {
        bookingDetails: enhanced,
        confidence: this.validateBookingDetails(enhanced)
      };
      
    } catch (error) {
      console.error('Booking extraction error:', error);
      throw error;
    }
  }

  /**
   * Identify action items from email
   */
  async identifyActionItems(emailContent, context) {
    const prompt = `Identify all action items and tasks from this travel email:

${emailContent}

For each action item, extract:
1. Description of the required action
2. Deadline (if mentioned)
3. Priority (high/medium/low based on context)
4. Required documents or information
5. Consequences of not completing

Format as a JSON array of action items.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.4,
        maxTokens: 800
      });
      
      const actions = this.parseAIResponse(response);
      
      // Process and prioritize actions
      const processedActions = (Array.isArray(actions) ? actions : actions.actionItems || [])
        .map(action => ({
          ...action,
          deadline: this.parseDeadline(action.deadline),
          priority: this.calculatePriority(action),
          category: this.categorizeAction(action.description)
        }))
        .sort((a, b) => {
          // Sort by priority and deadline
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority] - priorityOrder[a.priority]) ||
                 (a.deadline?.getTime() || Infinity) - (b.deadline?.getTime() || Infinity);
        });
      
      return {
        actionItems: processedActions,
        summary: this.generateActionSummary(processedActions)
      };
      
    } catch (error) {
      console.error('Action identification error:', error);
      throw error;
    }
  }

  /**
   * Extract confirmation details
   */
  async extractConfirmations(emailContent, context) {
    const confirmations = {
      numbers: this.extractConfirmationNumbers(emailContent),
      dates: this.extractDates(emailContent),
      amounts: this.extractAmounts(emailContent),
      contacts: this.extractContacts(emailContent)
    };
    
    // Use AI to validate and structure
    const prompt = `Validate and structure these confirmation details extracted from an email:

Confirmation Numbers: ${confirmations.numbers.join(', ')}
Dates: ${confirmations.dates.join(', ')}
Amounts: ${confirmations.amounts.join(', ')}

Original email excerpt:
${emailContent.substring(0, 1000)}

Provide a structured summary of what each confirmation number represents.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.3,
        maxTokens: 600
      });
      
      const structured = this.parseAIResponse(response);
      
      return {
        confirmations: {
          ...confirmations,
          structured: structured,
          verified: this.verifyConfirmations(confirmations)
        }
      };
      
    } catch (error) {
      console.error('Confirmation extraction error:', error);
      return { confirmations };
    }
  }

  // Helper methods

  /**
   * Calculate pattern matching score
   */
  calculatePatternScore(content) {
    let score = 0;
    let matches = 0;
    
    for (const [category, patterns] of Object.entries(this.emailPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          matches++;
          score += category === 'general' ? 0.05 : 0.1;
        }
      }
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Detect patterns in email content
   */
  detectPatterns(content) {
    const detected = {
      type: 'unknown',
      matches: [],
      details: {}
    };
    
    // Check airline patterns
    for (const pattern of this.emailPatterns.airlines) {
      if (pattern.test(content)) {
        detected.type = 'flight-booking';
        detected.matches.push(pattern.source);
      }
    }
    
    // Check hotel patterns
    for (const pattern of this.emailPatterns.hotels) {
      if (pattern.test(content)) {
        detected.type = detected.type === 'flight-booking' ? 'multi-booking' : 'hotel-booking';
        detected.matches.push(pattern.source);
      }
    }
    
    return detected;
  }

  /**
   * Extract confirmation numbers
   */
  extractConfirmationNumbers(content) {
    const patterns = [
      /(?:confirmation|reference|booking|PNR)[\s:#-]*([A-Z0-9]{6,})/gi,
      /\b[A-Z0-9]{6}\b/g, // 6-character alphanumeric
      /\b[A-Z]{2}\d{4,}\b/g, // Airline format
      /\b\d{10,}\b/g // Long numeric
    ];
    
    const numbers = new Set();
    
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      matches.forEach(match => {
        const cleaned = match.replace(/[^A-Z0-9]/gi, '');
        if (cleaned.length >= 6) {
          numbers.add(cleaned);
        }
      });
    }
    
    return Array.from(numbers);
  }

  /**
   * Extract dates from content
   */
  extractDates(content) {
    const patterns = [
      /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi,
      /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi
    ];
    
    const dates = [];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      dates.push(...matches);
    }
    
    return dates;
  }

  /**
   * Extract amounts from content
   */
  extractAmounts(content) {
    const patterns = [
      /(?:USD|EUR|GBP|CAD|AUD)?\s*\$?\s*\d+(?:,\d{3})*(?:\.\d{2})?/g,
      /\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|CAD|AUD)\b/g
    ];
    
    const amounts = [];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      amounts.push(...matches);
    }
    
    return amounts;
  }

  /**
   * Extract contact information
   */
  extractContacts(content) {
    return {
      emails: content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [],
      phones: content.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [],
      websites: content.match(/https?:\/\/[^\s]+/g) || []
    };
  }

  /**
   * Parse AI response safely
   */
  parseAIResponse(response) {
    try {
      if (typeof response === 'string') {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        return {};
      }
      return response;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {};
    }
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(parsed, patterns) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on extracted data
    if (parsed.bookingDetails?.confirmationNumbers?.length > 0) confidence += 0.2;
    if (parsed.bookingDetails?.dates?.length > 0) confidence += 0.1;
    if (parsed.financialInformation?.totalAmount) confidence += 0.1;
    if (patterns.matches.length > 3) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Parse deadline from text
   */
  parseDeadline(deadlineText) {
    if (!deadlineText) return null;
    
    try {
      // Try to parse various date formats
      const date = new Date(deadlineText);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      // Handle relative dates
      const relativePatterns = {
        'within 24 hours': 1,
        'within 48 hours': 2,
        'within 72 hours': 3,
        'within a week': 7,
        'within 7 days': 7
      };
      
      for (const [pattern, days] of Object.entries(relativePatterns)) {
        if (deadlineText.toLowerCase().includes(pattern)) {
          const deadline = new Date();
          deadline.setDate(deadline.getDate() + days);
          return deadline;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate action priority
   */
  calculatePriority(action) {
    if (action.priority) return action.priority;
    
    const urgentKeywords = ['urgent', 'immediate', 'asap', 'critical', 'important'];
    const highKeywords = ['required', 'must', 'mandatory', 'necessary'];
    
    const desc = (action.description || '').toLowerCase();
    
    if (urgentKeywords.some(keyword => desc.includes(keyword))) {
      return 'high';
    }
    
    if (highKeywords.some(keyword => desc.includes(keyword))) {
      return 'high';
    }
    
    if (action.deadline) {
      const daysUntil = (action.deadline - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntil < 2) return 'high';
      if (daysUntil < 7) return 'medium';
    }
    
    return 'low';
  }

  /**
   * Categorize action type
   */
  categorizeAction(description) {
    const categories = {
      'document': ['passport', 'visa', 'document', 'id', 'license'],
      'payment': ['pay', 'payment', 'fee', 'charge', 'cost'],
      'checkin': ['check-in', 'checkin', 'seat', 'boarding'],
      'information': ['provide', 'submit', 'send', 'confirm', 'update'],
      'review': ['review', 'verify', 'check', 'ensure']
    };
    
    const desc = description.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Generate action summary
   */
  generateActionSummary(actions) {
    if (actions.length === 0) {
      return 'No action items identified.';
    }
    
    const highPriority = actions.filter(a => a.priority === 'high').length;
    const withDeadlines = actions.filter(a => a.deadline).length;
    
    return `${actions.length} action item(s) identified: ${highPriority} high priority, ${withDeadlines} with deadlines.`;
  }
}

export default EmailMonitorAgent;