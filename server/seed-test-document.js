import { DocumentService } from './services/db/documentService.js';
import CloudStorageService from './services/cloudStorage.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedTestDocument() {
  console.log('🌱 Seeding test document...\n');
  
  const documentService = new DocumentService();
  const cloudStorage = new CloudStorageService();
  
  // Create test PDF content
  const testContent = `
Travel Insurance Policy Document

Policy Number: TRV-2025-001234
Effective Date: January 1, 2025
Expiry Date: December 31, 2025

POLICYHOLDER INFORMATION
Name: John Doe
Address: 123 Main Street, New York, NY 10001
Email: john.doe@example.com
Phone: +1-555-123-4567

COVERAGE SUMMARY
- Medical Emergency: Up to $1,000,000
- Trip Cancellation: Up to $10,000
- Baggage Loss: Up to $5,000
- Travel Delay: Up to $1,000
- Emergency Evacuation: Up to $100,000

DESTINATIONS COVERED
This policy provides coverage for travel to all countries worldwide, excluding:
- Countries under travel advisory
- War zones or areas of civil unrest

IMPORTANT CONTACT NUMBERS
Emergency Assistance: 1-800-TRAVEL-911 (24/7)
Claims Department: 1-800-TRAVEL-CLM (Mon-Fri 9AM-5PM EST)
Policy Services: 1-800-TRAVEL-POL (Mon-Fri 9AM-5PM EST)

TERMS AND CONDITIONS
1. Pre-existing medical conditions must be declared
2. Coverage begins on departure date
3. Maximum trip duration: 180 days
4. Age limit: 85 years
5. Deductible: $250 per claim

This is a sample travel insurance document for testing purposes.
Generated on: ${new Date().toISOString()}
`;
  
  try {
    // Create a buffer from the test content
    const buffer = Buffer.from(testContent, 'utf8');
    const fileName = 'travel-insurance-policy-test.pdf';
    const documentId = 'test-doc-' + Date.now();
    
    // Upload to S3
    console.log('📤 Uploading to S3...');
    const uploadResult = await cloudStorage.uploadFile(
      buffer,
      fileName,
      'application/pdf',
      documentId
    );
    
    console.log('✅ Uploaded to S3:', uploadResult.url);
    
    // Create document in database
    console.log('\n💾 Creating document in database...');
    const documentData = {
      title: 'Travel Insurance Policy - Test Document',
      content: testContent,
      file_name: fileName,
      file_type: 'pdf',
      mime_type: 'application/pdf',
      file_size: buffer.length,
      storage_path: uploadResult.key,
      file_url: uploadResult.url,
      content_preview: testContent.substring(0, 500),
      word_count: testContent.split(/\s+/).length,
      page_count: 1,
      user_id: '00000000-0000-0000-0000-000000000001',
      organization_id: '00000000-0000-0000-0000-000000000001',
      folder_id: null,
      tags: ['insurance', 'travel', 'policy', 'test'],
      metadata: {
        source: 'seed-script',
        uploadedVia: 'direct',
        s3Key: uploadResult.key,
        s3Bucket: process.env.AWS_S3_BUCKET,
        isTest: true
      }
    };
    
    const result = await documentService.createDocument(documentData);
    
    if (result.success) {
      console.log('✅ Document created successfully!');
      console.log('📄 Document ID:', result.data.id);
      console.log('📄 Title:', result.data.title);
      console.log('📄 Storage path:', result.data.storage_path);
      console.log('📄 File URL:', result.data.file_url);
      
      // Verify it can be retrieved
      console.log('\n🔍 Verifying document retrieval...');
      const getResult = await documentService.getDocument(result.data.id, {
        organizationId: '00000000-0000-0000-0000-000000000001',
        includeContent: false
      });
      
      if (getResult.success) {
        console.log('✅ Document can be retrieved successfully!');
        console.log('📄 Retrieved title:', getResult.data.title);
        console.log('📄 Has S3 URL:', !!getResult.data.file_url);
      } else {
        console.log('❌ Failed to retrieve document:', getResult.message);
      }
      
      // Test searching for it
      console.log('\n🔍 Testing document search...');
      const searchResult = await documentService.searchDocuments(
        '00000000-0000-0000-0000-000000000001',
        'insurance policy',
        {
          userId: '00000000-0000-0000-0000-000000000001',
          pagination: { page: 1, pageSize: 10 }
        }
      );
      
      if (searchResult.success && searchResult.data.length > 0) {
        console.log('✅ Document appears in search results!');
        console.log('📄 Found', searchResult.data.length, 'matching documents');
      } else {
        console.log('⚠️  Document not found in search results');
      }
      
    } else {
      console.log('❌ Failed to create document:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

seedTestDocument();