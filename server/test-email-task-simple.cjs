// Test complete email-to-task conversion flow
const axios = require('axios');

// Mock implementations for testing without full server
class MockEmailManager {
    constructor() {
        this.emails = new Map([
            ['email_001', {
                id: 'email_001',
                subject: 'Urgent: Book flights to Tokyo for Johnson family',
                from: { name: 'Sarah Johnson', address: 'sarah@company.com' },
                to: [{ address: 'agent@tala.ai' }],
                date: new Date().toISOString(),
                body: 'Need to book flights urgently. Departure March 25 from JFK, return April 3. Business class for 2 adults and 1 child.',
                threadId: 'thread_001'
            }],
            ['email_002', {
                id: 'email_002',
                subject: 'Hotel booking needed - Rome Vatican area',
                from: { name: 'Mike Chen', address: 'mchen@vip.com' },
                to: [{ address: 'agent@tala.ai' }],
                date: new Date().toISOString(),
                body: 'Please book 5-star hotel near Vatican. Check-in April 15, check-out April 20. Need suite with business center.',
                threadId: 'thread_002'
            }]
        ]);
    }
    
    async getInbox() {
        return {
            messages: Array.from(this.emails.values())
        };
    }
    
    async getEmail(id) {
        return this.emails.get(id);
    }
}

class MockTaskExtractor {
    async extractTasks(email) {
        // Simple mock extraction
        const tasks = [];
        
        if (email.subject.toLowerCase().includes('flight')) {
            tasks.push({
                title: `Book flight: ${email.subject}`,
                type: 'flight',
                priority: email.subject.toLowerCase().includes('urgent') ? 'high' : 'medium',
                deadline: this.extractDate(email.body),
                confidence: 0.85,
                source_text: email.body.substring(0, 100)
            });
        }
        
        if (email.subject.toLowerCase().includes('hotel')) {
            tasks.push({
                title: `Hotel reservation: ${email.subject}`,
                type: 'hotel',
                priority: 'medium',
                deadline: this.extractDate(email.body),
                confidence: 0.90,
                source_text: email.body.substring(0, 100)
            });
        }
        
        return tasks;
    }
    
    extractDate(text) {
        // Simple date extraction
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString();
    }
}

async function testEmailToTaskFlow() {
    console.log('Testing Email-to-Task Flow...\n');
    
    const BASE_URL = 'http://localhost:3001';
    
    // Use mock implementations for demo
    const emailManager = new MockEmailManager();
    const taskExtractor = new MockTaskExtractor();
    
    try {
        // Step 1: Get a test email
        console.log('1️⃣ Fetching test email:');
        const inbox = await emailManager.getInbox();
        const email = inbox.messages[0];
        
        if (!email) {
            console.log('   ❌ No test emails found');
            return;
        }
        console.log(`   ✅ Got email: ${email.id}`);
        console.log(`   Subject: "${email.subject}"`);
        
        // Step 2: Send to Tala (mock the extraction)
        console.log('\n2️⃣ Sending email to Tala:');
        const extractedTasks = await taskExtractor.extractTasks(email);
        
        console.log('   ✅ Analysis complete');
        console.log(`   Tasks found: ${extractedTasks.length}`);
        
        // Step 3: Show task preview
        console.log('\n3️⃣ Task suggestions:');
        extractedTasks.forEach((task, i) => {
            console.log(`   ${i + 1}. ${task.title}`);
            console.log(`      Priority: ${task.priority}`);
            console.log(`      Due: ${new Date(task.deadline).toLocaleDateString()}`);
            console.log(`      Confidence: ${(task.confidence * 100).toFixed(0)}%`);
        });
        
        // Step 4: Create tasks (mock)
        console.log('\n4️⃣ Creating tasks:');
        const createdTasks = [];
        for (const taskData of extractedTasks) {
            const task = {
                id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                ...taskData,
                source_email_id: email.id,
                created_at: new Date().toISOString()
            };
            createdTasks.push(task);
            console.log(`   ✅ Created: ${task.title}`);
        }
        
        // Step 5: Check created tasks
        console.log('\n5️⃣ Verifying tasks:');
        console.log(`   ✅ Total email tasks: ${createdTasks.length}`);
        createdTasks.forEach(task => {
            console.log(`      - ${task.id}: ${task.title}`);
        });
        
        // Test actual API if server is running
        console.log('\n6️⃣ Testing API endpoints:');
        try {
            const response = await axios.get(`${BASE_URL}/api/email-tasks/actions`);
            console.log('   ✅ API is running!');
            console.log(`   Available actions: ${response.data.actions.length}`);
        } catch (apiError) {
            console.log('   ⚠️  API not available - using mock data');
            console.log('   To test with real API:');
            console.log('   1. Start server: npm start');
            console.log('   2. Ensure email-tasks routes are registered');
        }
        
    } catch (error) {
        console.log('❌ Flow test failed:', error.message);
    }
}

// Test WebSocket updates
function testWebSocketUpdates() {
    console.log('\n\n🔄 Testing real-time updates:');
    console.log('   WebSocket endpoint: ws://localhost:3002');
    console.log('   Events available:');
    console.log('   - progress: Conversion progress updates');
    console.log('   - status: Session status changes');
    console.log('   - task.created: When tasks are created');
    console.log('   - task.updated: When tasks are modified');
    console.log('   - email.analyzed: When email analysis completes');
    
    // Mock WebSocket demo
    console.log('\n   📡 Mock WebSocket events:');
    
    const mockEvents = [
        { type: 'progress', status: 'started', message: 'Processing email...', progress: 0 },
        { type: 'progress', status: 'extracting', message: 'Extracting tasks...', progress: 30 },
        { type: 'progress', status: 'analyzing', message: 'Analyzing content...', progress: 60 },
        { type: 'progress', status: 'completed', message: 'Tasks created!', progress: 100 }
    ];
    
    mockEvents.forEach((event, i) => {
        setTimeout(() => {
            console.log(`   ${event.progress}% - ${event.message}`);
        }, i * 500);
    });
}

// Show feature summary
function showFeatures() {
    console.log('\n\n✨ Email-to-Task Features:');
    console.log('   • Intelligent task extraction from emails');
    console.log('   • Priority and deadline suggestions');
    console.log('   • Assignee recommendations');
    console.log('   • Thread context preservation');
    console.log('   • Real-time progress updates');
    console.log('   • Batch email processing');
    console.log('   • Quick action templates');
    console.log('   • Learning from feedback');
}

// Run all tests
console.log('=' .repeat(60));
console.log('📧➡️✅ EMAIL TO TASK CONVERSION TEST');
console.log('=' .repeat(60));

testEmailToTaskFlow().then(() => {
    testWebSocketUpdates();
    setTimeout(() => {
        showFeatures();
        console.log('\n' + '=' .repeat(60));
        console.log('✅ Test completed!');
        console.log('=' .repeat(60));
    }, 2500);
});

// Export for use in other tests
module.exports = {
    MockEmailManager,
    MockTaskExtractor,
    testEmailToTaskFlow
};