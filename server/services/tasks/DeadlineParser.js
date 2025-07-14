/**
 * Deadline Parser Service
 * 
 * Parses natural language dates and deadlines from email content
 */

class DeadlineParser {
  constructor() {
    // Relative date patterns
    this.relativeDatePatterns = {
      today: [
        /\btoday\b/i,
        /\bthis\s+morning\b/i,
        /\bthis\s+afternoon\b/i,
        /\bthis\s+evening\b/i,
        /\btonight\b/i
      ],
      tomorrow: [
        /\btomorrow\b/i,
        /\btmrw\b/i,
        /\btomorrow\s+morning\b/i,
        /\btomorrow\s+afternoon\b/i,
        /\btomorrow\s+evening\b/i
      ],
      thisWeek: [
        /\bthis\s+week\b/i,
        /\bby\s+end\s+of\s+week\b/i,
        /\bthis\s+friday\b/i
      ],
      nextWeek: [
        /\bnext\s+week\b/i,
        /\bfollowing\s+week\b/i
      ],
      thisMonth: [
        /\bthis\s+month\b/i,
        /\bby\s+end\s+of\s+month\b/i,
        /\bby\s+month\s+end\b/i
      ],
      nextMonth: [
        /\bnext\s+month\b/i,
        /\bfollowing\s+month\b/i
      ]
    };

    // Day name patterns
    this.dayNames = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0
    };

    // Month names
    this.monthNames = {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sep: 8, sept: 8,
      october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11
    };

    // Urgency keywords
    this.urgencyKeywords = {
      immediate: [
        /\basap\b/i,
        /\bimmediately\b/i,
        /\burgent\b/i,
        /\bemergency\b/i,
        /\bright\s+now\b/i,
        /\bstraight\s+away\b/i
      ],
      today: [
        /\bby\s+today\b/i,
        /\btoday\s+please\b/i,
        /\bneeded\s+today\b/i,
        /\bdue\s+today\b/i
      ],
      soon: [
        /\bsoon\b/i,
        /\bquickly\b/i,
        /\bat\s+your\s+earliest\s+convenience\b/i,
        /\bwhen\s+you\s+can\b/i
      ]
    };

