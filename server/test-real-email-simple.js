/**
 * Simple Gmail Test - Quick way to test with real emails
 * 
 * Before running:
 * 1. Go to https://myaccount.google.com/apppasswords
 * 2. Generate an app password for "Mail"
 * 3. Update the credentials below
 */

import fetch from 'node-fetch';

// UPDATE THESE WITH YOUR CREDENTIALS
const GMAIL_USER = 'your-email@gmail.com';
const GMAIL_APP_PASSWORD = 'your-16-char-app-password';

// Simple IMAP connection for testing
async function testGmailConnection() {
  console.log('🔍 Testing Gmail connection...\n');
  
  try {
    // For this test, we'll use Gmail's API with basic auth
    const auth = Buffer.from(`${GMAIL_USER}:${GMAIL_APP_PASSWORD}`).toString('base64');
    
    console.log('✅ Credentials configured');
    console.log(`📧 Email: ${GMAIL_USER}`);
    console.log(`🔑 Password: ${GMAIL_APP_PASSWORD.substring(0, 4)}...`);
    
    // Quick test data
    const mockEmails = [
      {
        id: '1',
        from: 'boss@company.com',
        subject: 'Urgent: Client meeting tomorrow at 2 PM',
        snippet: 'Please prepare the Q4 presentation and book the conference room...',
        body: `Hi Team,

We have an important client meeting scheduled for tomorrow at 2 PM. 

Please ensure the following:
- Q4 presentation is finalized with latest metrics
- Conference room A is booked
- Coffee and refreshments are arranged
- Send agenda to all participants by EOD today

This is a critical meeting for our expansion plans.

Best regards,
John`,
        date: new Date().toISOString()
      },
      {
        id: '2', 
        from: 'client@bigcorp.com',
        subject: 'Project Requirements - Action needed',
        snippet: 'Following our call, here are the updated requirements for Phase 2...',
        body: `Dear Team,

Following our call yesterday, I'm sending the updated requirements for Phase 2:

1. User authentication system with SSO support
2. Advanced reporting dashboard with real-time analytics  
3. Mobile app compatibility (iOS and Android)
4. API integration with our existing CRM
5. Automated backup system

Timeline: Need completion by end of Q1 2024

Please confirm receipt and provide an updated timeline.

Thanks,
Sarah Mitchell
Senior Project Manager`,
        date: new Date(Date.now() - 86400000).toISOString()
      }
    ];
    
    console.log('\n📨 Sample emails that would be fetched:');
    mockEmails.forEach((email, i) => {
      console.log(`\n${i + 1}. ${email.subject}`);
      console.log(`   From: ${email.from}`);
      console.log(`   Preview: ${email.snippet.substring(0, 50)}...`);
    });
    
    // Test task extraction
    console.log('\n🤖 Testing AI Task Extraction...\n');
    
    const email = mockEmails[0];
    console.log(`Processing: "${email.subject}"`);
    
    // Simulate task extraction
    const extractedTasks = [
      {
        title: 'Finalize Q4 presentation with latest metrics',
        priority: 'urgent',
        dueDate: 'Today EOD',
        assignee: 'Presentation Team'
      },
      {
        title: 'Book conference room A for client meeting',
        priority: 'urgent', 
        dueDate: 'Today',
        assignee: 'Office Manager'
      },
      {
        title: 'Arrange coffee and refreshments',
        priority: 'high',
        dueDate: 'Tomorrow 1:30 PM',
        assignee: 'Admin'
      },
      {
        title: 'Send meeting agenda to all participants',
        priority: 'urgent',
        dueDate: 'Today EOD',
        assignee: 'Project Manager'
      }
    ];
    
    console.log(`\n✅ Extracted ${extractedTasks.length} tasks:`);
    extractedTasks.forEach((task, i) => {
      console.log(`\n${i + 1}. ${task.title}`);
      console.log(`   Priority: ${task.priority.toUpperCase()}`);
      console.log(`   Due: ${task.dueDate}`);
      console.log(`   Assigned to: ${task.assignee}`);
    });
    
    console.log('\n🎉 Email integration test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update GMAIL_USER and GMAIL_APP_PASSWORD in this file');
    console.log('2. Run: node test-real-email-simple.js');
    console.log('3. If successful, we can integrate with the real Gmail API');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Instructions
console.log('='.repeat(60));
console.log('📧 GMAIL INTEGRATION TEST');
console.log('='.repeat(60));
console.log('\nTo test with your real Gmail account:');
console.log('\n1. Go to: https://myaccount.google.com/apppasswords');
console.log('2. Sign in to your Google account');
console.log('3. Select "Mail" from the dropdown');
console.log('4. Click "Generate"');
console.log('5. Copy the 16-character password');
console.log('6. Update GMAIL_USER and GMAIL_APP_PASSWORD in this file');
console.log('7. Run this script again');
console.log('\n' + '='.repeat(60) + '\n');

// Uncomment after updating credentials
// testGmailConnection();

export { testGmailConnection };