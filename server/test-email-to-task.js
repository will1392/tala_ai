/**
 * Email to Task Conversion Demo
 * 
 * Demonstrates the complete flow from email selection to task creation
 */

import { EmailToTaskConverter } from './services/email/EmailToTaskConverter.js';
import { TaskSuggestionEngine } from './services/tasks/TaskSuggestionEngine.js';
import { EmailActionHandler } from './services/email/EmailActionHandler.js';
import WebSocket from 'ws';

// Color console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bright');
  console.log('='.repeat(60) + '\n');
}

// Sample emails for testing
const sampleEmails = {
  flightBooking: {
    id: 'email_001',
    subject: 'Urgent: Book flights to Tokyo for Johnson family',
    from: { 
      name: 'Sarah Johnson', 
      address: 'sarah.johnson@premiumtravel.com' 
    },
    to: [{ address: 'agent@tala.ai' }],
    date: new Date(),
    threadId: 'thread_tokyo_001',
    body: `Hi,

We need to book flights to Tokyo for our VIP clients urgently.

Details:
- Departure: March 25, 2024 from JFK
- Return: April 3, 2024
- 2 adults + 1 child (age 8)
- Business class preferred
- Budget: $15,000 total

They have a meeting on March 26 at 10 AM Tokyo time, so need to arrive by March 25 evening.

Please confirm availability and send options by end of day today.

Best regards,
Sarah Johnson
Premium Travel Services`,
    attachments: []
  },
  
  hotelRequest: {
    id: 'email_002',
    subject: 'RE: Rome hotel needed - 5 star near Vatican',
    from: {
      name: 'Michael Chen',
      address: 'mchen@executiveassist.com'
    },
    to: [{ address: 'agent@tala.ai' }],
    date: new Date(),
    body: `Hello,

Following up on our call - our CEO needs a 5-star hotel in Rome.

Requirements:
- Check-in: April 15
- Check-out: April 20
- Location: Walking distance to Vatican
- Suite with business center access
- Airport transfers included

This is for an important conference, so please prioritize.

Thanks,
Michael`,
    attachments: [{
      filename: 'conference_details.pdf',
      size: 245000,
      contentType: 'application/pdf'
    }]
  },
  
  visaReminder: {
    id: 'email_003',
    subject: 'Visa deadline approaching - Smith family India trip',
    from: {
      name: 'Travel System',
      address: 'notifications@travelagency.com'
    },
    to: [{ address: 'agent@tala.ai' }],
    date: new Date(),
    body: `REMINDER: The Smith family's India trip is in 45 days.

Visa Status: NOT STARTED
Trip Dates: May 1-15, 2024
Travelers: 4 (2 adults, 2 children)

Action Required:
1. Collect passport copies
2. Complete visa application forms
3. Schedule biometric appointment
4. Submit application (processing time: 15-20 days)

Please begin the visa process immediately to avoid delays.`,
    attachments: []
  },
  
  itineraryRequest: {
    id: 'email_004',
    subject: 'Plan honeymoon trip to Bali - June 2024',
    from: {
      name: 'Emma Wilson',
      address: 'emma.w@gmail.com'
    },
    to: [{ address: 'agent@tala.ai' }],
    date: new Date(),
    body: `Hi there!

We're so excited about our honeymoon to Bali! Here's what we're looking for:

Dates: June 10-20, 2024
Budget: $8,000 all-inclusive
Interests: Beach, spa, cultural experiences, romantic dinners

We'd like:
- Beachfront resort with private pool villa
- Couples spa package
- Sunset dinner cruise
- Temple tours
- Maybe some adventure activities (not too extreme!)

Can you put together a complete package with flights from LAX?

Thanks so much!
Emma & James`,
    attachments: []
  }
};

// Demo the complete flow
async function runEmailToTaskDemo() {
  header('📧➡️✅ EMAIL TO TASK CONVERSION DEMO');
  
  const userId = 'demo_agent';
  
  // Initialize services
  const actionHandler = new EmailActionHandler({
    userId,
    enableWebSocket: false, // Disable for demo
    showProgress: true
  });
  
  await actionHandler.initialize();
  
  // Demo 1: Flight Booking Email
  await demoFlightBooking(actionHandler, userId);
  
  // Demo 2: Hotel Request with Attachments
  await demoHotelRequest(actionHandler, userId);
  
  // Demo 3: Visa Reminder
  await demoVisaReminder(actionHandler, userId);
  
  // Demo 4: Complete Itinerary Request
  await demoItineraryRequest(actionHandler, userId);
  
  // Show statistics
  showStatistics(actionHandler);
}