    // Time patterns
    this.timePatterns = [
      /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)\b/,
      /\b(\d{1,2})\s*(am|pm|AM|PM)\b/,
      /\b(\d{1,2}):(\d{2})\b/
    ];

    // Business days helper
    this.businessDays = [1, 2, 3, 4, 5]; // Monday to Friday
  }

  /**
   * Parse deadline from text
   * @param {string} text - Text to parse
   * @param {Date} referenceDate - Reference date (email date)
   * @returns {Object|null} Parsed deadline
   */
  parseDeadline(text, referenceDate = new Date()) {
    if (!text) return null;

    const results = [];

    // Extract all possible dates from text
    const absoluteDates = this.extractAbsoluteDates(text, referenceDate);
    const relativeDates = this.extractRelativeDates(text, referenceDate);
    const dayNameDates = this.extractDayNameDates(text, referenceDate);
    const urgencyDates = this.extractUrgencyDates(text, referenceDate);

    // Combine all results
    results.push(...absoluteDates, ...relativeDates, ...dayNameDates, ...urgencyDates);

    if (results.length === 0) return null;

    // Sort by confidence and select best match
    results.sort((a, b) => b.confidence - a.confidence);
    
    const bestMatch = results[0];
    
    // Add additional context
    return {
      ...bestMatch,
      isBusinessDay: this.isBusinessDay(bestMatch.date),
      daysFromNow: Math.ceil((bestMatch.date - referenceDate) / (1000 * 60 * 60 * 24)),
      context: this.extractContext(text, bestMatch.originalText)
    };
  }

  /**
   * Extract all dates from text
   * @param {string} text - Text to parse
   * @returns {Array} Array of date objects
   */
  extractAllDates(text) {
    const dates = [];
    const referenceDate = new Date();

    // Extract absolute dates
    const absoluteDates = this.extractAbsoluteDates(text, referenceDate);
    dates.push(...absoluteDates.map(d => d.originalText));

    // Extract relative dates
    const relativeDates = this.extractRelativeDates(text, referenceDate);
    dates.push(...relativeDates.map(d => d.originalText));

    // Extract day names
    const dayNameDates = this.extractDayNameDates(text, referenceDate);
    dates.push(...dayNameDates.map(d => d.originalText));

    return [...new Set(dates)]; // Remove duplicates
  }

  /**
   * Extract absolute dates (MM/DD/YYYY, Month DD, YYYY, etc.)
   * @private
   */
  extractAbsoluteDates(text, referenceDate) {
    const results = [];
    
    // Date patterns
    const patterns = [
      // MM/DD/YYYY or MM-DD-YYYY
      {
        pattern: /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g,
        parser: (match) => {
          const [, month, day, year] = match;
          const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
          return new Date(fullYear, parseInt(month) - 1, parseInt(day));
        },
        confidence: 0.9
      },
      
      // Month DD, YYYY or Month DD
      {
        pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/gi,
        parser: (match) => {
          const [, monthName, day, year] = match;
          const month = this.monthNames[monthName.toLowerCase()];
          const fullYear = year ? parseInt(year) : referenceDate.getFullYear();
          return new Date(fullYear, month, parseInt(day));
        },
        confidence: 0.8
      },
      
      // DD Month YYYY or DD Month
      {
        pattern: /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)(?:\s+(\d{4}))?\b/gi,
        parser: (match) => {
          const [, day, monthName, year] = match;
          const month = this.monthNames[monthName.toLowerCase()];
          const fullYear = year ? parseInt(year) : referenceDate.getFullYear();
          return new Date(fullYear, month, parseInt(day));
        },
        confidence: 0.8
      }
    ];

    patterns.forEach(({ pattern, parser, confidence }) => {
      let match;
      pattern.lastIndex = 0; // Reset regex
      
      while ((match = pattern.exec(text)) !== null) {
        try {
          const date = parser(match);
          if (this.isValidDate(date)) {
            results.push({
              date,
              originalText: match[0],
              type: 'absolute',
              confidence,
              matchIndex: match.index
            });
          }
        } catch (error) {
          // Invalid date, skip
        }
      }
    });

    return results;
  }

  /**
   * Extract relative dates (today, tomorrow, next week, etc.)
   * @private
   */
  extractRelativeDates(text, referenceDate) {
    const results = [];

    for (const [relativeType, patterns] of Object.entries(this.relativeDatePatterns)) {
      for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        
        for (const match of matches) {
          const date = this.calculateRelativeDate(relativeType, referenceDate);
          if (date) {
            results.push({
              date,
              originalText: match[0],
              type: 'relative',
              relativeType,
              confidence: 0.7,
              matchIndex: match.index
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Extract day name dates (Monday, next Friday, etc.)
   * @private
   */
  extractDayNameDates(text, referenceDate) {
    const results = [];
    
    // Pattern for day names with optional modifiers
    const dayPattern = /\b(?:(next|this|coming)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi;
    
    let match;
    while ((match = dayPattern.exec(text)) !== null) {
      const [fullMatch, modifier, dayName] = match;
      const targetDay = this.dayNames[dayName.toLowerCase()];
      
      if (targetDay !== undefined) {
        const date = this.calculateDayNameDate(targetDay, modifier, referenceDate);
        
        results.push({
          date,
          originalText: fullMatch,
          type: 'dayName',
          dayName: dayName.toLowerCase(),
          modifier: modifier?.toLowerCase(),
          confidence: 0.6,
          matchIndex: match.index
        });
      }
    }

    return results;
  }

  /**
   * Extract urgency-based dates
   * @private
   */
  extractUrgencyDates(text, referenceDate) {
    const results = [];

    for (const [urgencyType, patterns] of Object.entries(this.urgencyKeywords)) {
      for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        
        for (const match of matches) {
          const date = this.calculateUrgencyDate(urgencyType, referenceDate);
          if (date) {
            results.push({
              date,
              originalText: match[0],
              type: 'urgency',
              urgencyType,
              confidence: 0.5,
              matchIndex: match.index
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Calculate relative date
   * @private
   */
  calculateRelativeDate(relativeType, referenceDate) {
    const date = new Date(referenceDate);
    
    switch (relativeType) {
      case 'today':
        return date;
      
      case 'tomorrow':
        date.setDate(date.getDate() + 1);
        return date;
      
      case 'thisWeek':
        // End of current week (Friday)
        const daysUntilFriday = (5 - date.getDay() + 7) % 7;
        date.setDate(date.getDate() + daysUntilFriday);
        return date;
      
      case 'nextWeek':
        // Start of next week (Monday)
        const daysUntilNextMonday = (1 - date.getDay() + 7) % 7 || 7;
        date.setDate(date.getDate() + daysUntilNextMonday);
        return date;
      
      case 'thisMonth':
        // End of current month
        date.setMonth(date.getMonth() + 1, 0);
        return date;
      
      case 'nextMonth':
        // Start of next month
        date.setMonth(date.getMonth() + 1, 1);
        return date;
      
      default:
        return null;
    }
  }

  /**
   * Calculate day name date
   * @private
   */
  calculateDayNameDate(targetDay, modifier, referenceDate) {
    const date = new Date(referenceDate);
    const currentDay = date.getDay();
    
    let daysToAdd;
    
    if (modifier === 'next') {
      // Next occurrence of the day (always in the future)
      daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0) daysToAdd = 7; // If it's the same day, go to next week
    } else if (modifier === 'this' || modifier === 'coming') {
      // This week's occurrence
      daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0 && date.getHours() > 17) {
        // If it's already past 5 PM today, assume next week
        daysToAdd = 7;
      }
    } else {
      // No modifier - assume next occurrence
      daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0) {
        // Same day - check if it's reasonable time
        if (date.getHours() > 17) {
          daysToAdd = 7; // Assume next week
        }
      }
    }
    
    date.setDate(date.getDate() + daysToAdd);
    return date;
  }

  /**
   * Calculate urgency date
   * @private
   */
  calculateUrgencyDate(urgencyType, referenceDate) {
    const date = new Date(referenceDate);
    
    switch (urgencyType) {
      case 'immediate':
        // Within 1 hour
        date.setHours(date.getHours() + 1);
        return date;
      
      case 'today':
        // End of business day today
        date.setHours(17, 0, 0, 0);
        return date;
      
      case 'soon':
        // Within 2-3 days
        date.setDate(date.getDate() + 2);
        return date;
      
      default:
        return null;
    }
  }

  /**
   * Extract context around date mention
   * @private
   */
  extractContext(text, dateText) {
    const index = text.toLowerCase().indexOf(dateText.toLowerCase());
    if (index === -1) return '';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + dateText.length + 50);
    
    return text.substring(start, end).trim();
  }

  /**
   * Check if date is valid
   * @private
   */
  isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Check if date is a business day
   * @param {Date} date - Date to check
   * @returns {boolean} True if business day
   */
  isBusinessDay(date) {
    return this.businessDays.includes(date.getDay());
  }

  /**
   * Get next business day
   * @param {Date} date - Starting date
   * @returns {Date} Next business day
   */
  getNextBusinessDay(date) {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    while (!this.isBusinessDay(nextDay)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay;
  }

  /**
   * Add business days to a date
   * @param {Date} date - Starting date
   * @param {number} days - Number of business days to add
   * @returns {Date} Result date
   */
  addBusinessDays(date, days) {
    const result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      if (this.isBusinessDay(result)) {
        addedDays++;
      }
    }
    
    return result;
  }

  /**
   * Parse recurring deadlines
   * @param {string} text - Text to parse
   * @param {Date} referenceDate - Reference date
   * @returns {Object|null} Recurring deadline info
   */
  parseRecurringDeadline(text, referenceDate = new Date()) {
    const recurringPatterns = [
      {
        pattern: /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
        type: 'weekly',
        interval: 1
      },
      {
        pattern: /\bweekly\b/i,
        type: 'weekly',
        interval: 1
      },
      {
        pattern: /\bbi-?weekly\b/i,
        type: 'weekly',
        interval: 2
      },
      {
        pattern: /\bmonthly\b/i,
        type: 'monthly',
        interval: 1
      },
      {
        pattern: /\bquarterly\b/i,
        type: 'monthly',
        interval: 3
      },
      {
        pattern: /\bevery\s+(\d+)\s+(days?|weeks?|months?)\b/gi,
        type: 'custom',
        parser: (match) => {
          const [, number, unit] = match;
          return {
            interval: parseInt(number),
            unit: unit.toLowerCase().replace(/s$/, '') // Remove plural
          };
        }
      }
    ];

    for (const pattern of recurringPatterns) {
      const match = text.match(pattern.pattern);
      if (match) {
        if (pattern.parser) {
          const parsed = pattern.parser(match);
          return {
            type: parsed.unit,
            interval: parsed.interval,
            originalText: match[0],
            nextDate: this.calculateNextRecurrence(parsed.unit, parsed.interval, referenceDate)
          };
        } else {
          return {
            type: pattern.type,
            interval: pattern.interval,
            originalText: match[0],
            nextDate: this.calculateNextRecurrence(pattern.type, pattern.interval, referenceDate)
          };
        }
      }
    }

    return null;
  }

  /**
   * Calculate next recurrence
   * @private
   */
  calculateNextRecurrence(type, interval, referenceDate) {
    const date = new Date(referenceDate);
    
    switch (type) {
      case 'day':
        date.setDate(date.getDate() + interval);
        break;
      case 'weekly':
        date.setDate(date.getDate() + (interval * 7));
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + interval);
        break;
      default:
        return null;
    }
    
    return date;
  }

  /**
   * Parse time from text
   * @param {string} text - Text to parse
   * @returns {Object|null} Parsed time
   */
  parseTime(text) {
    for (const pattern of this.timePatterns) {
      const match = text.match(pattern);
      if (match) {
        let [, hours, minutes = '00', period = ''] = match;
        hours = parseInt(hours);
        minutes = parseInt(minutes);
        
        // Convert to 24-hour format
        if (period.toLowerCase() === 'pm' && hours !== 12) {
          hours += 12;
        } else if (period.toLowerCase() === 'am' && hours === 12) {
          hours = 0;
        }
        
        return {
          hours,
          minutes,
          originalText: match[0],
          is24Hour: !period
        };
      }
    }
    
    return null;
  }
}

export default DeadlineParser;