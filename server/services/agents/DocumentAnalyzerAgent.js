/**
 * DocumentAnalyzerAgent - Specialized agent for analyzing travel documents
 * 
 * Processes various travel documents including passports, visas, tickets,
 * and handles both text extraction and image analysis.
 */

import BaseAgent from './BaseAgent.js';
import { createWorker } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import sharp from 'sharp';

export class DocumentAnalyzerAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      preferredLLM: 'gpt-5-mini-2025-08-07',
      confidence_threshold: 0.85,
      temperature: 0.2, // Low temperature for accurate extraction
      timeout: 45000 // Longer timeout for document processing
    });
    
    // OCR worker for image text extraction
    this.ocrWorker = null;
    
    // Document type patterns
    this.documentPatterns = {
      passport: {
        patterns: [/passport/i, /nationality/i, /date of birth/i, /place of birth/i],
        requiredFields: ['passport_number', 'full_name', 'nationality', 'date_of_birth', 'expiry_date']
      },
      visa: {
        patterns: [/visa/i, /entry/i, /duration of stay/i, /valid from/i],
        requiredFields: ['visa_number', 'visa_type', 'valid_from', 'valid_until', 'entries']
      },
      ticket: {
        patterns: [/boarding pass/i, /flight/i, /seat/i, /gate/i, /departure/i],
        requiredFields: ['flight_number', 'departure', 'arrival', 'date', 'seat']
      },
      hotel: {
        patterns: [/reservation/i, /check-in/i, /check-out/i, /room/i, /guest/i],
        requiredFields: ['confirmation_number', 'hotel_name', 'check_in', 'check_out', 'guest_name']
      },
      insurance: {
        patterns: [/policy/i, /coverage/i, /insured/i, /emergency/i],
        requiredFields: ['policy_number', 'coverage_type', 'valid_from', 'valid_until', 'emergency_contact']
      }
    };
  }

  /**
   * Initialize agent with OCR capabilities
   */
  async onInitialize() {
    try {
      // Initialize Tesseract OCR worker
      this.ocrWorker = await createWorker({
        logger: m => console.log(`OCR: ${m.status}`)
      });
      
      await this.ocrWorker.loadLanguage('eng');
      await this.ocrWorker.initialize('eng');
      
      console.log('✅ OCR engine initialized');
    } catch (error) {
      console.warn('⚠️ OCR initialization failed, will use AI vision only:', error.message);
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return [
      'document-analysis',
      'text-extraction',
      'image-processing',
      'pdf-parsing',
      'passport-reading',
      'visa-analysis',
      'ticket-extraction',
      'form-understanding',
      'multi-language-ocr'
    ];
  }

  /**
   * Get agent specialization
   */
  getSpecialization() {
    return 'travel-document-analysis';
  }

  /**
   * Get preferred LLM
   */
  getPreferredLLM() {
    return 'gpt-5-mini-2025-08-07'; // GPT-5 Mini has strong vision capabilities
  }

  /**
   * Get supported task types
   */
  getSupportedTaskTypes() {
    return [
      'analyze-document',
      'extract-passport',
      'extract-visa',
      'extract-ticket',
      'verify-document',
      'compare-documents'
    ];
  }

  /**
   * Evaluate if agent can handle task
   */
  async evaluateTask(task) {
    // High confidence for document tasks
    if (task.type && task.type.includes('document')) {
      return 0.95;
    }
    
    // Check for document-related content
    if (task.data?.documentType || task.data?.fileType || task.data?.isDocument) {
      return 0.9;
    }
    
    // Check for file attachments
    if (task.data?.file || task.data?.image || task.data?.pdf) {
      return 0.85;
    }
    
    // Keywords check
    const keywords = ['passport', 'visa', 'ticket', 'document', 'pdf', 'scan', 'image'];
    const taskText = JSON.stringify(task).toLowerCase();
    
    const matches = keywords.filter(keyword => taskText.includes(keyword));
    if (matches.length > 0) {
      return 0.7 + (matches.length * 0.05);
    }
    
    return 0.3;
  }

  /**
   * Validate task
   */
  async validateTask(task) {
    if (!task.data?.file && !task.data?.image && !task.data?.content && !task.data?.base64) {
      return { 
        valid: false, 
        reason: 'No document content provided (file, image, content, or base64 required)' 
      };
    }
    
    return { valid: true };
  }

  /**
   * Perform document analysis task
   */
  async performTask(task, context) {
    const taskType = task.type || 'analyze-document';
    
    console.log(`📄 Analyzing document: ${taskType}`);
    
    let result;
    
    switch (taskType) {
      case 'analyze-document':
        result = await this.analyzeDocument(task.data, context);
        break;
        
      case 'extract-passport':
        result = await this.extractPassportInfo(task.data, context);
        break;
        
      case 'extract-visa':
        result = await this.extractVisaInfo(task.data, context);
        break;
        
      case 'extract-ticket':
        result = await this.extractTicketInfo(task.data, context);
        break;
        
      case 'verify-document':
        result = await this.verifyDocument(task.data, context);
        break;
        
      case 'compare-documents':
        result = await this.compareDocuments(task.data, context);
        break;
        
      default:
        result = await this.analyzeDocument(task.data, context);
    }
    
    return result;
  }

  /**
   * Analyze a document comprehensively
   */
  async analyzeDocument(data, context) {
    try {
      // Extract text content
      const textContent = await this.extractText(data);
      
      // Detect document type
      const documentType = this.detectDocumentType(textContent);
      
      // Use AI to analyze document
      const prompt = `Analyze this ${documentType || 'travel'} document and extract all relevant information:

${textContent}

Please extract:
1. Document type and purpose
2. All personal information (names, dates, numbers)
3. Travel-specific details (destinations, dates, bookings)
4. Important dates and deadlines
5. Financial information if present
6. Any warnings, restrictions, or special conditions
7. Contact information

Provide a structured JSON response with all extracted information.`;

      const response = await this.callLLM(prompt, {
        temperature: 0.2,
        maxTokens: 1500,
        responseFormat: { type: 'json_object' }
      });
      
      const analysis = this.parseAIResponse(response);
      
      // Enhance with pattern matching
      const enhanced = this.enhanceWithPatternMatching(analysis, textContent, documentType);
      
      // Validate extracted data
      const validation = this.validateExtractedData(enhanced, documentType);
      
      return {
        documentType: documentType || analysis.documentType,
        extractedData: enhanced,
        validation,
        metadata: {
          textLength: textContent.length,
          confidence: this.calculateExtractionConfidence(enhanced, validation),
          processingMethod: data.image ? 'ocr+ai' : 'text+ai'
        }
      };
      
    } catch (error) {
      console.error('Document analysis error:', error);
      throw error;
    }
  }

  /**
   * Extract passport information
   */
  async extractPassportInfo(data, context) {
    const textContent = await this.extractText(data);
    
    const prompt = `Extract passport information from this document:

${textContent}

Extract the following passport fields:
1. Passport Number
2. Surname/Last Name
3. Given Names/First Name
4. Nationality/Country
5. Date of Birth (format: YYYY-MM-DD)
6. Place of Birth
7. Date of Issue (format: YYYY-MM-DD)
8. Date of Expiry (format: YYYY-MM-DD)
9. Sex/Gender
10. MRZ (Machine Readable Zone) if present

Return as structured JSON with standardized field names.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.1,
        maxTokens: 800,
        responseFormat: { type: 'json_object' }
      });
      
      const passportData = this.parseAIResponse(response);
      
      // Validate passport data
      const validated = this.validatePassportData(passportData);
      
      // Check expiry
      const expiryStatus = this.checkPassportExpiry(validated.dateOfExpiry);
      
      return {
        passportData: validated,
        expiryStatus,
        validation: {
          isValid: this.isValidPassport(validated),
          missingFields: this.getMissingPassportFields(validated),
          warnings: this.getPassportWarnings(validated, expiryStatus)
        }
      };
      
    } catch (error) {
      console.error('Passport extraction error:', error);
      throw error;
    }
  }

  /**
   * Extract visa information
   */
  async extractVisaInfo(data, context) {
    const textContent = await this.extractText(data);
    
    const prompt = `Extract visa information from this document:

${textContent}

Extract the following visa fields:
1. Visa Number/Control Number
2. Visa Type (Tourist/Business/Student/etc)
3. Country Issuing the Visa
4. Valid From Date
5. Valid Until Date
6. Number of Entries (Single/Multiple)
7. Duration of Stay
8. Purpose of Visit
9. Passport Number Referenced
10. Any Restrictions or Conditions

Return as structured JSON.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.1,
        maxTokens: 800,
        responseFormat: { type: 'json_object' }
      });
      
      const visaData = this.parseAIResponse(response);
      
      // Calculate visa validity
      const validity = this.calculateVisaValidity(visaData);
      
      return {
        visaData,
        validity,
        restrictions: this.extractVisaRestrictions(visaData, textContent),
        warnings: this.getVisaWarnings(visaData, validity)
      };
      
    } catch (error) {
      console.error('Visa extraction error:', error);
      throw error;
    }
  }

  /**
   * Extract ticket information
   */
  async extractTicketInfo(data, context) {
    const textContent = await this.extractText(data);
    
    const prompt = `Extract travel ticket information from this document:

${textContent}

Extract the following ticket fields:
1. Ticket/Booking Reference
2. Passenger Name(s)
3. Flight/Train/Bus Number
4. Departure Location and Terminal/Gate
5. Arrival Location and Terminal/Gate
6. Departure Date and Time
7. Arrival Date and Time
8. Seat Number(s)
9. Class of Service
10. Baggage Allowance
11. Total Fare
12. Important Notes or Restrictions

Return as structured JSON with all journey segments if multi-leg.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.1,
        maxTokens: 1000,
        responseFormat: { type: 'json_object' }
      });
      
      const ticketData = this.parseAIResponse(response);
      
      // Parse and validate times
      const processedTicket = this.processTicketTimes(ticketData);
      
      // Check for issues
      const issues = this.checkTicketIssues(processedTicket);
      
      return {
        ticketData: processedTicket,
        journey: this.buildJourneySummary(processedTicket),
        issues,
        checkInReminder: this.generateCheckInReminder(processedTicket)
      };
      
    } catch (error) {
      console.error('Ticket extraction error:', error);
      throw error;
    }
  }

  /**
   * Verify document authenticity/validity
   */
  async verifyDocument(data, context) {
    const textContent = await this.extractText(data);
    const documentType = data.documentType || this.detectDocumentType(textContent);
    
    const verificationChecks = {
      formatValid: true,
      datesLogical: true,
      requiredFieldsPresent: true,
      consistencyCheck: true,
      warnings: []
    };
    
    // Analyze with AI for inconsistencies
    const prompt = `Analyze this ${documentType} document for potential issues:

${textContent}

Check for:
1. Logical consistency in dates and information
2. Missing critical information
3. Unusual formatting or content
4. Potential red flags or concerns
5. Information that requires verification

Provide a detailed assessment.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.3,
        maxTokens: 1000
      });
      
      const assessment = this.parseAIResponse(response);
      
      // Perform specific checks based on document type
      const specificChecks = await this.performDocumentSpecificChecks(
        documentType, 
        textContent,
        data
      );
      
      return {
        documentType,
        verification: {
          ...verificationChecks,
          ...specificChecks,
          aiAssessment: assessment
        },
        confidence: this.calculateVerificationConfidence(verificationChecks, assessment),
        recommendations: this.generateVerificationRecommendations(assessment, specificChecks)
      };
      
    } catch (error) {
      console.error('Document verification error:', error);
      throw error;
    }
  }

  /**
   * Compare multiple documents
   */
  async compareDocuments(data, context) {
    if (!data.documents || data.documents.length < 2) {
      throw new Error('At least 2 documents required for comparison');
    }
    
    // Extract text from all documents
    const documentTexts = await Promise.all(
      data.documents.map(doc => this.extractText(doc))
    );
    
    const prompt = `Compare these ${data.documents.length} documents and identify:

${documentTexts.map((text, i) => `Document ${i + 1}:\n${text}\n`).join('\n---\n')}

Please identify:
1. Matching information across documents
2. Conflicting or inconsistent information
3. Information present in some documents but not others
4. Date/time relationships and sequences
5. Overall consistency assessment

Focus on travel-related details like names, dates, locations, and booking references.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.3,
        maxTokens: 1500
      });
      
      const comparison = this.parseAIResponse(response);
      
      // Build detailed comparison matrix
      const matrix = this.buildComparisonMatrix(documentTexts, comparison);
      
      return {
        comparison,
        matrix,
        conflicts: this.extractConflicts(comparison),
        recommendations: this.generateComparisonRecommendations(comparison)
      };
      
    } catch (error) {
      console.error('Document comparison error:', error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Extract text from various sources
   */
  async extractText(data) {
    // If already text
    if (data.content && typeof data.content === 'string') {
      return data.content;
    }
    
    // If PDF
    if (data.pdf || (data.file && data.file.toLowerCase().endsWith('.pdf'))) {
      return await this.extractPDFText(data.pdf || data.file);
    }
    
    // If image
    if (data.image || data.base64 || (data.file && this.isImageFile(data.file))) {
      return await this.extractImageText(data.image || data.base64 || data.file);
    }
    
    throw new Error('Unable to extract text from provided data');
  }

  /**
   * Extract text from PDF
   */
  async extractPDFText(pdfData) {
    try {
      let buffer;
      
      if (typeof pdfData === 'string') {
        // If base64
        if (pdfData.includes('base64,')) {
          const base64Data = pdfData.split('base64,')[1];
          buffer = Buffer.from(base64Data, 'base64');
        } else {
          // Assume file path
          const fs = await import('fs');
          buffer = await fs.promises.readFile(pdfData);
        }
      } else {
        buffer = pdfData;
      }
      
      const data = await pdfParse(buffer);
      return data.text;
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from image using OCR
   */
  async extractImageText(imageData) {
    try {
      let imagePath = imageData;
      
      // Handle base64 images
      if (typeof imageData === 'string' && imageData.includes('base64,')) {
        const base64Data = imageData.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Save temporarily for OCR
        const tempPath = `/tmp/doc_${Date.now()}.png`;
        await sharp(buffer).toFile(tempPath);
        imagePath = tempPath;
      }
      
      // Use OCR if available
      if (this.ocrWorker) {
        const { data: { text } } = await this.ocrWorker.recognize(imagePath);
        
        // Clean up temp file
        if (imagePath.startsWith('/tmp/')) {
          const fs = await import('fs');
          await fs.promises.unlink(imagePath);
        }
        
        return text;
      }
      
      // Fallback: use AI vision
      return await this.extractTextWithAIVision(imageData);
      
    } catch (error) {
      console.error('Image text extraction error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  /**
   * Extract text using AI vision capabilities
   */
  async extractTextWithAIVision(imageData) {
    const prompt = `Extract all text from this image. Include all visible text, maintaining the layout as much as possible. This appears to be a travel document.`;
    
    const response = await this.callLLM(prompt, {
      image: imageData,
      temperature: 0.1,
      maxTokens: 2000
    });
    
    return response;
  }

  /**
   * Detect document type from content
   */
  detectDocumentType(content) {
    const contentLower = content.toLowerCase();
    
    for (const [type, config] of Object.entries(this.documentPatterns)) {
      const matches = config.patterns.filter(pattern => pattern.test(contentLower));
      if (matches.length >= 2) {
        return type;
      }
    }
    
    // Additional detection logic
    if (contentLower.includes('boarding') && contentLower.includes('flight')) {
      return 'ticket';
    }
    
    if (contentLower.includes('mrz') || contentLower.includes('<<<')) {
      return 'passport';
    }
    
    return null;
  }

  /**
   * Check if file is an image
   */
  isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  }

  /**
   * Validate passport data
   */
  validatePassportData(data) {
    const validated = { ...data };
    
    // Standardize date formats
    if (validated.dateOfBirth) {
      validated.dateOfBirth = this.standardizeDate(validated.dateOfBirth);
    }
    if (validated.dateOfIssue) {
      validated.dateOfIssue = this.standardizeDate(validated.dateOfIssue);
    }
    if (validated.dateOfExpiry) {
      validated.dateOfExpiry = this.standardizeDate(validated.dateOfExpiry);
    }
    
    // Standardize country names
    if (validated.nationality) {
      validated.nationality = this.standardizeCountry(validated.nationality);
    }
    
    return validated;
  }

  /**
   * Check passport expiry status
   */
  checkPassportExpiry(expiryDate) {
    if (!expiryDate) return { status: 'unknown' };
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    
    if (expiry < now) {
      return { status: 'expired', urgency: 'critical' };
    }
    
    if (expiry < sixMonthsFromNow) {
      return { 
        status: 'expiring_soon', 
        urgency: 'high',
        monthsRemaining: Math.floor((expiry - now) / (1000 * 60 * 60 * 24 * 30))
      };
    }
    
    return { 
      status: 'valid',
      urgency: 'none',
      yearsRemaining: Math.floor((expiry - now) / (1000 * 60 * 60 * 24 * 365))
    };
  }

  /**
   * Calculate extraction confidence
   */
  calculateExtractionConfidence(data, validation) {
    let confidence = 0.5;
    
    // Increase confidence for each field extracted
    const fieldCount = Object.keys(data).length;
    confidence += fieldCount * 0.05;
    
    // Increase for validation passing
    if (validation.isValid) confidence += 0.2;
    
    // Decrease for missing fields
    if (validation.missingFields?.length > 0) {
      confidence -= validation.missingFields.length * 0.1;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Standardize date format
   */
  standardizeDate(dateStr) {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Date standardization error:', error);
    }
    return dateStr;
  }

  /**
   * Get required result fields
   */
  getRequiredResultFields() {
    return ['extractedData'];
  }

  /**
   * Perform result validation
   */
  async performResultValidation(result) {
    if (!result.extractedData && !result.passportData && !result.visaData && !result.ticketData) {
      return { valid: false, reason: 'No extracted data in result' };
    }
    
    return { valid: true };
  }

  /**
   * Shutdown agent
   */
  async shutdown() {
    // Terminate OCR worker
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
    }
    
    await super.shutdown();
  }
}

export default DocumentAnalyzerAgent;