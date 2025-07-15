/**
 * Simple Gmail Test Script
 * Tests if we can fetch real emails and integrates with our API
 */

import fetch from 'node-fetch';

async function testGmailIntegration() {
    console.log('🔍 Testing Gmail Integration...\n');
    
    // Test 1: Check if server is running
    try {
        const healthResponse = await fetch('http://localhost:3001/api/health');
        const healthData = await healthResponse.json();
        console.log('✅ Server is running');
        console.log(`📊 Health: ${healthData.status}`);
    } catch (error) {
        console.log('❌ Server not running. Start with: npm run dev');
        return;
    }
    
    // Test 2: Test email messages endpoint
    try {
        console.log('\n📧 Testing email messages endpoint...');
        const emailResponse = await fetch('http://localhost:3001/api/email/messages', {
            headers: {
                'x-user-id': 'test_user_123'
            }
        });
        
        const emailData = await emailResponse.json();
        console.log('📨 Response status:', emailResponse.status);
        console.log('📋 Email data:', JSON.stringify(emailData, null, 2));
        
        if (emailData.messages && emailData.messages.length > 0) {
            console.log(`✅ Found ${emailData.messages.length} emails`);
            
            // Test each email
            emailData.messages.forEach((email, i) => {
                console.log(`\n📧 Email ${i + 1}:`);
                console.log(`   From: ${email.from}`);
                console.log(`   Subject: ${email.subject}`);
                console.log(`   Date: ${email.date}`);
                console.log(`   Unread: ${email.isUnread ? 'Yes' : 'No'}`);
            });
        }
        
    } catch (error) {
        console.log('❌ Error testing email endpoint:', error.message);
    }
    
    // Test 3: Test email-tasks endpoint (Send to Tala)
    try {
        console.log('\n🤖 Testing "Send to Tala" endpoint...');
        const sendToTalaResponse = await fetch('http://localhost:3001/api/email-tasks/send-to-tala', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': 'test_user_123'
            },
            body: JSON.stringify({
                emailId: '1',
                emailData: {
                    subject: 'Test Email for Task Extraction',
                    from: 'test@example.com',
                    body: 'Please schedule a meeting with the client for next Tuesday at 2 PM. Also, prepare the quarterly report and send the invoice for last month.'
                }
            })
        });
        
        const taskData = await sendToTalaResponse.json();
        console.log('🎯 Task extraction response:', JSON.stringify(taskData, null, 2));
        
    } catch (error) {
        console.log('❌ Error testing task extraction:', error.message);
    }
    
    console.log('\n🎉 Gmail integration test completed!');
}

// Run the test
testGmailIntegration().catch(console.error);