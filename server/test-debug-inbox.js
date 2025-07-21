// Debug inbox flow
import emailManager from './services/email/EmailManager.js';

console.log('🔍 Debugging Inbox Fetch Flow...\n');

const userId = 'test-user-123';
const provider = 'mock';
const email = 'test@example.com';

async function debugInbox() {
    try {
        // Step 1: Check if we can get the client
        console.log('1️⃣ Getting email client...');
        const client = await emailManager.getEmailClient(userId, provider, email);
        console.log('Client type:', client.type);
        console.log('Has provider:', !!client.provider);
        
        // Step 2: Test provider directly
        if (client.provider) {
            console.log('\n2️⃣ Testing provider directly...');
            const directInbox = await client.provider.getInbox({ maxResults: 5 });
            console.log('Direct inbox results:', directInbox.messages.length);
        }
        
        // Step 3: Test through emailManager
        console.log('\n3️⃣ Testing through emailManager.fetchInbox...');
        const managerInbox = await emailManager.fetchInbox(userId, provider, email, {
            maxResults: 5
        });
        console.log('Manager inbox results:', managerInbox.messages?.length || 0);
        console.log('Full response:', JSON.stringify(managerInbox, null, 2));
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

debugInbox();