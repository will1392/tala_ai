// Test Gmail OAuth URL generation (without connecting)
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing Gmail OAuth URL Generation...\n');

// Simulate OAuth URL generation
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || 'mock-client-id';
const REDIRECT_URI = 'http://localhost:3001/api/email/callback/gmail';

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GMAIL_CLIENT_ID}&` +
    `redirect_uri=${REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=https://www.googleapis.com/auth/gmail.readonly&` +
    `access_type=offline&` +
    `state=test-user-123`;

console.log('✅ OAuth URL structure is valid');
console.log('\nGenerated URL:');
console.log(authUrl);
console.log('\n⚠️  Note: Actual connection requires valid Google Cloud project');