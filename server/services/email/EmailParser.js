/**
 * Email Parser Service
 * 
 * Parses and analyzes email content
 */

import { JSDOM } from 'jsdom';
import DOMPurify from 'isomorphic-dompurify';

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

    // Common email signatures
    this.signaturePatterns = [
      /^--\s*$/m,
      /^best\s*regards?[\s,]*/im,
      /^kind\s*regards?[\s,]*/im,
      /^sincerely[\s,]*/im,
      /^thanks?[\s,]*/im,
      /^cheers[\s,]*/im,
      /^sent\s*from\s*my/im,
      /^get\s*outlook\s*for/im
    ];
  }

  /**
   * Parse Gmail message
   * @param {Object} message - Gmail message object
   * @returns {Object} Parsed message
   */
  parseGmailMessage(message) {
    const headers = message.payload.headers.reduce((acc, header) => {
      acc[header.name.toLowerCase()] = header.value;
      return acc;
    }, {});

    const parsed = {
      id: message.id,
      threadId: message.threadId,
      headers,
      subject: headers.subject || '',
      from: this.parseEmailAddress(headers.from),
      to: this.parseEmailAddresses(headers.to),
      cc: this.parseEmailAddresses(headers.cc),
      date: new Date(headers.date),
      messageId: headers['message-id'],
      snippet: message.snippet,
      labelIds: message.labelIds || [],
      isUnread: message.labelIds?.includes('UNREAD'),
      attachments: []
    };

    // Extract body and attachments
    const { textBody, htmlBody, attachments } = this.extractMessageParts(message.payload);
    
    parsed.textBody = textBody;
    parsed.htmlBody = htmlBody;
    parsed.attachments = attachments;
    
    // Clean and extract content
    parsed.cleanText = this.extractCleanText(htmlBody || textBody);
    parsed.previewText = this.generatePreview(parsed.cleanText);
    
    // Detect email type
    parsed.emailType = this.detectEmailType(parsed.cleanText, parsed.subject);
    
    // Extract signature
    const { content, signature } = this.extractSignature(parsed.cleanText);
    parsed.contentWithoutSignature = content;
    parsed.signature = signature;

    return parsed;
  }

  /**
   * Extract message parts recursively
   * @param {Object} payload - Message payload
   * @returns {Object} Extracted parts
   */
  extractMessageParts(payload) {
    let textBody = '';
    let htmlBody = '';
    const attachments = [];

    const extractParts = (parts) => {
      if (!parts) return;
      
      for (const part of parts) {
        if (part.parts) {
          extractParts(part.parts);
        } else {
          // Handle body content
          if (part.body && part.body.data) {
            const decoded = Buffer.from(part.body.data, 'base64').toString('utf-8');
            
            if (part.mimeType === 'text/plain') {
              textBody += decoded;
            } else if (part.mimeType === 'text/html') {
              htmlBody += decoded;
            }
          }
          
          // Handle attachments
          if (part.filename && part.body) {
            attachments.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body.size,
              attachmentId: part.body.attachmentId,
              isInline: part.headers?.some(h => 
                h.name === 'Content-Disposition' && h.value.includes('inline')
              ) || false
            });
          }
        }
      }
    };

    if (payload.parts) {
      extractParts(payload.parts);
    } else if (payload.body && payload.body.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.mimeType === 'text/html') {
        htmlBody = decoded;
      } else {
        textBody = decoded;
      }
    }

    return { textBody, htmlBody, attachments };
  }

  /**
   * Extract clean text from HTML
   * @param {string} html - HTML content
   * @returns {string} Clean text
   */
  extractCleanText(html) {
    if (!html) return '';
    
    // Parse HTML
    const dom = new JSDOM(html);
    const document = dom.window.document;
    
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style');
    scripts.forEach(el => el.remove());
    
    // Get text content
    let text = document.body.textContent || '';
    
    // Clean up whitespace
    text = text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return text;
  }

  /**
   * Sanitize HTML for safe display
   * @param {string} html - Raw HTML
   * @returns {string} Sanitized HTML
   */
  sanitizeHTML(html) {
    if (!html) return '';
    
    const window = new JSDOM('').window;
    const purify = DOMPurify(window);
    
    return purify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
        'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 
        'td', 'th', 'thead', 'tbody', 'img', 'pre', 'code'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror']
    });
  }

  /**
   * Parse email address
   * @param {string} addressStr - Email address string
   * @returns {Object} Parsed address
   */
  parseEmailAddress(addressStr) {
    if (!addressStr) return null;
    
    const match = addressStr.match(/^"?([^"<]+?)"?\s*<?([^>]+)>?$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim()
      };
    }
    
    return {
      name: '',
      email: addressStr.trim()
    };
  }

  /**
   * Parse multiple email addresses
   * @param {string} addressesStr - Email addresses string
   * @returns {Array} Parsed addresses
   */
  parseEmailAddresses(addressesStr) {
    if (!addressesStr) return [];
    
    return addressesStr
      .split(/,\s*/)
      .map(addr => this.parseEmailAddress(addr))
      .filter(addr => addr !== null);
  }

  /**
   * Generate preview text
   * @param {string} text - Email text
   * @returns {string} Preview text
   */
  generatePreview(text) {
    if (!text) return '';
    
    // Remove extra whitespace
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Get first 200 characters
    let preview = cleaned.substring(0, 200);
    
    // Try to end at a sentence
    const sentenceEnd = preview.lastIndexOf('.');
    if (sentenceEnd > 100) {
      preview = preview.substring(0, sentenceEnd + 1);
    } else if (preview.length === 200) {
      preview += '...';
    }
    
    return preview;
  }

  /**
   * Detect email type
   * @param {string} content - Email content
   * @param {string} subject - Email subject
   * @returns {string} Email type
   */
  detectEmailType(content, subject) {
    const combinedText = `${subject} ${content}`.toLowerCase();
    
    for (const [type, patterns] of Object.entries(this.emailTypePatterns)) {
      if (patterns.some(pattern => pattern.test(combinedText))) {
        return type;
      }
    }
    
    return 'general';
  }

  /**
   * Extract signature from email
   * @param {string} text - Email text
   * @returns {Object} Content and signature
   */
  extractSignature(text) {
    if (!text) return { content: '', signature: '' };
    
    let signatureStart = text.length;
    
    // Find signature start
    for (const pattern of this.signaturePatterns) {
      const match = text.match(pattern);
      if (match && match.index < signatureStart) {
        signatureStart = match.index;
      }
    }
    
    // Also check for multiple newlines before contact info
    const multiLineMatch = text.match(/\n{2,}[\w\s]+\n[\w\s,]+\n[\d\s()-]+$/);
    if (multiLineMatch && multiLineMatch.index < signatureStart) {
      signatureStart = multiLineMatch.index;
    }
    
    return {
      content: text.substring(0, signatureStart).trim(),
      signature: text.substring(signatureStart).trim()
    };
  }

  /**
   * Analyze email with AI
   * @param {Object} message - Parsed message
   * @returns {Object} Analysis result
   */
  async analyzeEmail(message) {
    // Check if chatService is available
    if (!this.chatService) {
      // Return basic analysis without AI
      return {
        summary: this.generateFallbackSummary(message),
        keyPoints: [],
        tasks: [],
        entities: this.extractEntities(message.contentWithoutSignature),
        dates: this.extractDates(message.contentWithoutSignature),
        priority: this.calculatePriority(message),
        suggestedResponse: null,
        requiresAttention: message.isUnread,
        noAI: true
      };
    }

    const prompt = `Analyze this email and extract the following information:

Subject: ${message.subject}
From: ${message.from.name} <${message.from.email}>
Date: ${message.date}
Content: ${message.contentWithoutSignature}

Please provide:
1. A brief summary (2-3 sentences)
2. Key information points
3. Any tasks or action items
4. Important dates or deadlines
5. Priority level (high/medium/low)
6. Suggested response (if needed)
7. Any attachments that need attention

Format the response as JSON.`;

    try {
      const response = await this.chatService.processMessage(prompt, null, {
        systemPrompt: 'You are an email analysis assistant. Extract key information and actionable items from emails.'
      });

      // Parse AI response
      let analysis;
      try {
        // Extract JSON from response
        const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[1]);
        } else {
          // Try direct parse
          analysis = JSON.parse(response);
        }
      } catch (e) {
        // Fallback to structured extraction
        analysis = this.extractStructuredAnalysis(response);
      }

      // Extract tasks
      const tasks = this.extractTasks(analysis.tasks || [], message);
      
      // Extract entities
      const entities = this.extractEntities(message.contentWithoutSignature);

      return {
        summary: analysis.summary || 'No summary available',
        keyPoints: analysis.keyPoints || [],
        tasks,
        entities,
        dates: analysis.dates || [],
        priority: analysis.priority || this.calculatePriority(message),
        suggestedResponse: analysis.suggestedResponse,
        requiresAttention: analysis.requiresAttention || false,
        analysis
      };
    } catch (error) {
      console.error('Email analysis failed:', error);
      
      // Fallback analysis
      return {
        summary: this.generateFallbackSummary(message),
        keyPoints: [],
        tasks: [],
        entities: this.extractEntities(message.contentWithoutSignature),
        dates: this.extractDates(message.contentWithoutSignature),
        priority: this.calculatePriority(message),
        suggestedResponse: null,
        requiresAttention: message.isUnread,
        error: error.message
      };
    }
  }

  /**
   * Extract structured analysis from text response
   * @param {string} response - AI response
   * @returns {Object} Structured analysis
   */
  extractStructuredAnalysis(response) {
    const analysis = {
      summary: '',
      keyPoints: [],
      tasks: [],
      dates: [],
      priority: 'medium'
    };

    // Extract sections
    const sections = response.split(/\n(?=\d\.|\*|Summary:|Key Points:|Tasks:|Priority:)/i);
    
    for (const section of sections) {
      if (section.match(/summary:/i)) {
        analysis.summary = section.replace(/summary:\s*/i, '').trim();
      } else if (section.match(/key\s*points?:/i)) {
        analysis.keyPoints = section
          .split('\n')
          .slice(1)
          .map(line => line.replace(/^[-*]\s*/, '').trim())
          .filter(line => line.length > 0);
      } else if (section.match(/tasks?:|action\s*items?:/i)) {
        analysis.tasks = section
          .split('\n')
          .slice(1)
          .map(line => line.replace(/^[-*]\s*/, '').trim())
          .filter(line => line.length > 0);
      } else if (section.match(/priority:/i)) {
        const priorityMatch = section.match(/priority:\s*(high|medium|low)/i);
        if (priorityMatch) {
          analysis.priority = priorityMatch[1].toLowerCase();
        }
      }
    }

    return analysis;
  }

  /**
   * Extract tasks from analysis
   * @param {Array} taskStrings - Task strings
   * @param {Object} message - Email message
   * @returns {Array} Structured tasks
   */
  extractTasks(taskStrings, message) {
    return taskStrings.map((taskStr, index) => ({
      title: taskStr,
      description: `From email: ${message.subject}`,
      source: {
        type: 'email',
        emailId: message.id,
        from: message.from.email,
        subject: message.subject
      },
      dueDate: this.extractDueDate(taskStr),
      priority: this.extractTaskPriority(taskStr)
    }));
  }

  /**
   * Extract entities from text
   * @param {string} text - Text content
   * @returns {Array} Extracted entities
   */
  extractEntities(text) {
    const entities = [];
    
    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex) || [];
    emails.forEach(email => {
      entities.push({ type: 'email', value: email });
    });
    
    // Extract phone numbers
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phones = text.match(phoneRegex) || [];
    phones.forEach(phone => {
      entities.push({ type: 'phone', value: phone });
    });
    
    // Extract URLs
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const urls = text.match(urlRegex) || [];
    urls.forEach(url => {
      entities.push({ type: 'url', value: url });
    });
    
    // Extract money amounts
    const moneyRegex = /\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP)/g;
    const amounts = text.match(moneyRegex) || [];
    amounts.forEach(amount => {
      entities.push({ type: 'money', value: amount });
    });
    
    return entities;
  }

  /**
   * Extract dates from text
   * @param {string} text - Text content
   * @returns {Array} Extracted dates
   */
  extractDates(text) {
    const dates = [];
    
    // Common date patterns
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
      /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi,
      /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}\b/gi,
      /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}\b/gi
    ];
    
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(dateStr => {
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            dates.push({
              original: dateStr,
              parsed: date,
              context: this.extractDateContext(text, dateStr)
            });
          }
        } catch (e) {
          // Invalid date
        }
      });
    });
    
    return dates;
  }

  /**
   * Extract date context
   * @param {string} text - Full text
   * @param {string} dateStr - Date string
   * @returns {string} Context
   */
  extractDateContext(text, dateStr) {
    const index = text.indexOf(dateStr);
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + dateStr.length + 50);
    return text.substring(start, end).trim();
  }

  /**
   * Extract due date from task string
   * @param {string} taskStr - Task string
   * @returns {Date|null} Due date
   */
  extractDueDate(taskStr) {
    const dates = this.extractDates(taskStr);
    if (dates.length > 0) {
      // Return the first future date
      const now = new Date();
      const futureDates = dates.filter(d => d.parsed > now);
      return futureDates.length > 0 ? futureDates[0].parsed : dates[0].parsed;
    }
    return null;
  }

  /**
   * Extract task priority
   * @param {string} taskStr - Task string
   * @returns {string} Priority
   */
  extractTaskPriority(taskStr) {
    const text = taskStr.toLowerCase();
    if (text.includes('urgent') || text.includes('asap') || text.includes('immediately')) {
      return 'high';
    }
    if (text.includes('important') || text.includes('priority')) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Calculate email priority
   * @param {Object} message - Email message
   * @returns {string} Priority level
   */
  calculatePriority(message) {
    const factors = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    // Check subject keywords
    const urgentKeywords = /urgent|asap|immediate|critical|important/i;
    if (urgentKeywords.test(message.subject)) {
      factors.high += 2;
    }
    
    // Check if from important domains
    const importantDomains = ['company.com', 'client.com']; // Configure as needed
    if (importantDomains.some(domain => message.from.email.includes(domain))) {
      factors.medium += 1;
    }
    
    // Check labels
    if (message.labelIds?.includes('IMPORTANT')) {
      factors.high += 1;
    }
    
    // Recent emails might be more important
    const hoursSinceReceived = (Date.now() - message.date.getTime()) / (1000 * 60 * 60);
    if (hoursSinceReceived < 24) {
      factors.medium += 1;
    }
    
    // Determine final priority
    if (factors.high > 0) return 'high';
    if (factors.medium > 0) return 'medium';
    return 'low';
  }

  /**
   * Generate fallback summary
   * @param {Object} message - Email message
   * @returns {string} Summary
   */
  generateFallbackSummary(message) {
    const preview = message.previewText || message.snippet || '';
    const wordCount = preview.split(/\s+/).length;
    
    if (wordCount < 20) {
      return preview;
    }
    
    // Get first two sentences
    const sentences = preview.match(/[^.!?]+[.!?]+/g) || [preview];
    return sentences.slice(0, 2).join(' ').trim();
  }

  /**
   * Format date for display
   * @param {Date} date - Date object
   * @returns {string} Formatted date
   */
  formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      // Today - show time
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    } else if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric' 
      });
    }
  }

  /**
   * Group messages by conversation
   * @param {Array} messages - Email messages
   * @returns {Array} Grouped conversations
   */
  groupByConversation(messages) {
    const conversations = new Map();
    
    messages.forEach(message => {
      const threadId = message.threadId;
      
      if (!conversations.has(threadId)) {
        conversations.set(threadId, {
          threadId,
          subject: message.subject,
          participants: new Set(),
          messages: [],
          lastDate: message.date,
          unreadCount: 0
        });
      }
      
      const conversation = conversations.get(threadId);
      conversation.messages.push(message);
      conversation.participants.add(message.from.email);
      message.to.forEach(to => conversation.participants.add(to.email));
      
      if (message.date > conversation.lastDate) {
        conversation.lastDate = message.date;
      }
      
      if (message.isUnread) {
        conversation.unreadCount++;
      }
    });
    
    // Sort conversations by last date
    return Array.from(conversations.values())
      .sort((a, b) => b.lastDate - a.lastDate);
  }
}

export default EmailParser;