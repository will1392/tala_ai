/**
 * Mock OCR Service
 * 
 * Simulates OCR functionality for testing without Tesseract
 */

class MockOCR {
  constructor() {
    this.processedCount = 0;
    this.mockTexts = {
      passport: {
        text: `PASSPORT
United States of America

Type: P
Code: USA
Passport No: 123456789
Surname: DOE
Given Names: JOHN MICHAEL
Nationality: UNITED STATES OF AMERICA
Date of Birth: 01 JAN 1990
Sex: M
Place of Birth: NEW YORK, USA
Date of Issue: 15 MAR 2020
Date of Expiry: 15 MAR 2030
Authority: DEPT OF STATE

P<USADOE<<JOHN<MICHAEL<<<<<<<<<<<<<<<<<<<<
1234567894USA9001015M3003159<<<<<<<<<<<<<<06`,
        confidence: 0.95,
        blocks: [
          { text: 'PASSPORT', confidence: 0.98, bbox: { x: 50, y: 20, w: 200, h: 40 } },
          { text: 'United States of America', confidence: 0.97, bbox: { x: 50, y: 60, w: 300, h: 30 } },
          { text: 'DOE', confidence: 0.96, bbox: { x: 100, y: 150, w: 100, h: 25 } },
          { text: 'JOHN MICHAEL', confidence: 0.94, bbox: { x: 100, y: 180, w: 150, h: 25 } }
        ]
      },
      ticket: {
        text: `BOARDING PASS
AMERICAN AIRLINES

PASSENGER NAME: DOE/JOHN MR
FROM: NEW YORK JFK
TO: LOS ANGELES LAX
FLIGHT: AA1234
DATE: 15MAR
GATE: B42
BOARDING TIME: 09:30
SEAT: 24A
CLASS: ECONOMY

BOOKING REFERENCE: ABC123
TICKET NUMBER: 0012345678901
FREQUENT FLYER: AA1234567

BOARDING ZONE: 4
SEQUENCE: 087`,
        confidence: 0.92,
        blocks: [
          { text: 'BOARDING PASS', confidence: 0.97, bbox: { x: 20, y: 10, w: 150, h: 30 } },
          { text: 'DOE/JOHN MR', confidence: 0.93, bbox: { x: 120, y: 80, w: 120, h: 20 } },
          { text: 'AA1234', confidence: 0.95, bbox: { x: 100, y: 140, w: 80, h: 20 } },
          { text: 'ABC123', confidence: 0.94, bbox: { x: 150, y: 220, w: 80, h: 20 } }
        ]
      },
      hotel: {
        text: `HOTEL RESERVATION CONFIRMATION

HILTON LOS ANGELES AIRPORT
5711 W Century Blvd
Los Angeles, CA 90045
Tel: +1 310-410-4000

CONFIRMATION NUMBER: HTL456789
GUEST NAME: Mr. John Doe
EMAIL: john.doe@email.com

CHECK-IN: Saturday, March 15, 2025
CHECK-OUT: Tuesday, March 18, 2025
NIGHTS: 3

ROOM TYPE: Deluxe King Room
ROOM RATE: $189.00 USD per night
OCCUPANCY: 2 Adults

TOTAL CHARGES:
Room: $567.00
Taxes: $85.05
TOTAL: $652.05 USD

CANCELLATION POLICY:
Cancel by 11:59 PM PST on March 13, 2025`,
        confidence: 0.94,
        blocks: [
          { text: 'HILTON LOS ANGELES AIRPORT', confidence: 0.96, bbox: { x: 50, y: 30, w: 300, h: 25 } },
          { text: 'HTL456789', confidence: 0.95, bbox: { x: 180, y: 120, w: 100, h: 20 } },
          { text: 'John Doe', confidence: 0.93, bbox: { x: 120, y: 140, w: 100, h: 20 } }
        ]
      },
      itinerary: {
        text: `TRAVEL ITINERARY
Business Trip - Los Angeles
March 15-18, 2025

TRAVELER: John Doe
COMPANY: ABC Corporation

DAY 1 - SATURDAY, MARCH 15
10:00 AM - Depart New York (JFK)
Flight: American Airlines AA1234
Confirmation: ABC123

1:00 PM - Arrive Los Angeles (LAX)
3:00 PM - Check-in Hilton LAX
Confirmation: HTL456789

7:00 PM - Welcome Dinner
Location: Spago Beverly Hills
Reservation: 7:00 PM for 4

DAY 2 - SUNDAY, MARCH 16
9:00 AM - Business Meeting
Location: Downtown Conference Center
Duration: 3 hours

2:00 PM - Site Visit
Location: Tech Campus, Santa Monica

6:00 PM - Team Dinner
Location: Nobu Malibu

DAY 3 - MONDAY, MARCH 17
10:00 AM - Industry Conference
Location: LA Convention Center
Badge pickup at 9:30 AM

4:00 PM - Free Time
Suggested: Getty Museum, Santa Monica Pier

DAY 4 - TUESDAY, MARCH 18
11:00 AM - Hotel Check-out
2:00 PM - Depart Los Angeles (LAX)
Flight: American Airlines AA5678
10:00 PM - Arrive New York (JFK)

EMERGENCY CONTACTS:
Office: +1-212-555-0100
Travel Agent: +1-800-555-0123`,
        confidence: 0.93,
        blocks: [
          { text: 'TRAVEL ITINERARY', confidence: 0.97, bbox: { x: 50, y: 10, w: 200, h: 30 } },
          { text: 'John Doe', confidence: 0.95, bbox: { x: 100, y: 80, w: 100, h: 20 } },
          { text: 'March 15-18, 2025', confidence: 0.94, bbox: { x: 50, y: 60, w: 150, h: 20 } }
        ]
      },
      foreign: {
        text: `PASSEPORT
République Française

Type: P
Code: FRA
N° de passeport: 09FR12345
Nom: MARTIN
Prénoms: MARIE CLAIRE
Nationalité: FRANÇAISE
Date de naissance: 15 JUIL 1985
Sexe: F
Lieu de naissance: PARIS
Date de délivrance: 20 AVR 2021
Date d'expiration: 20 AVR 2031
Autorité: PRÉFECTURE DE PARIS

P<FRAMARTIN<<MARIE<CLAIRE<<<<<<<<<<<<<<<<<
09FR123454FRA8507157F3104209<<<<<<<<<<<<<<08`,
        confidence: 0.91,
        blocks: [
          { text: 'PASSEPORT', confidence: 0.96, bbox: { x: 50, y: 20, w: 150, h: 40 } },
          { text: 'République Française', confidence: 0.93, bbox: { x: 50, y: 60, w: 250, h: 30 } },
          { text: 'MARTIN', confidence: 0.94, bbox: { x: 100, y: 150, w: 100, h: 25 } }
        ],
        language: 'fr'
      }
    };
  }

