// Test complete email-to-task conversion flow
const axios = require('axios');

async function testEmailToTaskFlow() {
    console.log('Testing Email-to-Task Flow...\n');
    
    const BASE_URL = 'http://localhost:3001';
    
    try {
        // Test email data
        const emailData = {
            id: 'test_email_001',
            subject: 'Urgent: Book flights to Tokyo for Johnson family',
            from: { name: 'Sarah Johnson', address: 'sarah@company.com' },
            to: [{ address: 'agent@tala.ai' }],
            date: new Date().toISOString(),
            body: 'Need to book flights urgently. Departure March 25 from JFK, return April 3. Business class for 2 adults and 1 child.',
            threadId: 'thread_001'
        };
        
        // Step 1: Send email to Tala for task extraction
        console.log('1️⃣ Sending email to Tala:');
        console.log(`   Email: "${emailData.subject}"`);
        
        const sendResponse = await axios.post(
            `${BASE_URL}/api/email-tasks/send-to-tala`,
            {
                emailId: emailData.id,
                options: {
                    requireConfirmation: true
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        console.log('   ✅ Analysis complete!');
        console.log(`   Session ID: ${sendResponse.data.sessionId}`);
        console.log(`   Tasks found: ${sendResponse.data.taskCount}`);
        
        // Step 2: Get session status with task previews
        console.log('\n2️⃣ Getting task preview:');
        const statusResponse = await axios.get(
            `${BASE_URL}/api/email-tasks/status/${sendResponse.data.sessionId}`,
            {
                headers: {
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        const taskPreviews = statusResponse.data.status?.results?.taskPreviews || [];
        console.log(`   📋 Task suggestions: ${taskPreviews.length}`);
        
        taskPreviews.forEach((task, i) => {
            console.log(`\n   Task ${i + 1}: ${task.title}`);
            console.log(`   Priority: ${task.priority}`);
            console.log(`   Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}`);
            console.log(`   Confidence: ${(task.confidence * 100).toFixed(0)}%`);
        });
        
        // Step 3: Confirm and create tasks
        console.log('\n3️⃣ Creating tasks:');
        const confirmResponse = await axios.post(
            `${BASE_URL}/api/email-tasks/confirm/${sendResponse.data.sessionId}`,
            {
                confirmed: true,
                edits: {},
                rejectedTasks: []
            },
            {
                headers: {
                    'x-user-id': 'test_user_123'
                }
            }
        );
        
        console.log(`   ✅ Created ${confirmResponse.data.tasksCreated} tasks successfully!`);
        
        // Step 4: Test the original endpoint format (if email integration exists)
        console.log('\n4️⃣ Testing email message endpoint (if available):');
        try {
            // This tests the endpoint format from the user's original test
            await axios.post(
                `${BASE_URL}/api/email/message/${emailData.id}/send-to-tala`,
                {},
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': 'test_user_123'
                    }
                }
            );
            console.log('   ✅ Email message endpoint is available');
        } catch (emailError) {
            console.log('   ℹ️  Email message endpoint not found - using email-tasks API instead');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            console.log('\n💡 API endpoint not found. Make sure:');
            console.log('   1. The server is running (npm start)');
            console.log('   2. Email-tasks routes are added to server.js');
            console.log('   3. See INTEGRATION_INSTRUCTIONS.md for setup');
        }
    }
}

// Run the test
testEmailToTaskFlow();