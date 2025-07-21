# Smart Document Pipeline Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Setup & Installation](#setup--installation)
5. [Configuration](#configuration)
6. [API Reference](#api-reference)
7. [Testing](#testing)
8. [Performance Optimization](#performance-optimization)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

## Overview

The Smart Document Pipeline is an intelligent document processing system that automatically analyzes, extracts, and organizes information from various travel documents. It supports multiple document types including passports, flight tickets, hotel reservations, and travel itineraries.

### Key Features

- **Visual Analysis**: Uses Google Gemini Vision API to analyze document images
- **OCR Processing**: Extracts text from images and PDFs
- **Multi-language Support**: Detects and translates documents in 16+ languages
- **Smart Relationships**: Automatically identifies relationships between documents
- **Trip Organization**: Groups related documents into trips
- **Real-time Updates**: WebSocket support for live processing status
- **Performance Optimization**: Caching, batching, and queue management
- **Comprehensive Monitoring**: Processing metrics, costs, and quality tracking

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   API Layer     │────▶│  Smart Pipeline  │────▶│  Data Storage   │
│  (REST/WS)      │     │   Orchestrator   │     │   (Database)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
        ┌───────────▼──────┐   ┌─────────▼──────────┐
        │  Processing      │   │   Optimization     │
        │   Services       │   │    Layer           │
        │  ├─ Vision       │   │  ├─ Caching        │
        │  ├─ OCR          │   │  ├─ Queuing        │
        │  ├─ Translation  │   │  └─ Batching       │
        │  └─ Analysis     │   └────────────────────┘
        └──────────────────┘
                    │
        ┌───────────▼──────────┐
        │   Monitoring         │
        │  ├─ Metrics          │
        │  ├─ Alerts           │
        │  └─ Dashboard        │
        └──────────────────────┘
```

## Components

### 1. SmartPipeline.js

The main orchestrator that manages the document processing flow.

```javascript
import SmartPipeline from './services/documents/SmartPipeline.js';

const pipeline = new SmartPipeline({
  maxRetries: 3,
  retryDelay: 1000,
  enableOptimization: true
});

// Process a document
const result = await pipeline.processDocument(document, {
  priority: 'high',
  enableTranslation: true
});
```

### 2. Processing Services

#### Visual Analysis Service
Analyzes document images to extract visual information.

```javascript
const visualResult = await pipeline.analyzeVisual(document);
// Returns: { description, objects, extractedText, quality }
```

#### OCR Service
Extracts text from document images.

```javascript
const ocrResult = await pipeline.performOCR(document);
// Returns: { text, confidence, blocks, language }
```

#### Translation Service
Translates documents to target languages.

```javascript
const translation = await pipeline.translateDocument(document, 'es');
// Returns: { translatedText, sourceLanguage, confidence }
```

### 3. Pipeline Optimizer

Improves performance through caching, queuing, and batching.

```javascript
import PipelineOptimizer from './services/documents/PipelineOptimizer.js';

const optimizer = new PipelineOptimizer({
  maxConcurrency: 5,
  cacheSize: 500,
  batchSize: 10
});
```

### 4. Monitoring System

Tracks processing metrics, costs, and quality.

```javascript
import PipelineMonitor from './services/monitoring/PipelineMonitor.js';

const monitor = new PipelineMonitor({
  metricsRetentionDays: 30,
  alertThresholds: {
    errorRate: 0.1,
    avgProcessingTime: 10000
  }
});
```

## Setup & Installation

### Prerequisites

- Node.js 16+
- PostgreSQL database
- API Keys (optional for production):
  - Google Gemini Vision API
  - Translation API
  - OCR service (Tesseract)

### Installation Steps

1. **Install dependencies**:
```bash
npm install
```

2. **Run database migrations**:
```bash
npm run migrate
```

3. **Configure environment variables**:
```env
# API Keys (optional - mock services available)
GEMINI_API_KEY=your_gemini_key
TRANSLATION_API_KEY=your_translation_key

# Database
DATABASE_URL=postgresql://user:pass@localhost/tala

# Pipeline Configuration
PIPELINE_MAX_CONCURRENCY=5
PIPELINE_CACHE_SIZE=500
PIPELINE_ENABLE_MONITORING=true
```

4. **Start the server**:
```bash
npm start
```

## Configuration

### Pipeline Configuration

```javascript
const pipelineConfig = {
  // Processing settings
  stages: ['visual', 'ocr', 'language', 'translation', 'entities', 'relationships'],
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000,
  
  // Optimization settings
  enableCaching: true,
  cacheSize: 500,
  cacheTTL: 86400000, // 24 hours
  maxConcurrency: 5,
  batchSize: 10,
  
  // Quality settings
  minQualityScore: 6,
  enhanceImages: true,
  
  // Cost controls
  dailyCostLimit: 100,
  enableQuotaManagement: true
};
```

### Document Type Configuration

```javascript
const documentTypes = {
  passport: {
    requiredFields: ['number', 'name', 'nationality', 'expiry'],
    visualFeatures: ['text', 'faces', 'logos'],
    ocrLanguages: ['eng'],
    priority: 'high'
  },
  flight_ticket: {
    requiredFields: ['flight', 'passenger', 'date', 'booking'],
    visualFeatures: ['text', 'barcodes'],
    ocrLanguages: ['eng'],
    priority: 'medium'
  },
  hotel_reservation: {
    requiredFields: ['confirmation', 'guest', 'checkin', 'checkout'],
    visualFeatures: ['text'],
    ocrLanguages: ['eng'],
    priority: 'medium'
  }
};
```

## API Reference

### Document Processing Endpoints

#### Process Single Document
```http
POST /api/documents
Content-Type: multipart/form-data

{
  "file": <file>,
  "document_type": "passport",
  "metadata": {
    "user_id": "123"
  }
}
```

#### Analyze Visual Content
```http
POST /api/documents/analyze-visual
Content-Type: application/json

{
  "document_id": "doc_123",
  "features": ["text", "objects", "quality"]
}
```

#### Get Document Relationships
```http
GET /api/documents/:id/relationships
```

#### Translate Document
```http
POST /api/documents/:id/translate
Content-Type: application/json

{
  "targetLanguage": "es"
}
```

#### Get Trips
```http
GET /api/documents/trips?user_id=123
```

#### Bulk Process Documents
```http
POST /api/documents/bulk-process
Content-Type: application/json

{
  "document_ids": ["doc_1", "doc_2", "doc_3"],
  "options": {
    "priority": "high"
  }
}
```

### WebSocket Events

```javascript
// Connect to processing updates
const socket = io('/processing');

// Listen for events
socket.on('processing:started', (data) => {
  console.log('Processing started:', data);
});

socket.on('stage:complete', (data) => {
  console.log('Stage complete:', data.stage);
});

socket.on('processing:complete', (data) => {
  console.log('Processing complete:', data);
});

socket.on('processing:error', (error) => {
  console.error('Processing error:', error);
});
```

### Monitoring Endpoints

#### Get Metrics Summary
```http
GET /api/monitoring/metrics/summary
```

#### Get Historical Metrics
```http
GET /api/monitoring/metrics/history?interval=hourly&limit=24
```

#### Export Metrics
```http
POST /api/monitoring/export
Content-Type: application/json

{
  "format": "json" // or "csv"
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- test-smart-pipeline.js
```

### Test Structure

```javascript
describe('Smart Pipeline Tests', () => {
  // Visual Analysis Tests
  test('should analyze passport image correctly', async () => {
    const result = await visionService.analyzeImage({
      imagePath: 'test-documents/sample-passport.jpg'
    });
    expect(result.success).toBe(true);
    expect(result.description).toContain('passport');
  });
  
  // OCR Tests
  test('should extract text accurately', async () => {
    const result = await ocrService.processDocument({
      imagePath: 'test-documents/sample-passport.jpg'
    });
    expect(result.confidence).toBeGreaterThan(0.9);
  });
  
  // Translation Tests
  test('should translate documents', async () => {
    const result = await translationService.translateText(
      'passport', 'en', 'es'
    );
    expect(result.translatedText).toContain('pasaporte');
  });
});
```

### Mock Services

For testing without API keys:

```javascript
import MockGeminiVision from './services/mocks/MockGeminiVision.js';
import MockTranslation from './services/mocks/MockTranslation.js';
import MockOCR from './services/mocks/MockOCR.js';

// Use mock services in tests
const pipeline = new SmartPipeline({
  services: {
    vision: new MockGeminiVision(),
    ocr: new MockOCR(),
    translation: new MockTranslation()
  }
});
```

## Performance Optimization

### 1. Caching Strategy

```javascript
// Visual analysis caching (24-hour TTL)
const visualCache = new LRUCache({
  max: 500,
  ttl: 86400000
});

// Translation caching (7-day TTL)
const translationCache = new LRUCache({
  max: 1000,
  ttl: 604800000
});
```

### 2. Queue Management

```javascript
// Processing queue with concurrency control
const queue = new PQueue({
  concurrency: 5,
  interval: 1000,
  intervalCap: 10
});
```

### 3. Batch Processing

```javascript
// Batch translation requests
const batchTranslation = async (texts, sourceLang, targetLang) => {
  return await optimizer.batchTranslation(
    texts, sourceLang, targetLang, translateFunc
  );
};
```

### 4. Lazy Loading

```javascript
// Load relationships on demand
const relationships = await optimizer.lazyLoadRelationships(
  documentId, loadFunc, maxDepth
);
```

## Monitoring

### Dashboard Access

Access the monitoring dashboard at: `http://localhost:3000/monitoring-dashboard.html`

### Key Metrics

1. **Processing Metrics**:
   - Total documents processed
   - Success/failure rates
   - Processing times by stage
   - Throughput (documents/hour)

2. **Quality Metrics**:
   - Average quality scores
   - Quality distribution
   - Low quality alerts

3. **API Usage & Costs**:
   - API calls by service
   - Quota usage
   - Daily/total costs
   - Cost projections

4. **System Metrics**:
   - Memory usage
   - CPU usage
   - Queue length
   - Active workers

### Alerts Configuration

```javascript
const alertThresholds = {
  errorRate: 0.1,           // 10% error rate
  avgProcessingTime: 10000, // 10 seconds
  apiCostDaily: 100,        // $100/day
  qualityScore: 6           // Min quality score
};
```

## Troubleshooting

### Common Issues

#### 1. High Error Rates
- Check API key validity
- Verify network connectivity
- Review error logs for patterns
- Check document quality

#### 2. Slow Processing
- Enable caching
- Increase concurrency limits
- Check queue backlog
- Review stage timings

#### 3. Low Quality Scores
- Enable image enhancement
- Check document resolution
- Verify OCR accuracy
- Review lighting conditions

#### 4. High API Costs
- Enable result caching
- Implement batch processing
- Review quota usage
- Set daily cost limits

### Debug Mode

Enable debug logging:

```javascript
const pipeline = new SmartPipeline({
  debug: true,
  logLevel: 'verbose'
});
```

### Error Handling

```javascript
try {
  const result = await pipeline.processDocument(document);
} catch (error) {
  if (error.code === 'QUOTA_EXCEEDED') {
    // Handle quota errors
  } else if (error.code === 'QUALITY_TOO_LOW') {
    // Handle quality errors
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **Document Quality**:
   - Use high-resolution images (300+ DPI)
   - Ensure good lighting
   - Avoid blurry or skewed images

2. **Performance**:
   - Enable caching for repeated documents
   - Use batch processing for multiple documents
   - Set appropriate priority levels

3. **Cost Management**:
   - Monitor daily usage
   - Set cost alerts
   - Use mock services for development

4. **Security**:
   - Never store API keys in code
   - Sanitize user inputs
   - Encrypt sensitive document data

## Future Enhancements

1. **Additional Document Types**:
   - Visa documents
   - Travel insurance
   - Car rental agreements
   - Event tickets

2. **Advanced Features**:
   - ML-based quality enhancement
   - Automatic document categorization
   - Fraud detection
   - Smart notifications

3. **Integration Options**:
   - Calendar sync
   - Email parsing
   - Mobile app support
   - Third-party APIs