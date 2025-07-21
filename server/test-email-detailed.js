// Detailed test for email integration
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';
const AUTH_TOKEN = 'test-auth-token';

// Configure axios with auth header
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
    }
});

async function detailedTest() {
    console.log('📧 Running Detailed Email Integration Test...\n');
    
    try {
        // 1. Test providers
        console.log('1️⃣ Testing providers endpoint:');
        const providers = await api.get('/api/email/providers');
        console.log('Providers:', providers.data.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type
        })));
        
        // 2. Connect mock provider
        console.log('\n2️⃣ Connecting mock provider:');
        const connect = await api.post('/api/email/connect', {
            provider: 'mock',
            email: 'test@example.com'
        });
        console.log('Connection result:', connect.data);
        
        // 3. Get accounts
        console.log('\n3️⃣ Getting user accounts:');
        const accounts = await api.get('/api/email/accounts');
        console.log('Accounts:', accounts.data);
        
        // 4. Test inbox with mock provider
        console.log('\n4️⃣ Testing inbox fetch:');
        const inbox = await api.get('/api/email/inbox', {
            params: {
                email: 'test@example.com',
                provider: 'mock',
                maxResults: 5
            }
        });
        console.log('Inbox response:', {
            messageCount: inbox.data.messages?.length || 0,
            hasNextPage: !!inbox.data.nextPageToken,
            totalEstimate: inbox.data.resultSizeEstimate
        });
        
        if (inbox.data.messages && inbox.data.messages.length > 0) {
            console.log('First message:', inbox.data.messages[0]);
            
            // 5. Get full message
            console.log('\n5️⃣ Getting full message:');
            const messageId = inbox.data.messages[0].id;
            const message = await api.get(`/api/email/message/${messageId}`, {
                params: {
                    email: 'test@example.com',
                    provider: 'mock'
                }
            });
            console.log('Message details:', {
                subject: message.data.subject,
                from: message.data.from,
                hasBody: !!message.data.body,
                hasHtmlBody: !!message.data.htmlBody,
                attachmentCount: message.data.attachments?.length || 0
            });
        }
        
        // 6. Test search
        console.log('\n6️⃣ Testing search:');
        const search = await api.get('/api/email/search', {
            params: {
                query: 'booking',
                email: 'test@example.com',
                provider: 'mock',
                limit: 3
            }
        });
        console.log('Search results:', {
            found: search.data.messages?.length || 0,
            totalResults: search.data.totalResults
        });
        
        if (search.data.messages && search.data.messages.length > 0) {
            console.log('Search results preview:');
            search.data.messages.forEach((msg, i) => {
                console.log(`  ${i + 1}. ${msg.subject} - ${msg.from}`);
            });
        }
        
        console.log('\n✅ Detailed test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

// Run the test
detailedTest();