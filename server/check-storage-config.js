import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import CloudStorageService from './services/cloudStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🔧 Storage Configuration Check\n');

console.log('Environment Variables:');
console.log('- STORAGE_TYPE:', process.env.STORAGE_TYPE || 'local (default)');
console.log('- AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✓ Set' : '✗ Not set');
console.log('- AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Not set');
console.log('- AWS_REGION:', process.env.AWS_REGION || 'Not set');
console.log('- AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET || 'Not set');

console.log('\n📁 Storage Service Status:');
const storage = new CloudStorageService();
const status = storage.getStatus();

console.log('- Provider:', status.provider);
console.log('- Configured:', status.configured ? '✓ Yes' : '✗ No');

if (status.s3Config) {
  console.log('\nS3 Configuration:');
  console.log('- Bucket:', status.s3Config.bucket);
  console.log('- Region:', status.s3Config.region);
  console.log('- Has Credentials:', status.s3Config.hasCredentials ? '✓ Yes' : '✗ No');
}

console.log('\n🧪 Testing storage connection...');
const connectionOk = await storage.testConnection();
console.log('Connection test:', connectionOk ? '✅ Passed' : '❌ Failed');

if (status.provider === 'local') {
  console.log('\n💡 To use AWS S3 storage:');
  console.log('1. Set STORAGE_TYPE=s3 in your .env file');
  console.log('2. Ensure AWS credentials are properly configured');
  console.log('3. Restart the server');
}

process.exit(0);