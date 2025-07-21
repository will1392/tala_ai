/**
 * Translation Configuration
 * 
 * Central configuration for language detection and translation services
 */

export default {
  // Supported language pairs for translation
  languages: {
    // Primary languages for travel industry
    primary: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'de', name: 'German', nativeName: 'Deutsch' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
      { code: 'ja', name: 'Japanese', nativeName: '日本語' },
      { code: 'ko', name: 'Korean', nativeName: '한국어' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' }
    ],
    // Secondary languages
    secondary: [
      { code: 'ru', name: 'Russian', nativeName: 'Русский' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'th', name: 'Thai', nativeName: 'ไทย' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
      { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
      { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
      { code: 'pl', name: 'Polish', nativeName: 'Polski' },
      { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
      { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
      { code: 'da', name: 'Danish', nativeName: 'Dansk' }
    ],
    // Language pairs with special handling
    specialPairs: {
      'zh-CN': 'zh', // Simplified Chinese
      'zh-TW': 'zh-TW', // Traditional Chinese
      'pt-BR': 'pt', // Brazilian Portuguese
      'en-GB': 'en', // British English
      'en-US': 'en', // American English
      'es-MX': 'es', // Mexican Spanish
      'fr-CA': 'fr' // Canadian French
    }
  },

  // Translation quality thresholds
  quality: {
    // Minimum confidence for accepting a translation
    minConfidence: 0.7,
    // Confidence level for high-quality translations
    highConfidence: 0.9,
    // Maximum retries for failed translations
    maxRetries: 3,
    // Retry delay in milliseconds
    retryDelay: 1000
  },

  // Terms that should never be translated
  preservedTerms: {
    // Travel codes and identifiers
    codes: [
      // Booking references (6 alphanumeric)
      /\b[A-Z0-9]{6}\b/,
      // Flight numbers
      /\b[A-Z]{2,3}\s?\d{1,4}\b/,
      // Airport codes (IATA)
      /\b[A-Z]{3}\b/,
      // Passport numbers
      /\b[A-Z]\d{7,9}\b/,
      // Credit card last 4 digits
      /\*{4,}\d{4}\b/,
      // Confirmation numbers
      /\bCNF[-\s]?\d+\b/i,
      // Reference numbers
      /\bREF[-\s]?[A-Z0-9]+\b/i,
      // PNR (Passenger Name Record)
      /\bPNR[-\s]?[A-Z0-9]+\b/i
    ],
    // Specific terms to preserve
    terms: [
      // Airlines
      'American Airlines', 'United Airlines', 'Delta', 'Lufthansa', 'Air France',
      'British Airways', 'Emirates', 'Qatar Airways', 'Singapore Airlines',
      // Hotel chains
      'Hilton', 'Marriott', 'Hyatt', 'Sheraton', 'InterContinental',
      'Four Seasons', 'Ritz-Carlton', 'Westin', 'Holiday Inn',
      // Travel platforms
      'Expedia', 'Booking.com', 'TripAdvisor', 'Airbnb', 'Hotels.com',
      // Payment methods
      'Visa', 'MasterCard', 'American Express', 'PayPal',
      // Document types
      'COVID-19', 'PCR', 'RT-PCR', 'Visa', 'Passport', 'ID'
    ],
    // Patterns for dates and times
    datetime: [
      // Dates in various formats
      /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/,
      /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/,
      // Times
      /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/,
      // Time zones
      /\b(?:UTC|GMT|EST|CST|MST|PST|EDT|CDT|MDT|PDT)[+-]?\d{0,2}\b/
    ],
    // Contact information
    contact: [
      // Email addresses
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      // Phone numbers
      /\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/,
      // URLs
      /https?:\/\/[^\s]+/
    ]
  },

  // Cache settings
  cache: {
    // Enable translation caching
    enabled: true,
    // Cache expiration in milliseconds (24 hours)
    expiration: 24 * 60 * 60 * 1000,
    // Maximum cache size (number of entries)
    maxSize: 10000,
    // Cache key prefix
    prefix: 'trans_'
  },

  // Rate limiting for translation API
  rateLimit: {
    // Maximum requests per minute
    maxRequestsPerMinute: 100,
    // Maximum characters per minute
    maxCharactersPerMinute: 100000,
    // Maximum requests per day
    maxRequestsPerDay: 10000,
    // Burst allowance
    burstAllowance: 20
  },

  // Document-specific settings
  documents: {
    // Maximum document size for translation (characters)
    maxSize: 100000,
    // Chunk size for large documents
    chunkSize: 5000,
    // Maximum chunks to translate
    maxChunks: 100,
    // Fields to always translate
    alwaysTranslateFields: [
      'title',
      'description',
      'summary'
    ],
    // Fields to never translate
    neverTranslateFields: [
      'id',
      'documentId',
      'userId',
      'createdAt',
      'updatedAt',
      'fileHash',
      'checksum'
    ]
  },

  // Language detection settings
  detection: {
    // Minimum text length for reliable detection
    minTextLength: 30,
    // Confidence threshold for accepting detection
    minConfidence: 0.7,
    // Enable mixed language detection
    detectMixed: true,
    // Minimum percentage for mixed language reporting
    mixedLanguageThreshold: 10
  },

  // Batch processing settings
  batch: {
    // Maximum items per batch
    maxBatchSize: 100,
    // Batch processing timeout (ms)
    timeout: 30000,
    // Concurrent batch limit
    maxConcurrent: 5
  },

  // Error handling
  errors: {
    // Retry on specific error codes
    retryableCodes: [
      'RESOURCE_EXHAUSTED',
      'DEADLINE_EXCEEDED',
      'INTERNAL',
      'UNAVAILABLE'
    ],
    // Fallback behavior
    fallback: {
      // Use mock translation on API errors
      useMockOnError: true,
      // Return original text on translation failure
      returnOriginalOnFailure: true,
      // Mark failed translations
      markFailedTranslations: true
    }
  },

  // Mock translation settings (for testing)
  mock: {
    // Enable mock translations
    enabled: process.env.NODE_ENV === 'test' || !process.env.GOOGLE_CLOUD_CREDENTIALS,
    // Mock translation delay (ms)
    delay: 100,
    // Mock confidence score
    confidence: 0.95,
    // Add mock indicators
    addIndicators: true
  },

  // User preferences
  userPreferences: {
    // Default language for new users
    defaultLanguage: 'en',
    // Auto-detect user language from browser
    autoDetectFromBrowser: true,
    // Remember language preferences
    rememberPreferences: true,
    // Preference storage duration (days)
    preferenceDuration: 365
  },

  // Integration settings
  integration: {
    // Auto-translate on document upload
    autoTranslateOnUpload: false,
    // Translate documents in background
    backgroundTranslation: true,
    // Priority languages for auto-translation
    priorityLanguages: ['en', 'es', 'fr', 'de', 'zh'],
    // Store translations separately
    separateTranslationStorage: true
  }
};