  /**
   * Process document image for text extraction
   * @param {Object} options - OCR options
   * @returns {Object} OCR result
   */
  async processDocument(options) {
    const { imagePath, imageUrl, languages = ['eng'], enhanceImage = true } = options;
    
    await this.simulateDelay(1000, 3000); // OCR takes longer
    
    this.processedCount++;
    
    // Determine document type from path/URL
    const identifier = imagePath || imageUrl || '';
    let docType = 'passport';
    
    if (identifier.includes('ticket') || identifier.includes('boarding')) {
      docType = 'ticket';
    } else if (identifier.includes('hotel')) {
      docType = 'hotel';
    } else if (identifier.includes('itinerary')) {
      docType = 'itinerary';
    } else if (identifier.includes('foreign') || languages.includes('fra')) {
      docType = 'foreign';
    }
    
    const mockData = this.mockTexts[docType];
    
    // Apply some randomization to confidence
    const confidenceVariation = (Math.random() - 0.5) * 0.1;
    const confidence = Math.max(0.7, Math.min(0.99, mockData.confidence + confidenceVariation));
    
    // Simulate enhancement effect
    const enhancementBonus = enhanceImage ? 0.02 : 0;
    
    // Build response
    const result = {
      text: mockData.text,
      confidence: confidence + enhancementBonus,
      blocks: mockData.blocks.map(block => ({
        ...block,
        confidence: Math.min(0.99, block.confidence + enhancementBonus + confidenceVariation)
      })),
      detectedLanguage: mockData.language || 'en',
      processingTime: Math.random() * 2000 + 1000,
      metadata: {
        languages: languages,
        imageEnhanced: enhanceImage,
        pageCount: 1,
        orientation: 'portrait',
        dpi: 300
      }
    };
    
    // Simulate errors occasionally
    if (Math.random() < 0.03) { // 3% error rate
      throw new Error('Mock OCR processing failed');
    }
    
    return result;
  }

