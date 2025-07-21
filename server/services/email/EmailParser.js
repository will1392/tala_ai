/**
 * Email Parser Service
 * 
 * Parses and analyzes email content
 */

// Simple HTML parsing without external dependencies
class SimpleHTMLParser {
  static stripTags(html) {
    // Remove script and style elements
    let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Replace common block elements with newlines
    text = text.replace(/<\/?(div|p|br|h[1-6])[^>]*>/gi, '\n');
    
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Decode HTML entities
    text = text.replace(/&nbsp;/g, ' ')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");
    
    // Clean up whitespace
    text = text.replace(/\n\s*\n/g, '\n\n').trim();
    
    return text;
  }
}

class EmailParser {
  constructor(chatService = null) {
    this.chatService = chatService;
    
    // Email type patterns
    this.emailTypePatterns = {
      booking_confirmation: [
        /booking\s*(confirmation|reference|number)/i,
        /reservation\s*(confirmation|number)/i,
        /itinerary/i,
        /check-in.*check-out/i
      ],
      flight_ticket: [
        /boarding\s*pass/i,
        /flight\s*(confirmation|booking)/i,
        /airline.*ticket/i,
        /departure.*arrival/i
      ],
      inquiry: [
        /\?(?:\s|$)/,
        /please\s*(let|tell|inform|advise)/i,
        /could\s*you/i,
        /would\s*you/i,
        /can\s*you/i
      ],
      newsletter: [
        /unsubscribe/i,
        /newsletter/i,
        /marketing\s*email/i,
        /promotional/i
      ],
      receipt: [
        /receipt/i,
        /invoice/i,
        /payment\s*confirmation/i,
        /order\s*#/i
      ],
      meeting_invite: [
        /meeting\s*invitation/i,
        /calendar\s*invite/i,
        /you.*invited.*meeting/i,
        /join.*meeting/i
      ]
    };
    
    // Entity extraction patterns
    this.entityPatterns = {
      dates: [
        /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g,
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi,
        /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{2,4}/gi,
        /\b(today|tomorrow|yesterday|next\s+\w+|last\s+\w+)\b/gi
      ],
      times: [
        /\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi,
        /\b\d{1,2}\s*(am|pm)\b/gi,
        /\b(morning|afternoon|evening|night)\b/gi
      ],
      urls: [
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
      ],
      emails: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
      ],
      phones: [
        /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        /\b\(\d{3}\)\s*\d{3}[-.\s]?\d{4}\b/g,
        /\b\+\d{1,3}\s*\d{3,14}\b/g
      ],
      amounts: [
        /\$\s*\d+(?:,\d{3})*(?:\.\d{2})?/g,
        /USD\s*\d+(?:,\d{3})*(?:\.\d{2})?/g,
        /€\s*\d+(?:,\d{3})*(?:\.\d{2})?/g,
        /£\s*\d+(?:,\d{3})*(?:\.\d{2})?/g
      ],
      flightNumbers: [
        /\b[A-Z]{2}\s*\d{3,4}\b/g,
        /\b[A-Z]{3}\s*\d{3,4}\b/g
      ],
      bookingReferences: [
        /\b[A-Z0-9]{6,8}\b/g,
        /booking\s*(#|number|ref|reference):\s*([A-Z0-9]+)/gi,
        /confirmation\s*(#|number|code):\s*([A-Z0-9]+)/gi
      ]
    };
  }
  
  /**
   * Parse raw email content
   */
  async parseEmail(rawEmail) {
    try {
      const parsed = {
        headers: {},
        body: {
          text: '',
          html: ''
        },
        attachments: []
      };
      
      // Parse headers
      if (rawEmail.headers) {
        parsed.headers = this.parseHeaders(rawEmail.headers);
      }
      
      // Parse body
      if (rawEmail.body) {
        if (typeof rawEmail.body === 'string') {
          parsed.body.text = rawEmail.body;
          parsed.body.html = rawEmail.body;
        } else {
          parsed.body = rawEmail.body;
        }
      }
      
      // Clean HTML content
      if (parsed.body.html) {
        parsed.body.text = this.htmlToText(parsed.body.html);
      }
      
      // Parse attachments
      if (rawEmail.attachments) {
        parsed.attachments = rawEmail.attachments;
      }
      
      return parsed;
    } catch (error) {
      console.error('Error parsing email:', error);
      throw error;
    }
  }
  
  /**
   * Parse email headers
   */
  parseHeaders(headers) {
    const parsed = {};
    
    if (Array.isArray(headers)) {
      headers.forEach(header => {
        const name = header.name.toLowerCase();
        parsed[name] = header.value;
      });
    } else if (typeof headers === 'object') {
      Object.keys(headers).forEach(key => {
        parsed[key.toLowerCase()] = headers[key];
      });
    }
    
    return parsed;
  }
  
  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    if (!html) return '';
    
    // Use simple HTML parser
    return SimpleHTMLParser.stripTags(html);
  }
  
