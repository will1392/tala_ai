/**
 * OCR Configuration
 * 
 * Central configuration for OCR processing settings,
 * language support, and quality thresholds
 */

module.exports = {
  // Supported languages with their Tesseract codes and names
  languages: {
    supported: [
      { code: 'eng', name: 'English', iso: 'en' },
      { code: 'spa', name: 'Spanish', iso: 'es' },
      { code: 'fra', name: 'French', iso: 'fr' },
      { code: 'deu', name: 'German', iso: 'de' },
      { code: 'ita', name: 'Italian', iso: 'it' },
      { code: 'por', name: 'Portuguese', iso: 'pt' },
      { code: 'rus', name: 'Russian', iso: 'ru' },
      { code: 'ara', name: 'Arabic', iso: 'ar' },
      { code: 'hin', name: 'Hindi', iso: 'hi' },
      { code: 'chi_sim', name: 'Chinese (Simplified)', iso: 'zh' },
      { code: 'chi_tra', name: 'Chinese (Traditional)', iso: 'zh-TW' },
      { code: 'jpn', name: 'Japanese', iso: 'ja' },
      { code: 'kor', name: 'Korean', iso: 'ko' },
      { code: 'tha', name: 'Thai', iso: 'th' },
      { code: 'vie', name: 'Vietnamese', iso: 'vi' },
      { code: 'ind', name: 'Indonesian', iso: 'id' },
      { code: 'tur', name: 'Turkish', iso: 'tr' }
    ],
    // Default language for OCR
    default: 'eng',
    // Languages to preload for faster processing
    preload: ['eng', 'spa', 'fra'],
    // Enable automatic language detection
    autoDetect: true
  },

  // Quality thresholds
  quality: {
    // Minimum confidence score for acceptable OCR (0-100)
    minConfidence: 60,
    // Confidence below this requires manual review
    manualReviewThreshold: 30,
    // Maximum acceptable garbage character ratio
    maxGarbageRatio: 0.2,
    // Minimum text length to consider valid
    minTextLength: 50,
    // Minimum word count for valid extraction
    minWordCount: 10,
    // Text coherence threshold (0-1)
    coherenceThreshold: 0.5
  },

  // Processing settings
  processing: {
    // Maximum processing time per page (ms)
    timeout: 60000,
    // Maximum file size for OCR (bytes)
    maxFileSize: 50 * 1024 * 1024, // 50MB
    // Maximum pages to process in PDF
    maxPages: 100,
    // Enable preprocessing by default
    preprocessByDefault: true,
    // Page segmentation mode (Tesseract PSM)
    // 3 = Fully automatic page segmentation
    pageSegMode: 3,
    // Enable automatic rotation detection
    autoRotate: true,
    // Number of retry attempts for failed OCR
    maxRetries: 3,
    // Delay between retries (ms)
    retryDelay: 1000
  },

  // Image preprocessing settings
  preprocessing: {
    // Target DPI for image scaling
    targetDPI: 300,
    // Enable grayscale conversion
    grayscale: true,
    // Enable contrast enhancement
    enhanceContrast: true,
    // Contrast adjustment factor
    contrastFactor: 1.2,
    // Enable noise reduction
    denoise: true,
    // Enable sharpening
    sharpen: true,
    // Sharpen amount (0-10)
    sharpenAmount: 2,
    // Binary threshold for black/white conversion
    binaryThreshold: 128,
    // Enable deskew correction
    deskew: true,
    // Maximum skew angle to correct (degrees)
    maxSkewAngle: 5
  },

  // Document type specific settings
  documentTypes: {
    passport: {
      languages: ['eng', 'fra', 'spa'],
      pageSegMode: 3,
      preprocessing: {
        enhanceContrast: true,
        targetDPI: 400
      }
    },
    invoice: {
      languages: ['eng'],
      pageSegMode: 6, // Uniform block of text
      preprocessing: {
        deskew: true,
        grayscale: true
      }
    },
    receipt: {
      languages: ['eng'],
      pageSegMode: 6,
      preprocessing: {
        enhanceContrast: true,
        sharpen: true
      }
    },
    form: {
      languages: ['eng'],
      pageSegMode: 11, // Sparse text
      preprocessing: {
        denoise: true,
        binaryThreshold: 150
      }
    },
    brochure: {
      languages: ['eng', 'spa', 'fra'],
      pageSegMode: 1, // Automatic with OSD
      preprocessing: {
        enhanceContrast: false,
        targetDPI: 300
      }
    }
  },

  // Output formatting
  output: {
    // Include word-level confidence scores
    includeWordConfidence: true,
    // Include line-level data
    includeLineData: true,
    // Include paragraph detection
    includeParagraphs: true,
    // Include bounding box coordinates
    includeBoundingBoxes: true,
    // Clean output text by default
    cleanText: true,
    // Fix common OCR errors
    fixCommonErrors: true,
    // Remove garbage characters
    removeGarbage: true
  },

  // Performance settings
  performance: {
    // Maximum concurrent OCR workers
    maxWorkers: 4,
    // Worker idle timeout (ms)
    workerIdleTimeout: 300000, // 5 minutes
    // Enable result caching
    enableCache: true,
    // Cache TTL (ms)
    cacheTTL: 3600000, // 1 hour
    // Temporary file cleanup interval (ms)
    cleanupInterval: 600000 // 10 minutes
  },

  // Error handling
  errors: {
    // Fallback to basic extraction on OCR failure
    fallbackOnError: true,
    // Log verbose error details
    verboseLogging: process.env.NODE_ENV === 'development',
    // Include error details in response
    includeErrorDetails: process.env.NODE_ENV === 'development',
    // Maximum error retry attempts
    maxErrorRetries: 2
  },

  // Integration settings
  integration: {
    // Automatically apply OCR to low-quality documents
    autoOCRLowQuality: true,
    // Minimum quality score to skip OCR
    skipOCRThreshold: 80,
    // Store OCR results separately
    storeOCRResults: true,
    // Compare OCR with original extraction
    compareResults: true,
    // Use OCR if improvement threshold met
    improvementThreshold: 15
  }
};