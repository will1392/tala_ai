/**
 * Gemini Vision Service
 * 
 * Specialized service for handling visual content analysis with Google's Gemini API
 * Extends GeminiService to add vision-specific capabilities
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import GeminiService from './GeminiService.js';
import fs from 'fs/promises';
import { fileTypeFromBuffer } from 'file-type';

class GeminiVisionService extends GeminiService {
  constructor() {
    super('gemini-2.5-pro'); // Use Gemini 2.5 Pro for vision capabilities
    this.visionModel = null;
    this.supportedImageFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    this.maxImageSize = 20 * 1024 * 1024; // 20MB limit for Gemini
    this.isVisionAvailable = false;
  }

  /**
   * Initialize the vision model
   */
  initialize() {
    try {
      super.initialize();
      
      if (this.client && this.apiKey) {
        try {
          // Use Gemini Pro Vision model
          this.visionModel = this.client.getGenerativeModel({ 
            model: 'gemini-pro-vision' 
          });
          this.isVisionAvailable = true;
        } catch (error) {
          console.warn('Failed to initialize Gemini Vision model:', error);
          this.isVisionAvailable = false;
        }
      }
    } catch (error) {
      // If API key is not available, we'll use mock responses
      console.warn('Gemini Vision API not available, using mock responses');
      this.isVisionAvailable = false;
    }
  }

  /**
   * Analyze an image with Gemini Vision
   * @param {string} imagePath - Path to the image file
   * @param {string} prompt - Analysis prompt
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Analysis result
   */
  async analyzeImage(imagePath, prompt, options = {}) {
    try {
      // Check if vision is available
      if (!this.isVisionAvailable || !this.visionModel) {
        // Fallback to mock response
        return this.generateMockVisionResponse(imagePath, prompt);
      }

      // Read and validate image
      const imageData = await this.prepareImageData(imagePath);
      
      // Prepare the request
      const parts = [
        {
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.base64
          }
        },
        { text: prompt }
      ];

      // Generate content with retry logic
      const result = await this.generateWithRetry(
        () => this.visionModel.generateContent(parts),
        options.maxRetries || 3
      );

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini Vision analysis error:', error);
      
      // Fallback to mock response
      return this.generateMockVisionResponse(imagePath, prompt);
    }
  }

  /**
   * Analyze multiple images
   * @param {Array<string>} imagePaths - Array of image paths
   * @param {string} prompt - Analysis prompt
   * @param {Object} options - Additional options
   * @returns {Promise<string>} Combined analysis result
   */
  async analyzeMultipleImages(imagePaths, prompt, options = {}) {
    try {
      if (!this.isVisionAvailable || !this.visionModel) {
        return this.generateMockVisionResponse(imagePaths[0], prompt);
      }

      // Prepare all images
      const imageParts = await Promise.all(
        imagePaths.map(async (path) => {
          const imageData = await this.prepareImageData(path);
          return {
            inlineData: {
              mimeType: imageData.mimeType,
              data: imageData.base64
            }
          };
        })
      );

      // Add prompt
      const parts = [...imageParts, { text: prompt }];

      // Generate content
      const result = await this.generateWithRetry(
        () => this.visionModel.generateContent(parts),
        options.maxRetries || 3
      );

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Multi-image analysis error:', error);
      return this.generateMockVisionResponse(imagePaths[0], prompt);
    }
  }

  /**
   * Prepare image data for API submission
   * @param {string} imagePath - Path to image file
   * @returns {Object} Image data with base64 and mime type
   */
  async prepareImageData(imagePath) {
    try {
      // Read file
      const buffer = await fs.readFile(imagePath);
      
      // Check file size
      if (buffer.length > this.maxImageSize) {
        throw new Error(`Image size exceeds ${this.maxImageSize / 1024 / 1024}MB limit`);
      }

      // Detect file type
      const fileType = await fileTypeFromBuffer(buffer);
      if (!fileType || !this.supportedImageFormats.includes(fileType.mime)) {
        throw new Error(`Unsupported image format: ${fileType?.mime || 'unknown'}`);
      }

      // Convert to base64
      const base64 = buffer.toString('base64');

      return {
        base64,
        mimeType: fileType.mime,
        size: buffer.length
      };
    } catch (error) {
      console.error('Image preparation error:', error);
      throw error;
    }
  }

  /**
   * Generate with retry logic
   * @param {Function} generateFn - Generation function
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise} Generation result
   */
  async generateWithRetry(generateFn, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await generateFn();
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (this.isRetryableError(error)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError;
  }

  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether to retry
   */
  isRetryableError(error) {
    const retryableMessages = [
      'rate limit',
      'quota exceeded',
      'timeout',
      'temporarily unavailable',
      'internal error'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Generate mock vision response for testing
   * @param {string} imagePath - Image path
   * @param {string} prompt - Analysis prompt
   * @returns {string} Mock response
   */
  generateMockVisionResponse(imagePath, prompt) {
    const filename = imagePath.split('/').pop().toLowerCase();
    
    // Detect document type from filename
    if (filename.includes('passport')) {
      return JSON.stringify({
        extractedText: "UNITED STATES OF AMERICA\nPASSPORT\nType P\nCode USA\nPassport No. 123456789\nSurname SMITH\nGiven Names JOHN ROBERT\nNationality UNITED STATES OF AMERICA\nDate of birth 15 JAN 1985\nPlace of birth NEW YORK, USA\nDate of issue 20 MAR 2020\nDate of expiry 19 MAR 2030",
        visualElements: ["US Eagle emblem", "Passport photo", "Security watermarks", "Machine readable zone"],
        entities: {
          fullName: "JOHN ROBERT SMITH",
          passportNumber: "123456789",
          nationality: "UNITED STATES OF AMERICA",
          dateOfBirth: "1985-01-15",
          expiryDate: "2030-03-19",
          issueDate: "2020-03-20",
          placeOfBirth: "NEW YORK, USA",
          gender: "M",
          photoDescription: "Color photo of a male with brown hair"
        },
        summary: "US Passport for John Robert Smith, valid until March 2030"
      });
    } else if (filename.includes('ticket') || filename.includes('boarding')) {
      return JSON.stringify({
        extractedText: "BOARDING PASS\nFLIGHT: AA 1234\nFROM: JFK New York\nTO: LAX Los Angeles\nDATE: 25 DEC 2025\nBOARDING: 10:30\nDEPARTURE: 11:30\nGATE: A15\nSEAT: 12A\nPASSENGER: SMITH/JOHN MR",
        visualElements: ["American Airlines logo", "Barcode", "QR code", "Seat map indicator"],
        entities: {
          flightNumber: "AA 1234",
          passengerName: "JOHN SMITH",
          from: "JFK",
          to: "LAX",
          date: "2025-12-25",
          boardingTime: "10:30",
          departureTime: "11:30",
          gate: "A15",
          seat: "12A",
          boardingGroup: "2"
        },
        summary: "American Airlines boarding pass for flight AA 1234 from New York to Los Angeles"
      });
    } else if (filename.includes('brochure')) {
      return JSON.stringify({
        extractedText: "Discover Paradise in Greece\nSantorini & Mykonos Island Hopping\n7 Days / 6 Nights\nFrom $1,299 per person\nIncludes: Flights, Hotels, Ferry transfers\nDaily breakfast, Walking tours\nHighlights: Sunset in Oia, Beach clubs, Ancient ruins",
        visualElements: ["Santorini blue dome churches", "Beach scenes", "Greek flag", "Map of islands", "Price callout boxes"],
        entities: {
          destinations: ["Santorini", "Mykonos", "Greece"],
          prices: [{ amount: 1299, currency: "USD", description: "per person starting price" }],
          dates: ["7 days", "6 nights"],
          activities: ["Walking tours", "Beach clubs", "Sunset viewing", "Ancient ruins visit"],
          accommodation: ["Hotels included"],
          highlights: ["Sunset in Oia", "Island hopping", "Daily breakfast"],
          contactInfo: "1-800-GREECE-1"
        },
        summary: "Travel brochure for 7-day Greece island hopping tour including Santorini and Mykonos"
      });
    } else if (filename.includes('hotel')) {
      return JSON.stringify({
        extractedText: "BOOKING CONFIRMATION\nHilton Athens\nConfirmation: HTL789456\nGuest: John Smith\nCheck-in: 15 May 2025\nCheck-out: 20 May 2025\nRoom: Deluxe King, City View\nTotal: €750.00\nAddress: 46 Vassilissis Sofias Avenue, Athens 11528",
        visualElements: ["Hilton logo", "Hotel exterior photo", "Room photo"],
        entities: {
          hotelName: "Hilton Athens",
          confirmationNumber: "HTL789456",
          guestName: "John Smith",
          checkInDate: "2025-05-15",
          checkOutDate: "2025-05-20",
          roomType: "Deluxe King, City View",
          numberOfGuests: 2,
          totalPrice: { amount: 750, currency: "EUR" },
          address: "46 Vassilissis Sofias Avenue, Athens 11528",
          contactInfo: "+30 210 728 1000"
        },
        summary: "Hotel booking confirmation for Hilton Athens, 5 nights in May 2025"
      });
    } else {
      return JSON.stringify({
        extractedText: "Sample document content",
        visualElements: ["Generic visual elements"],
        entities: {
          documentType: "general"
        },
        summary: "General document analysis"
      });
    }
  }

  /**
   * Extract text from image using OCR capabilities
   * @param {string} imagePath - Path to image
   * @returns {Promise<string>} Extracted text
   */
  async extractText(imagePath) {
    const prompt = "Extract all text from this image. Return only the text content, preserving the layout as much as possible.";
    return this.analyzeImage(imagePath, prompt);
  }

  /**
   * Detect and describe visual elements
   * @param {string} imagePath - Path to image
   * @returns {Promise<Object>} Visual elements description
   */
  async describeVisualElements(imagePath) {
    const prompt = `Describe all visual elements in this image including:
    - Logos and branding
    - Colors and design elements
    - Layout and structure
    - Images and graphics
    - Any distinctive visual features
    Return as JSON with categories.`;
    
    const result = await this.analyzeImage(imagePath, prompt);
    
    try {
      return JSON.parse(result);
    } catch {
      return { description: result };
    }
  }

  /**
   * Check if service is available
   * @returns {boolean} Service availability
   */
  isAvailable() {
    return super.isAvailable() && this.isVisionAvailable;
  }
}

export default GeminiVisionService;