// Test email endpoints and UI integration
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

// Mock auth token for testing
const AUTH_TOKEN = 'test-auth-token';

// Configure axios with auth header
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
    }
});

async function testEmailEndpoints() {
    console.log('Testing Email UI Integration...\n');
    
    // Start server first
    console.log('⚠️  Make sure server is running (npm run dev)');
    console.log('⚠️  This test uses a mock auth token - ensure your server accepts it for testing');
    console.log('Testing in 3 seconds...\n');
    
    setTimeout(async () => {
        try {
            // Test 1: List providers
            console.log('📧 Testing email providers:');
            const providers = await api.get('/api/email/providers');
            console.log('   ✅ Available providers:', providers.data.map(p => p.name).join(', '));
            
            // Test 2: Connect with mock provider
            console.log('\n🔌 Testing mock connection:');
            const connect = await api.post('/api/email/connect', {
                provider: 'mock',
                credentials: { email: 'test@example.com' }
            });
            console.log('   ✅ Connected:', connect.data);
            
            // Test 3: Get accounts
            console.log('\n👤 Testing get accounts:');
            const accounts = await api.get('/api/email/accounts');
            console.log(`   ✅ Found ${accounts.data.length} accounts`);
            
            // Test 4: Fetch inbox
            console.log('\n📥 Testing inbox fetch:');
            const inbox = await api.get('/api/email/inbox?email=test@example.com&provider=mock&limit=5');
            console.log(`   ✅ Fetched ${inbox.data.messages.length} messages`);
            
            // Test 5: Get specific message
            if (inbox.data.messages.length > 0) {
                const messageId = inbox.data.messages[0].id;
                console.log(`\n📄 Testing message fetch (${messageId}):`);
                const message = await api.get(`/api/email/message/${messageId}?email=test@example.com&provider=mock`);
                console.log('   ✅ Message subject:', message.data.subject);
                console.log('   ✅ Has attachments:', message.data.hasAttachments);
            }
            
            // Test 6: Search emails
            console.log('\n🔍 Testing email search:');
            const search = await api.get('/api/email/search?query=booking&email=test@example.com&provider=mock');
            console.log(`   ✅ Found ${search.data.messages.length} matching messages`);
            
            console.log('\n✅ All tests passed!');
            
        } catch (error) {
            console.log('❌ Test failed:', error.response?.data || error.message);
            if (error.response?.status === 401) {
                console.log('\n💡 Tip: Update your server auth middleware to accept test tokens for development');
            }
        }
    }, 3000);
}

testEmailEndpoints();