async function demoFlightBooking(actionHandler, userId) {
  console.log('\n' + colors.cyan + '▸ Demo 1: Flight Booking Email' + colors.reset);
  console.log(colors.gray + '─'.repeat(50) + colors.reset);
  
  const email = sampleEmails.flightBooking;
  
  log(`📧 Email: "${email.subject}"`, 'yellow');
  log(`   From: ${email.from.name} <${email.from.address}>`, 'gray');
  
  try {
    // Send to Tala
    const result = await actionHandler.handleSendToTala(email, userId);
    
    log(`\n✅ Extraction Results:`, 'green');
    log(`   Session ID: ${result.sessionId}`, 'gray');
    log(`   Tasks found: ${result.taskCount}`, 'gray');
    
    // Get session details
    const session = actionHandler.activeConversions.get(result.sessionId);
    if (session && session.results) {
      const previews = session.results.taskPreviews;
      
      log('\n📋 Task Previews:', 'blue');
      previews.forEach((preview, index) => {
        log(`\n   Task ${index + 1}:`, 'bright');
        log(`   Title: ${preview.title}`, 'gray');
        log(`   Priority: ${preview.priority}`, 'gray');
        log(`   Due: ${preview.dueDate ? new Date(preview.dueDate).toLocaleDateString() : 'Not set'}`, 'gray');
        log(`   Type: ${preview.travelType || 'general'}`, 'gray');
        log(`   Suggested Assignees: ${preview.suggestedAssignees.map(a => a.userId).join(', ') || 'None'}`, 'gray');
        log(`   Tags: ${preview.tags.join(', ')}`, 'gray');
        log(`   Confidence: ${(preview.confidence * 100).toFixed(0)}%`, 'gray');
      });
      
      // Simulate user confirmation
      log('\n👤 User Action: Confirming tasks...', 'yellow');
      
      const confirmResult = await actionHandler.confirmAndCreateTasks(
        result.sessionId,
        {
          confirmed: true,
          edits: {
            // User might edit the first task
            0: {
              priority: 'urgent' // Upgrade priority
            }
          }
        }
      );
      
      log(`\n✅ Created ${confirmResult.tasksCreated} tasks successfully!`, 'green');
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }
}

async function demoHotelRequest(actionHandler, userId) {
  console.log('\n' + colors.cyan + '▸ Demo 2: Hotel Request with Attachments' + colors.reset);
  console.log(colors.gray + '─'.repeat(50) + colors.reset);
  
  const email = sampleEmails.hotelRequest;
  
  log(`📧 Email: "${email.subject}"`, 'yellow');
  log(`   From: ${email.from.name} <${email.from.address}>`, 'gray');
  log(`   Attachments: ${email.attachments.map(a => a.filename).join(', ')}`, 'gray');
  
  try {
    // Use quick action for hotel
    const result = await actionHandler.handleQuickAction(
      'createHotelTask',
      email,
      userId
    );
    
    log(`\n✅ Quick Hotel Task Created:`, 'green');
    log(`   Task ID: ${result.task.id}`, 'gray');
    log(`   Title: ${result.task.title}`, 'gray');
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }
}

async function demoVisaReminder(actionHandler, userId) {
  console.log('\n' + colors.cyan + '▸ Demo 3: Visa Reminder Email' + colors.reset);
  console.log(colors.gray + '─'.repeat(50) + colors.reset);
  
  const email = sampleEmails.visaReminder;
  
  log(`📧 Email: "${email.subject}"`, 'yellow');
  log(`   Type: System Reminder`, 'gray');
  
  try {
    const result = await actionHandler.handleSendToTala(email, userId);
    
    const session = actionHandler.activeConversions.get(result.sessionId);
    if (session && session.results) {
      const previews = session.results.taskPreviews;
      
      log(`\n✅ Visa Tasks Extracted: ${previews.length}`, 'green');
      
      // Show the workflow
      log('\n🔄 Suggested Workflow:', 'blue');
      previews.forEach((preview, index) => {
        const indent = '   ' + (preview.originalTask.sourceText?.includes('Complete') ? '  └─' : '  ├─');
        log(`${indent} ${preview.title}`, 'gray');
        if (preview.suggestedReminders.length > 0) {
          log(`      🔔 Reminder: ${preview.suggestedReminders[0].message}`, 'gray');
        }
      });
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
  }
}

async function demoItineraryRequest(actionHandler, userId) {
  console.log('\n' + colors.cyan + '▸ Demo 4: Complete Itinerary Request' + colors.reset);
  console.log(colors.gray + '─'.repeat(50) + colors.reset);
  
  const email = sampleEmails.itineraryRequest;
  
  log(`📧 Email: "${email.subject}"`, 'yellow');
  log(`   Type: Trip Planning Request`, 'gray');
  
  try {
    // Extract trip details and create itinerary
    const result = await actionHandler.handleQuickAction(
      'createItinerary',
      email,
      userId
    );
    
    if (result.success) {
      log(`\n✅ Trip Itinerary Created:`, 'green');
      log(`   Destination: ${result.tripDetails.destination}`, 'gray');
      log(`   Dates: ${result.tripDetails.startDate?.toLocaleDateString()} - ${result.tripDetails.endDate?.toLocaleDateString()}`, 'gray');
      log(`   Tasks created: ${result.tasksCreated}`, 'gray');
    }
  } catch (error) {
    // Expected error for demo since we don't have full implementation
    log(`\n⚠️  Note: ${error.message}`, 'yellow');
    log(`   In production, this would create a complete itinerary`, 'gray');
  }
}

function showStatistics(actionHandler) {
  header('📊 CONVERSION STATISTICS');
  
  const stats = actionHandler.getStatistics();
  const converterStats = actionHandler.converter.getStats();
  
  log('Action Handler Stats:', 'bright');
  log(`  Active Conversions: ${stats.activeConversions}`, 'gray');
  log(`  WebSocket Connections: ${stats.wsConnections}`, 'gray');
  
  log('\nConverter Stats:', 'bright');
  log(`  Emails Processed: ${converterStats.emailsProcessed}`, 'gray');
  log(`  Tasks Created: ${converterStats.tasksCreated}`, 'gray');
  log(`  Success Rate: ${(converterStats.successRate * 100).toFixed(1)}%`, 'gray');
  log(`  Avg Extraction Time: ${converterStats.extractionTime.toFixed(0)}ms`, 'gray');
  
  if (converterStats.patterns.length > 0) {
    log('\nPattern Recognition:', 'bright');
    converterStats.patterns.slice(0, 3).forEach(pattern => {
      log(`  ${pattern.key}: ${pattern.count} occurrences`, 'gray');
    });
  }
  
  // Show suggestion accuracy
  const suggestionEngine = actionHandler.converter.suggestionEngine;
  const accuracy = suggestionEngine.getAccuracyMetrics();
  
  log('\nSuggestion Accuracy:', 'bright');
  Object.entries(accuracy).forEach(([metric, data]) => {
    if (data.total > 0) {
      log(`  ${metric}: ${(data.accuracy * 100).toFixed(1)}% (${data.total} samples)`, 'gray');
    }
  });
}

// WebSocket demo (optional)
async function demoWebSocketConnection() {
  header('🔌 WEBSOCKET REAL-TIME UPDATES DEMO');
  
  const ws = new WebSocket('ws://localhost:3002');
  
  ws.on('open', () => {
    log('✅ WebSocket connected', 'green');
    
    // Subscribe to a session
    ws.send(JSON.stringify({
      type: 'subscribe',
      sessionId: 'demo_session_123'
    }));
  });
  
  ws.on('message', (data) => {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'connected':
        log(`🔗 Connection ID: ${message.connectionId}`, 'gray');
        break;
        
      case 'progress':
        log(`📊 Progress: ${message.status} - ${message.message} (${message.progress}%)`, 'blue');
        break;
        
      case 'status':
        log(`📋 Status Update: ${JSON.stringify(message.data)}`, 'gray');
        break;
        
      default:
        log(`📨 Message: ${message.type}`, 'gray');
    }
  });
  
  ws.on('error', (error) => {
    log(`❌ WebSocket error: ${error.message}`, 'red');
  });
  
  // Close after 10 seconds
  setTimeout(() => {
    ws.close();
    log('🔌 WebSocket connection closed', 'yellow');
  }, 10000);
}

// Feature showcase
function showFeatures() {
  header('🌟 EMAIL TO TASK CONVERSION FEATURES');
  
  const features = [
    {
      icon: '🤖',
      title: 'Intelligent Extraction',
      items: [
        'AI-powered task detection',
        'Context-aware suggestions',
        'Multi-language support',
        'Confidence scoring'
      ]
    },
    {
      icon: '📧',
      title: 'Email Processing',
      items: [
        'Thread context preservation',
        'Attachment handling',
        'Email type detection',
        'Sentiment analysis'
      ]
    },
    {
      icon: '✨',
      title: 'Smart Suggestions',
      items: [
        'Priority recommendation',
        'Due date estimation',
        'Assignee matching',
        'Template selection'
      ]
    },
    {
      icon: '🔄',
      title: 'Automation',
      items: [
        'Booking confirmations → Itinerary tasks',
        'Client requests → Service tasks',
        'Deadlines → Automatic reminders',
        'Recurring patterns → Template suggestions'
      ]
    },
    {
      icon: '📊',
      title: 'Learning & Feedback',
      items: [
        'Pattern recognition',
        'User preference learning',
        'Accuracy improvement',
        'Custom template creation'
      ]
    },
    {
      icon: '🔌',
      title: 'Real-time Updates',
      items: [
        'WebSocket support',
        'Progress tracking',
        'Live preview',
        'Instant notifications'
      ]
    }
  ];
  
  features.forEach(feature => {
    log(`\n${feature.icon} ${feature.title}:`, 'bright');
    feature.items.forEach(item => {
      log(`   • ${item}`, 'gray');
    });
  });
}

// Run the demo
async function main() {
  try {
    // Show features first
    showFeatures();
    
    // Run main demo
    await runEmailToTaskDemo();
    
    // Optional: WebSocket demo
    // await demoWebSocketConnection();
    
    log('\n✅ Demo completed successfully!', 'green');
    
  } catch (error) {
    log(`\n❌ Demo error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Execute
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runEmailToTaskDemo, showFeatures };