  /**
   * Clean and sanitize HTML content
   */
  sanitizeHtml(html) {
    // Basic sanitization without external libraries
    let sanitized = html;
    
    // Remove dangerous elements
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed\b[^<]*>/gi, '');
    
    // Remove dangerous attributes
    sanitized = sanitized.replace(/\son\w+\s*=/gi, ' ');
    sanitized = sanitized.replace(/javascript:/gi, '');
    
    return sanitized;
  }
  
  /**
   * Analyze email content
   */
  async analyzeEmail(emailData) {
    const analysis = {
      type: 'general',
      sentiment: 'neutral',
      urgency: 'normal',
      topics: [],
      entities: {},
      summary: '',
      keyPoints: []
    };
    
    const content = emailData.body?.text || emailData.body || '';
    const subject = emailData.subject || '';
    const fullText = `${subject}\n${content}`;
    
    // Determine email type
    analysis.type = this.detectEmailType(fullText);
    
    // Detect urgency
    analysis.urgency = this.detectUrgency(fullText);
    
    // Extract entities
    analysis.entities = this.extractEntities(fullText);
    
    // Detect sentiment
    analysis.sentiment = this.detectSentiment(fullText);
    
    // Extract key points
    analysis.keyPoints = this.extractKeyPoints(fullText);
    
    // Generate summary
    analysis.summary = await this.generateSummary(emailData);
    
    // Extract topics
    analysis.topics = this.extractTopics(fullText);
    
    return analysis;
  }
  
  /**
   * Detect email type
   */
  detectEmailType(text) {
    for (const [type, patterns] of Object.entries(this.emailTypePatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return type;
        }
      }
    }
    
    return 'general';
  }
  
  /**
   * Detect urgency level
   */
  detectUrgency(text) {
    const urgentPatterns = [
      /urgent/i,
      /asap/i,
      /immediately/i,
      /critical/i,
      /emergency/i,
      /time.sensitive/i,
      /deadline/i,
      /by\s+end\s+of\s+day/i,
      /eod/i
    ];
    
    const highPatterns = [
      /important/i,
      /priority/i,
      /soon/i,
      /quick/i,
      /today/i
    ];
    
    for (const pattern of urgentPatterns) {
      if (pattern.test(text)) {
        return 'urgent';
      }
    }
    
    for (const pattern of highPatterns) {
      if (pattern.test(text)) {
        return 'high';
      }
    }
    
    return 'normal';
  }
  
  /**
   * Extract entities from text
   */
  extractEntities(text) {
    const entities = {};
    
    for (const [entityType, patterns] of Object.entries(this.entityPatterns)) {
      const matches = new Set();
      
      for (const pattern of patterns) {
        const found = text.match(pattern);
        if (found) {
          found.forEach(match => matches.add(match));
        }
      }
      
      if (matches.size > 0) {
        entities[entityType] = Array.from(matches);
      }
    }
    
    return entities;
  }
  
  /**
   * Detect sentiment
   */
  detectSentiment(text) {
    const positiveWords = [
      'thank', 'thanks', 'pleased', 'happy', 'excellent',
      'great', 'good', 'wonderful', 'appreciate', 'glad'
    ];
    
    const negativeWords = [
      'sorry', 'apologize', 'regret', 'unfortunately', 'problem',
      'issue', 'concern', 'disappointed', 'unhappy', 'complaint'
    ];
    
    const lowerText = text.toLowerCase();
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) positiveScore += matches.length;
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) negativeScore += matches.length;
    });
    
    if (positiveScore > negativeScore * 1.5) return 'positive';
    if (negativeScore > positiveScore * 1.5) return 'negative';
    return 'neutral';
  }
  
  /**
   * Extract key points from email
   */
  extractKeyPoints(text) {
    const keyPoints = [];
    const lines = text.split(/\n+/);
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Look for bullet points or numbered lists
      if (/^[-•*]\s+/.test(trimmed) || /^\d+[\.)]\s+/.test(trimmed)) {
        keyPoints.push(trimmed.replace(/^[-•*\d\.)]\s+/, ''));
      }
      
      // Look for action items
      if (/^(please|kindly|could you|would you|can you)/i.test(trimmed)) {
        keyPoints.push(trimmed);
      }
      
      // Look for important statements
      if (/(important|note|remember|deadline)/i.test(trimmed) && trimmed.length < 200) {
        keyPoints.push(trimmed);
      }
    });
    
    return keyPoints.slice(0, 5); // Limit to 5 key points
  }
  
  /**
   * Generate email summary
   */
  async generateSummary(emailData) {
    const content = emailData.body?.text || emailData.body || '';
    const subject = emailData.subject || '';
    
    // Simple rule-based summary
    if (content.length < 100) {
      return content;
    }
    
    // Extract first paragraph
    const paragraphs = content.split(/\n\n+/);
    const firstPara = paragraphs[0];
    
    if (firstPara.length < 200) {
      return firstPara;
    }
    
    // Extract first few sentences
    const sentences = firstPara.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 2).join(' ');
  }
  
  /**
   * Extract topics from email
   */
  extractTopics(text) {
    const topics = [];
    
    const topicPatterns = {
      travel: /\b(flight|hotel|booking|reservation|trip|travel|itinerary)\b/i,
      meeting: /\b(meeting|conference|call|discussion|appointment)\b/i,
      payment: /\b(payment|invoice|bill|receipt|transaction|refund)\b/i,
      project: /\b(project|task|deadline|milestone|deliverable)\b/i,
      support: /\b(help|support|issue|problem|ticket|assistance)\b/i,
      order: /\b(order|purchase|shipping|delivery|tracking)\b/i
    };
    
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(text)) {
        topics.push(topic);
      }
    }
    
    return topics;
  }
  
  /**
   * Extract action items using AI
   */
  async extractActionItems(emailContent) {
    if (!this.chatService) {
      // Fallback to rule-based extraction
      return this.extractActionItemsRuleBased(emailContent);
    }
    
    try {
      const prompt = `Extract action items from this email. Return as JSON array with fields: action, deadline, priority, assignee.
      
Email content:
${emailContent}`;
      
      const response = await this.chatService.sendMessage(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('AI extraction failed, using rule-based:', error);
      return this.extractActionItemsRuleBased(emailContent);
    }
  }
  
  /**
   * Rule-based action item extraction
   */
  extractActionItemsRuleBased(text) {
    const actionItems = [];
    const lines = text.split(/\n+/);
    
    const actionPatterns = [
      /please\s+(.+)/i,
      /could\s+you\s+(.+)/i,
      /would\s+you\s+(.+)/i,
      /can\s+you\s+(.+)/i,
      /need\s+to\s+(.+)/i,
      /must\s+(.+)/i,
      /should\s+(.+)/i,
      /required\s+to\s+(.+)/i
    ];
    
    lines.forEach(line => {
      for (const pattern of actionPatterns) {
        const match = line.match(pattern);
        if (match) {
          actionItems.push({
            action: match[1].trim(),
            deadline: this.extractDeadline(line),
            priority: this.detectUrgency(line),
            assignee: null
          });
          break;
        }
      }
    });
    
    return actionItems;
  }
  
  /**
   * Extract deadline from text
   */
  extractDeadline(text) {
    const deadlinePatterns = [
      /by\s+(\w+\s+\d+)/i,
      /before\s+(\w+\s+\d+)/i,
      /until\s+(\w+\s+\d+)/i,
      /deadline:\s*(.+)/i,
      /due\s+(.+)/i
    ];
    
    for (const pattern of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Extract structured data from specific email types
   */
  async extractStructuredData(emailData, emailType) {
    const extractors = {
      booking_confirmation: this.extractBookingData.bind(this),
      flight_ticket: this.extractFlightData.bind(this),
      meeting_invite: this.extractMeetingData.bind(this),
      receipt: this.extractReceiptData.bind(this)
    };
    
    const extractor = extractors[emailType];
    if (extractor) {
      return await extractor(emailData);
    }
    
    return null;
  }
  
  /**
   * Extract booking data
   */
  extractBookingData(emailData) {
    const content = emailData.body?.text || emailData.body || '';
    const data = {
      type: 'booking',
      bookingReference: null,
      checkIn: null,
      checkOut: null,
      location: null,
      guests: null
    };
    
    // Extract booking reference
    const refMatch = content.match(/booking\s*(#|number|ref|reference):\s*([A-Z0-9]+)/i);
    if (refMatch) {
      data.bookingReference = refMatch[2];
    }
    
    // Extract dates
    const dateMatches = content.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g);
    if (dateMatches && dateMatches.length >= 2) {
      data.checkIn = dateMatches[0];
      data.checkOut = dateMatches[1];
    }
    
    return data;
  }
  
  /**
   * Extract flight data
   */
  extractFlightData(emailData) {
    const content = emailData.body?.text || emailData.body || '';
    const data = {
      type: 'flight',
      flightNumber: null,
      departure: null,
      arrival: null,
      date: null,
      airline: null
    };
    
    // Extract flight number
    const flightMatch = content.match(/\b([A-Z]{2,3})\s*(\d{3,4})\b/);
    if (flightMatch) {
      data.flightNumber = flightMatch[0];
      data.airline = flightMatch[1];
    }
    
    // Extract airports
    const airportMatch = content.match(/\b([A-Z]{3})\s*to\s*([A-Z]{3})\b/i);
    if (airportMatch) {
      data.departure = airportMatch[1];
      data.arrival = airportMatch[2];
    }
    
    return data;
  }
  
  /**
   * Extract meeting data
   */
  extractMeetingData(emailData) {
    const content = emailData.body?.text || emailData.body || '';
    const data = {
      type: 'meeting',
      title: emailData.subject,
      date: null,
      time: null,
      location: null,
      attendees: []
    };
    
    // Extract date and time
    const entities = this.extractEntities(content);
    if (entities.dates && entities.dates.length > 0) {
      data.date = entities.dates[0];
    }
    if (entities.times && entities.times.length > 0) {
      data.time = entities.times[0];
    }
    
    // Extract meeting link
    if (entities.urls && entities.urls.length > 0) {
      const meetingUrl = entities.urls.find(url => 
        /zoom|teams|meet|webex/i.test(url)
      );
      if (meetingUrl) {
        data.location = meetingUrl;
      }
    }
    
    return data;
  }
  
  /**
   * Extract receipt data
   */
  extractReceiptData(emailData) {
    const content = emailData.body?.text || emailData.body || '';
    const data = {
      type: 'receipt',
      orderNumber: null,
      amount: null,
      date: null,
      merchant: null
    };
    
    // Extract order number
    const orderMatch = content.match(/order\s*(#|number):\s*([A-Z0-9-]+)/i);
    if (orderMatch) {
      data.orderNumber = orderMatch[2];
    }
    
    // Extract amount
    const entities = this.extractEntities(content);
    if (entities.amounts && entities.amounts.length > 0) {
      data.amount = entities.amounts[0];
    }
    
    // Extract merchant from sender
    if (emailData.from) {
      data.merchant = emailData.from.name || emailData.from.address;
    }
    
    return data;
  }
}

export default EmailParser;