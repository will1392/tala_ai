/**
 * Mock Gemini Vision Service
 * 
 * Simulates Google Gemini Vision API for testing without API keys
 */

class MockGeminiVision {
  constructor() {
    this.processedCount = 0;
    this.mockResponses = {
      passport: {
        description: "A passport document showing personal identification information. The document appears to be a US passport with standard biometric page layout including photo, personal details, and machine-readable zone.",
        objects: [
          { name: 'document', confidence: 0.98, type: 'passport' },
          { name: 'photo', confidence: 0.95, type: 'identification_photo' },
          { name: 'text', confidence: 0.97, type: 'printed_text' },
          { name: 'official_seal', confidence: 0.89, type: 'security_feature' }
        ],
        extractedText: `PASSPORT
United States of America

Type: P
Code: USA
Passport No: 123456789
Surname: DOE
Given Names: JOHN MICHAEL
Nationality: UNITED STATES OF AMERICA
Date of Birth: 01 JAN 1990
Place of Birth: NEW YORK, USA
Date of Issue: 15 MAR 2020
Date of Expiry: 15 MAR 2030`,
        quality: {
          overall: 8.5,
          sharpness: 8.0,
          brightness: 9.0,
          contrast: 8.5
        },
        metadata: {
          format: 'standard_passport',
          security_features: ['watermark', 'hologram', 'machine_readable_zone'],
          condition: 'good'
        }
      },
      ticket: {
        description: "An airline boarding pass or electronic ticket showing flight information, passenger details, and barcode for scanning at the gate.",
        objects: [
          { name: 'ticket', confidence: 0.96, type: 'boarding_pass' },
          { name: 'barcode', confidence: 0.94, type: 'qr_code' },
          { name: 'airline_logo', confidence: 0.88, type: 'logo' }
        ],
        extractedText: `BOARDING PASS
American Airlines

Name: DOE/JOHN MR
From: JFK New York
To: LAX Los Angeles
Flight: AA1234
Date: 15 MAR 2025
Gate: B42
Boarding: 09:30
Seat: 24A
Booking Ref: ABC123`,
        quality: {
          overall: 7.8,
          sharpness: 7.5,
          brightness: 8.0,
          contrast: 8.0
        }
      },
      hotel: {
        description: "A hotel booking confirmation document showing reservation details, guest information, and accommodation specifics.",
        objects: [
          { name: 'document', confidence: 0.93, type: 'hotel_booking' },
          { name: 'hotel_logo', confidence: 0.85, type: 'logo' },
          { name: 'text', confidence: 0.95, type: 'printed_text' }
        ],
        extractedText: `HOTEL RESERVATION CONFIRMATION

Hilton Los Angeles Airport
5711 W Century Blvd, Los Angeles, CA 90045

Confirmation Number: HTL456789
Guest Name: John Doe
Check-in: March 15, 2025
Check-out: March 18, 2025
Room Type: Deluxe King
Rate: $189/night
Total: $567.00`,
        quality: {
          overall: 8.2,
          sharpness: 8.5,
          brightness: 8.0,
          contrast: 8.0
        }
      },
      itinerary: {
        description: "A travel itinerary document showing a complete trip schedule with multiple bookings, activities, and travel arrangements.",
        objects: [
          { name: 'document', confidence: 0.91, type: 'itinerary' },
          { name: 'map', confidence: 0.82, type: 'route_map' },
          { name: 'calendar', confidence: 0.87, type: 'schedule' }
        ],
        extractedText: `TRIP ITINERARY
Los Angeles Business Trip - March 2025

Day 1 - March 15:
- 10:00 AM: Depart JFK (AA1234)
- 1:00 PM: Arrive LAX
- 3:00 PM: Check-in Hilton LAX
- 7:00 PM: Dinner at Spago

Day 2 - March 16:
- 9:00 AM: Business meeting
- 2:00 PM: Site visit
- 6:00 PM: Team dinner

Day 3 - March 17:
- 10:00 AM: Conference
- 4:00 PM: Free time

Day 4 - March 18:
- 11:00 AM: Check-out
- 2:00 PM: Depart LAX (AA5678)
- 10:00 PM: Arrive JFK`,
        quality: {
          overall: 8.7,
          sharpness: 9.0,
          brightness: 8.5,
          contrast: 8.5
        }
      },
      brochure: {
        description: "A travel brochure or promotional material showing tourist destinations, attractions, and travel packages with colorful imagery and descriptive text.",
        objects: [
          { name: 'brochure', confidence: 0.90, type: 'marketing_material' },
          { name: 'landmark', confidence: 0.88, type: 'tourist_attraction' },
          { name: 'pricing', confidence: 0.85, type: 'price_list' }
        ],
        extractedText: `DISCOVER PARIS
The City of Light Awaits

Eiffel Tower Tours
Daily departures at 9 AM and 2 PM
Adult: €25, Child: €15

Louvre Museum
Skip-the-line tickets
Adult: €35, Child: €20

Seine River Cruise
Evening dinner cruise
€89 per person

Special Package Deal:
3 attractions for €99
Book now and save 20%!`,
        quality: {
          overall: 9.0,
          sharpness: 9.2,
          brightness: 9.0,
          contrast: 8.8
        }
      }
    };
  }

