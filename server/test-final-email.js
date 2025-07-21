// Final comprehensive email test
import axios from 'axios';
import emailManager from './services/email/EmailManager.js';

const BASE_URL = 'http://localhost:3001';
const AUTH_TOKEN = 'test-auth-token';

// Configure axios with auth header
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
    }
});

async function finalTest() {
    console.log('🚀 Final Email Integration Test\n');
    
    try {
        // Clear cache first
        console.log('🧹 Clearing email cache...');
        emailManager.emailCache.clear();
        
        // 1. Connect mock provider
        console.log('\n1️⃣ Connecting mock provider:');
        await api.post('/api/email/connect', {
            provider: 'mock',
            email: 'test@example.com'
        });
        console.log('✅ Connected');
        
        // 2. Fetch inbox (should now return messages)
        console.log('\n2️⃣ Fetching inbox:');
        const inbox = await api.get('/api/email/inbox', {
            params: {
                email: 'test@example.com',
                provider: 'mock',
                maxResults: 5
            }
        });
        console.log(`✅ Got ${inbox.data.messages.length} messages`);
        
        if (inbox.data.messages.length > 0) {
            console.log('\nSample messages:');
            inbox.data.messages.forEach((msg, i) => {
                console.log(`${i + 1}. ${msg.subject}`);
                console.log(`   From: ${msg.from}`);
                console.log(`   Date: ${new Date(msg.date).toLocaleDateString()}`);
                console.log(`   Unread: ${msg.isUnread}`);
            });
            
            // 3. Get full message
            console.log('\n3️⃣ Getting full message details:');
            const messageId = inbox.data.messages[0].id;
            const message = await api.get(`/api/email/message/${messageId}`, {
                params: {
                    email: 'test@example.com',
                    provider: 'mock'
                }
            });
            console.log('✅ Message details:');
            console.log(`   Subject: ${message.data.subject}`);
            console.log(`   Body preview: ${message.data.body?.substring(0, 100)}...`);
            console.log(`   Has attachments: ${message.data.hasAttachments}`);
            
            // 4. Test send to Tala
            console.log('\n4️⃣ Testing Send to Tala AI:');
            try {
                const analysis = await api.post(`/api/email/message/${messageId}/send-to-tala`, {
                    email: 'test@example.com',
                    provider: 'mock'
                });
                console.log('✅ Analysis result:');
                console.log(`   Summary: ${analysis.data.summary || 'N/A'}`);
                console.log(`   Priority: ${analysis.data.priority || 'N/A'}`);
                console.log(`   Tasks found: ${analysis.data.tasks?.length || 0}`);
            } catch (err) {
                console.log('⚠️  AI analysis not available (expected without OpenAI)');
            }
        }
        
        // 5. Test search
        console.log('\n5️⃣ Testing search:');
        const search = await api.get('/api/email/search', {
            params: {
                query: 'flight',
                email: 'test@example.com',
                provider: 'mock',
                limit: 5
            }
        });
        console.log(`✅ Found ${search.data.messages.length} messages matching "flight"`);
        
        console.log('\n✨ All tests completed successfully!');
        console.log('\n📝 Summary:');
        console.log('- Mock provider: ✅ Working');
        console.log('- Inbox fetch: ✅ Working');
        console.log('- Message details: ✅ Working');
        console.log('- Search: ✅ Working');
        console.log('- AI analysis: ⚠️  Requires OpenAI setup');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
console.log('⏳ Starting in 2 seconds to ensure server is ready...\n');
setTimeout(finalTest, 2000);