// Test mock provider directly
import mockEmailProvider from './services/email/MockEmailProvider.js';

console.log('Testing Mock Email Provider...\n');

// Test 1: Check if messages exist
console.log('1️⃣ Messages count:', mockEmailProvider.messages.length);

// Test 2: Get inbox
async function testInbox() {
    const inbox = await mockEmailProvider.getInbox({ maxResults: 5 });
    console.log('\n2️⃣ Inbox test:');
    console.log('- Messages returned:', inbox.messages.length);
    console.log('- Total estimate:', inbox.resultSizeEstimate);
    console.log('- Has next page:', !!inbox.nextPageToken);
    
    if (inbox.messages.length > 0) {
        console.log('\nFirst message:', {
            id: inbox.messages[0].id,
            subject: inbox.messages[0].subject,
            from: inbox.messages[0].from,
            isUnread: inbox.messages[0].isUnread
        });
    }
}

// Test 3: Search
async function testSearch() {
    const results = await mockEmailProvider.searchMessages('booking', 10);
    console.log('\n3️⃣ Search test (query: "booking"):');
    console.log('- Results found:', results.messages.length);
    
    if (results.messages.length > 0) {
        console.log('- Matching subjects:');
        results.messages.forEach((msg, i) => {
            console.log(`  ${i + 1}. ${msg.subject}`);
        });
    }
}

// Run tests
(async () => {
    await testInbox();
    await testSearch();
    console.log('\n✅ Mock provider test completed!');
})();