  /**
   * Extract structured data from OCR text
   * @param {string} text - OCR text
   * @param {string} documentType - Type of document
   * @returns {Object} Structured data
   */
  extractStructuredData(text, documentType) {
    const structured = {
      type: documentType,
      fields: {},
      confidence: 0.85
    };
    
    // Pattern-based extraction
    const patterns = {
      passport: {
        number: /(?:Passport No|N° de passeport):\s*(\w+)/i,
        surname: /(?:Surname|Nom):\s*([A-Z]+)/i,
        givenNames: /(?:Given Names|Prénoms):\s*([A-Z\s]+)/i,
        dateOfBirth: /(?:Date of Birth|Date de naissance):\s*(\d{1,2}\s+\w+\s+\d{4})/i,
        expiry: /(?:Date of Expiry|Date d'expiration):\s*(\d{1,2}\s+\w+\s+\d{4})/i
      },
      ticket: {
        passenger: /(?:PASSENGER NAME|Name):\s*([A-Z\/\s]+)/i,
        flight: /(?:FLIGHT|Flight):\s*([A-Z]{2}\d{3,4})/i,
        date: /(?:DATE|Date):\s*(\d{1,2}[A-Z]{3})/i,
        seat: /(?:SEAT|Seat):\s*(\d{1,3}[A-Z])/i,
        booking: /(?:BOOKING REFERENCE|Booking Ref):\s*([A-Z0-9]{6})/i
      },
      hotel: {
        confirmation: /(?:CONFIRMATION NUMBER|Confirmation):\s*([A-Z0-9]+)/i,
        guest: /(?:GUEST NAME|Guest):\s*([^\n]+)/i,
        checkIn: /(?:CHECK-IN|Check-in):\s*([^\n]+)/i,
        checkOut: /(?:CHECK-OUT|Check-out):\s*([^\n]+)/i,
        nights: /(?:NIGHTS|Nights):\s*(\d+)/i
      }
    };
    
    const docPatterns = patterns[documentType] || patterns.passport;
    
    for (const [field, pattern] of Object.entries(docPatterns)) {
      const match = text.match(pattern);
      if (match) {
        structured.fields[field] = match[1].trim();
      }
    }
    
    return structured;
  }

  /**
   * Detect document orientation
   * @param {string} imagePath - Path to image
   * @returns {Object} Orientation info
   */
  async detectOrientation(imagePath) {
    await this.simulateDelay(100, 300);
    
    // Mock orientation detection
    const orientations = ['portrait', 'landscape', 'square'];
    const angles = [0, 90, 180, 270];
    
    return {
      orientation: orientations[Math.floor(Math.random() * orientations.length)],
      rotationAngle: angles[Math.floor(Math.random() * angles.length)],
      confidence: 0.85 + Math.random() * 0.14
    };
  }

  /**
   * Enhance image for better OCR
   * @param {string} imagePath - Path to image
   * @returns {Object} Enhancement result
   */
  async enhanceImage(imagePath) {
    await this.simulateDelay(500, 1000);
    
    return {
      enhanced: true,
      operations: ['deskew', 'denoise', 'contrast', 'sharpen'],
      qualityImprovement: 0.15 + Math.random() * 0.2,
      outputPath: imagePath + '_enhanced'
    };
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      processedCount: this.processedCount,
      averageConfidence: 0.93,
      supportedLanguages: ['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'chi_sim', 'jpn', 'kor'],
      averageProcessingTime: 2000,
      enhancementAvailable: true,
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

export default MockOCR;