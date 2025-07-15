/**
 * Test complete email-to-task conversion flow
 * Works with the actual API endpoints we've created
 */

import axios from 'axios';
import WebSocket from 'ws';

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3002';

// Test email data
const testEmails = [
    {
        id: 'test_email_001',
        subject: 'Urgent: Book flights to Paris for next week',
        from: { name: 'John Doe', address: 'john@company.com' },
        to: [{ address: 'agent@tala.ai' }],
        date: new Date().toISOString(),
        body: `Hi,

Please book flights to Paris for our CEO.

Details:
- Departure: Next Monday from JFK
- Return: Friday same week  
- Business class required
- Budget: $5,000

This is urgent - need confirmation by EOD today.

Thanks,
John`,
        threadId: 'thread_001',
        attachments: []
    },
    {
        id: 'test_email_002',
        subject: 'Hotel needed in Rome - 5 nights',
        from: { name: 'Sarah Smith', address: 'sarah@vip.com' },
        to: [{ address: 'agent@tala.ai' }],
        date: new Date().toISOString(),
        body: `Hello,

We need a luxury hotel in Rome for next month.

Requirements:
- Check-in: April 15
- Check-out: April 20  
- Location: Near Vatican
- 2 rooms (adjoining if possible)
- Spa and gym facilities

Please send options ASAP.

Best,
Sarah`,
        attachments: []
    }
];