  /**
   * Analyze image with mock response
   * @param {Object} options - Analysis options
   * @returns {Object} Mock analysis result
   */
  async analyzeImage(options) {
    const { imagePath, imageUrl, features = ['all'] } = options;
    
    // Simulate processing delay
    await this.simulateDelay(500, 1500);
    
    this.processedCount++;
    
    // Determine document type from filename or URL
    const identifier = imagePath || imageUrl || '';
    let responseType = 'passport'; // default
    
    if (identifier.includes('ticket') || identifier.includes('boarding')) {
      responseType = 'ticket';
    } else if (identifier.includes('hotel') || identifier.includes('accommodation')) {
      responseType = 'hotel';
    } else if (identifier.includes('itinerary') || identifier.includes('schedule')) {
      responseType = 'itinerary';
    } else if (identifier.includes('brochure') || identifier.includes('tourism')) {
      responseType = 'brochure';
    } else if (identifier.includes('passport')) {
      responseType = 'passport';
    }
    
    const baseResponse = this.mockResponses[responseType];
    
    // Build response based on requested features
    const response = {
      success: true,
      processingTime: Math.random() * 1000 + 500,
      features: {}
    };
    
    if (features.includes('all') || features.includes('description')) {
      response.description = baseResponse.description;
    }
    
    if (features.includes('all') || features.includes('objects')) {
      response.objects = baseResponse.objects;
    }
    
    if (features.includes('all') || features.includes('text')) {
      response.extractedText = baseResponse.extractedText;
    }
    
    if (features.includes('all') || features.includes('quality')) {
      response.quality = baseResponse.quality;
    }
    
    if (features.includes('all') || features.includes('metadata')) {
      response.metadata = {
        ...baseResponse.metadata,
        processedAt: new Date().toISOString(),
        mockService: true,
        documentType: responseType
      };
    }
    
    // Simulate occasional errors
    if (Math.random() < 0.05) { // 5% error rate
      throw new Error('Mock service temporarily unavailable');
    }
    
    return response;
  }

  /**
   * Batch analyze multiple images
   * @param {Array} images - Array of image paths/URLs
   * @param {Object} options - Analysis options
   * @returns {Array} Analysis results
   */
  async batchAnalyze(images, options = {}) {
    const results = [];
    
    for (const image of images) {
      try {
        const result = await this.analyzeImage({
          imagePath: image.path || image,
          imageUrl: image.url,
          features: options.features || ['all']
        });
        results.push({ image, result });
      } catch (error) {
        results.push({ 
          image, 
          error: error.message,
          result: null 
        });
      }
    }
    
    return results;
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      processedCount: this.processedCount,
      averageResponseTime: 1000,
      successRate: 0.95,
      supportedTypes: Object.keys(this.mockResponses),
      mockService: true
    };
  }

  /**
   * Simulate processing delay
   * @param {number} min - Minimum delay in ms
   * @param {number} max - Maximum delay in ms
   */
  async simulateDelay(min, max) {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Reset service statistics
   */
  reset() {
    this.processedCount = 0;
  }
}

export default MockGeminiVision;