async function testEmailToTaskFlow() {
    console.log('🚀 Testing Email-to-Task Conversion Flow...\n');
    
    try {
        // Step 1: Send email to Tala for analysis
        console.log('1️⃣  Sending email to Tala for task extraction:');
        console.log(`   Email: "${testEmails[0].subject}"`);
        
        const sendToTalaResponse = await axios.post(
            `${BASE_URL}/api/email-tasks/send-to-tala`,
            {
                emailId: testEmails[0].id,
                options: {
                    requireConfirmation: true
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'test_user_123' // Mock auth
                }
            }
        );
        
        const { sessionId, taskCount } = sendToTalaResponse.data;
        console.log(`   ✅ Analysis complete!`);
        console.log(`   Session ID: ${sessionId}`);
        console.log(`   Tasks found: ${taskCount}`);
        
        // Step 2: Get session status with task previews
        console.log('\n2️⃣  Getting task preview:');
        const statusResponse = await axios.get(
            `${BASE_URL}/api/email-tasks/status/${sessionId}`,
            {
                headers: {
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        const taskPreviews = statusResponse.data.status?.results?.taskPreviews || [];
        console.log(`   📋 Task suggestions:`);
        
        taskPreviews.forEach((task, i) => {
            console.log(`\n   Task ${i + 1}:`);
            console.log(`   Title: ${task.title}`);
            console.log(`   Priority: ${task.priority} ${task.priorityReason ? `(${task.priorityReason})` : ''}`);
            console.log(`   Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}`);
            console.log(`   Type: ${task.travelType || 'general'}`);
            console.log(`   Assignees: ${task.suggestedAssignees?.map(a => a.userId).join(', ') || 'None'}`);
            console.log(`   Confidence: ${(task.confidence * 100).toFixed(0)}%`);
            console.log(`   Tags: ${task.tags.join(', ')}`);
        });
        
        // Step 3: User edits (simulate)
        console.log('\n3️⃣  User reviewing and editing tasks...');
        const edits = {
            0: {
                priority: 'urgent', // Upgrade priority
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
            }
        };
        console.log('   ✏️  Changed priority to URGENT');
        console.log('   ✏️  Set due date to 3 days from now');
        
        // Step 4: Confirm and create tasks
        console.log('\n4️⃣  Creating tasks:');
        const confirmResponse = await axios.post(
            `${BASE_URL}/api/email-tasks/confirm/${sessionId}`,
            {
                confirmed: true,
                edits: edits,
                rejectedTasks: [] // Accept all tasks
            },
            {
                headers: {
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        console.log(`   ✅ Created ${confirmResponse.data.tasksCreated} tasks successfully!`);
        
        if (confirmResponse.data.tasks) {
            confirmResponse.data.tasks.forEach((task, i) => {
                console.log(`   ${i + 1}. Task ID: ${task.id} - ${task.title}`);
            });
        }
        
        // Step 5: Test batch processing
        console.log('\n5️⃣  Testing batch email processing:');
        console.log('   Sending 2 emails for batch processing...');
        
        // Mock email storage first
        await storeTestEmails();
        
        const batchResponse = await axios.post(
            `${BASE_URL}/api/email-tasks/batch-send-to-tala`,
            {
                emailIds: testEmails.map(e => e.id),
                options: {
                    autoCreate: true // Auto-create without confirmation
                }
            },
            {
                headers: {
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        console.log(`   ✅ Batch processing complete!`);
        console.log(`   Total: ${batchResponse.data.total}`);
        console.log(`   Successful: ${batchResponse.data.successful}`);
        console.log(`   Failed: ${batchResponse.data.failed}`);
        
        // Step 6: Test quick actions
        console.log('\n6️⃣  Testing quick actions:');
        const quickActionResponse = await axios.post(
            `${BASE_URL}/api/email-tasks/quick-action`,
            {
                actionId: 'createFlightTask',
                emailId: testEmails[0].id
            },
            {
                headers: {
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        console.log(`   ✅ Quick flight task created!`);
        console.log(`   Task ID: ${quickActionResponse.data.task?.id}`);
        
        // Step 7: Get statistics
        console.log('\n7️⃣  Getting conversion statistics:');
        const statsResponse = await axios.get(
            `${BASE_URL}/api/email-tasks/stats`,
            {
                headers: {
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        const stats = statsResponse.data.stats;
        console.log(`   📊 Statistics:`);
        console.log(`   Active conversions: ${stats.activeConversions}`);
        console.log(`   Emails processed: ${stats.converter?.emailsProcessed || 0}`);
        console.log(`   Tasks created: ${stats.converter?.tasksCreated || 0}`);
        console.log(`   Success rate: ${((stats.converter?.successRate || 0) * 100).toFixed(1)}%`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status === 404) {
            console.log('\n💡 Make sure the email-tasks routes are registered in your server!');
        }
    }
}

// Test WebSocket real-time updates
async function testWebSocketUpdates() {
    console.log('\n\n🔄 Testing WebSocket Real-time Updates:');
    
    return new Promise((resolve) => {
        const ws = new WebSocket(WS_URL);
        let messageCount = 0;
        
        ws.on('open', () => {
            console.log('   ✅ WebSocket connected');
            
            // Subscribe to a test session
            ws.send(JSON.stringify({
                type: 'subscribe',
                sessionId: 'test_session_123'
            }));
            
            console.log('   📡 Subscribed to session updates');
        });
        
        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            messageCount++;
            
            switch (message.type) {
                case 'connected':
                    console.log(`   🔗 Connection ID: ${message.connectionId}`);
                    break;
                    
                case 'progress':
                    console.log(`   📊 Progress: ${message.status} - ${message.message} (${message.progress}%)`);
                    break;
                    
                case 'status':
                    console.log(`   📋 Status update received`);
                    break;
                    
                default:
                    console.log(`   📨 Message: ${message.type}`);
            }
            
            // Close after receiving a few messages
            if (messageCount >= 3) {
                ws.close();
            }
        });
        
        ws.on('close', () => {
            console.log('   🔌 WebSocket disconnected');
            resolve();
        });
        
        ws.on('error', (error) => {
            console.log(`   ❌ WebSocket error: ${error.message}`);
            resolve();
        });
        
        // Timeout after 5 seconds
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
            resolve();
        }, 5000);
    });
}

// Mock function to store test emails (in real app, this would be in EmailManager)
async function storeTestEmails() {
    // In a real implementation, this would store emails in the database
    console.log('   📧 Storing test emails...');
}

// Test extraction without creating tasks
async function testExtractOnly() {
    console.log('\n\n🔍 Testing Task Extraction (Preview Only):');
    
    try {
        const response = await axios.post(
            `${BASE_URL}/api/email-tasks/extract`,
            {
                emailId: testEmails[1].id
            },
            {
                headers: {
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        console.log(`   Email type: ${response.data.emailType}`);
        console.log(`   Tasks extracted: ${response.data.extractedTasks.length}`);
        
        response.data.extractedTasks.forEach((task, i) => {
            console.log(`\n   Extracted Task ${i + 1}:`);
            console.log(`   - ${task.title}`);
            console.log(`   - Type: ${task.type || 'general'}`);
            console.log(`   - Confidence: ${(task.confidence * 100).toFixed(0)}%`);
        });
        
    } catch (error) {
        console.error('❌ Extraction test failed:', error.response?.data || error.message);
    }
}

// Test available actions
async function testAvailableActions() {
    console.log('\n\n🎯 Testing Available Actions:');
    
    try {
        const response = await axios.get(
            `${BASE_URL}/api/email-tasks/actions`,
            {
                headers: {
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        console.log('   Available email actions:');
        response.data.actions.forEach(action => {
            console.log(`   ${action.icon} ${action.name}`);
            console.log(`      ID: ${action.id}`);
            console.log(`      Description: ${action.description}`);
            if (action.shortcut) {
                console.log(`      Shortcut: ${action.shortcut}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Actions test failed:', error.response?.data || error.message);
    }
}

// Main test runner
async function runAllTests() {
    console.log('=' .repeat(60));
    console.log('📧➡️✅ EMAIL TO TASK CONVERSION - INTEGRATION TEST');
    console.log('=' .repeat(60));
    
    // Run tests sequentially
    await testEmailToTaskFlow();
    await testWebSocketUpdates();
    await testExtractOnly();
    await testAvailableActions();
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ All tests completed!');
    console.log('=' .repeat(60));
}

// Run tests
runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});