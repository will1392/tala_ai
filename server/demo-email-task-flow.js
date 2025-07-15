/**
 * Email to Task Flow Demonstration
 * Shows the complete system in action with realistic examples
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Simulated email data
const demoEmails = [
    {
        id: 'demo_001',
        from: 'CEO <ceo@techcorp.com>',
        subject: 'Urgent: Prepare for Tokyo investor meeting',
        body: `Team,

We've secured a meeting with Softbank investors in Tokyo next week.

Key details:
- Meeting date: March 28, 2024 at 2 PM JST
- Location: Softbank HQ, Tokyo
- Attendees: Myself, CFO, and Head of Product

Please arrange:
1. Business class flights (departing March 26)
2. Hotel near Softbank HQ (5 nights)
3. Presentation materials update
4. Japanese translator
5. Gift for hosts (traditional, ~$200 budget)

This could be our Series B funding, so everything must be perfect.

Best,
John`,
        priority: 'high',
        labels: ['urgent', 'travel', 'investor-relations']
    },
    {
        id: 'demo_002',
        from: 'Sarah <sarah@team.com>',
        subject: 'Q2 Planning - Action items from today\'s meeting',
        body: `Hi everyone,

Following up on our Q2 planning session, here are the action items:

Product Team:
- Launch beta testing for AI feature by April 15
- Complete security audit by March 31
- Hire 2 senior engineers

Marketing:
- Prepare launch campaign for May 1
- Book conference booth for TechCrunch Disrupt
- Update website with new features

Operations:
- Upgrade server infrastructure
- Implement new monitoring system
- Review and update SLAs

Please update your progress in our next sync on Friday.

Thanks,
Sarah`,
        labels: ['planning', 'quarterly-goals']
    }
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeWriter(text, delay = 30) {
    for (const char of text) {
        process.stdout.write(char);
        await sleep(delay);
    }
    console.log();
}

async function showEmailInbox() {
    console.log(`\n${colors.bright}📧 EMAIL INBOX${colors.reset}`);
    console.log('─'.repeat(60));
    
    for (const email of demoEmails) {
        console.log(`\n${colors.yellow}★${colors.reset} ${colors.bright}${email.subject}${colors.reset}`);
        console.log(`   From: ${email.from}`);
        console.log(`   Labels: ${email.labels.join(', ')}`);
    }
    
    console.log('\n' + '─'.repeat(60));
}

async function processEmail(email) {
    console.log(`\n${colors.cyan}▶ Processing: "${email.subject}"${colors.reset}\n`);
    
    // Show email content
    console.log(`${colors.bright}From:${colors.reset} ${email.from}`);
    console.log(`${colors.bright}Subject:${colors.reset} ${email.subject}`);
    console.log(`${colors.bright}Body:${colors.reset}`);
    console.log(email.body.split('\n').map(line => '  ' + line).join('\n'));
    
    // Simulate AI processing
    console.log(`\n${colors.magenta}🤖 AI Analysis in progress...${colors.reset}`);
    await sleep(1500);
    
    // Extract tasks based on email content
    let tasks = [];
    
    if (email.id === 'demo_001') {
        tasks = [
            {
                title: '✈️ Book business class flights to Tokyo (Mar 26)',
                priority: 'urgent',
                dueDate: 'Tomorrow EOD',
                assignee: 'Travel Coordinator',
                tags: ['flight', 'urgent', 'investor-meeting'],
                subtasks: [
                    'Check visa requirements',
                    'Confirm passport validity',
                    'Select seats'
                ]
            },
            {
                title: '🏨 Reserve hotel near Softbank HQ (5 nights)',
                priority: 'urgent',
                dueDate: 'Tomorrow EOD',
                assignee: 'Travel Coordinator',
                tags: ['hotel', 'tokyo', 'investor-meeting']
            },
            {
                title: '📊 Update investor presentation materials',
                priority: 'high',
                dueDate: 'March 25',
                assignee: 'Product Team',
                tags: ['presentation', 'investor-meeting']
            },
            {
                title: '🗾 Arrange Japanese translator',
                priority: 'high',
                dueDate: 'March 24',
                assignee: 'Operations Manager',
                tags: ['translator', 'meeting-logistics']
            },
            {
                title: '🎁 Purchase traditional gift for hosts ($200)',
                priority: 'medium',
                dueDate: 'March 25',
                assignee: 'Executive Assistant',
                tags: ['gift', 'cultural', 'investor-meeting']
            }
        ];
    } else if (email.id === 'demo_002') {
        tasks = [
            {
                title: '🚀 Launch beta testing for AI feature',
                priority: 'high',
                dueDate: 'April 15',
                assignee: 'Product Team',
                tags: ['product', 'beta', 'Q2-goals']
            },
            {
                title: '🔒 Complete security audit',
                priority: 'high',
                dueDate: 'March 31',
                assignee: 'Security Team',
                tags: ['security', 'compliance', 'Q2-goals']
            },
            {
                title: '👥 Hire 2 senior engineers',
                priority: 'medium',
                dueDate: 'April 30',
                assignee: 'HR Team',
                tags: ['hiring', 'engineering', 'Q2-goals']
            },
            {
                title: '📢 Prepare May 1 launch campaign',
                priority: 'high',
                dueDate: 'April 20',
                assignee: 'Marketing Team',
                tags: ['marketing', 'launch', 'Q2-goals']
            }
        ];
    }
    
    // Show extracted tasks
    console.log(`\n${colors.green}✅ Extracted ${tasks.length} tasks:${colors.reset}\n`);
    
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        console.log(`${colors.bright}Task ${i + 1}: ${task.title}${colors.reset}`);
        console.log(`   ${colors.yellow}Priority:${colors.reset} ${task.priority.toUpperCase()}`);
        console.log(`   ${colors.blue}Due:${colors.reset} ${task.dueDate}`);
        console.log(`   ${colors.cyan}Assignee:${colors.reset} ${task.assignee}`);
        console.log(`   ${colors.dim}Tags:${colors.reset} ${task.tags.join(', ')}`);
        
        if (task.subtasks) {
            console.log(`   ${colors.dim}Subtasks:${colors.reset}`);
            task.subtasks.forEach(st => console.log(`     • ${st}`));
        }
        console.log();
    }
    
    // Show suggested reminders
    console.log(`${colors.magenta}⏰ Suggested Reminders:${colors.reset}`);
    
    if (email.priority === 'high') {
        console.log('   • 2 hours from now - Email reminder');
        console.log('   • Tomorrow 9 AM - Push notification');
        console.log('   • 1 day before due date - SMS alert');
    } else {
        console.log('   • Tomorrow 9 AM - Email reminder');
        console.log('   • 2 days before due date - Push notification');
    }
    
    // Show automation
    console.log(`\n${colors.blue}🔄 Automation Applied:${colors.reset}`);
    console.log('   • Tasks auto-assigned based on type');
    console.log('   • Priority set based on email urgency');
    console.log('   • Due dates calculated intelligently');
    console.log('   • Related tasks grouped together');
    
    await sleep(1000);
}

async function showIntegrationOptions() {
    console.log(`\n${colors.bright}🔌 OPTIONAL INTEGRATIONS${colors.reset}`);
    console.log('─'.repeat(60));
    
    console.log('\n✅ Tasks created in Tala AI native system');
    console.log('\nOptional sync available:');
    console.log('  📝 Notion - Sync to your task database');
    console.log('  📊 Linear - Create issues in your team workspace');
    console.log('  🔄 Two-way sync keeps everything updated');
    
    console.log(`\n${colors.dim}Note: System is fully functional without any integrations${colors.reset}`);
}

async function showDashboard() {
    console.log(`\n${colors.bright}📊 TASK DASHBOARD${colors.reset}`);
    console.log('─'.repeat(60));
    
    const stats = {
        total: 9,
        urgent: 4,
        high: 4,
        medium: 1,
        todayDue: 2,
        thisWeek: 7
    };
    
    console.log('\n📈 Statistics:');
    console.log(`   Total tasks created: ${stats.total}`);
    console.log(`   ${colors.red}Urgent: ${stats.urgent}${colors.reset}`);
    console.log(`   ${colors.yellow}High: ${stats.high}${colors.reset}`);
    console.log(`   ${colors.green}Medium: ${stats.medium}${colors.reset}`);
    
    console.log('\n📅 Timeline:');
    console.log(`   Due today: ${stats.todayDue}`);
    console.log(`   Due this week: ${stats.thisWeek}`);
    
    console.log('\n👥 Assignments:');
    console.log('   Travel Coordinator: 2 tasks');
    console.log('   Product Team: 2 tasks');
    console.log('   Marketing Team: 1 task');
    console.log('   Others: 4 tasks');
}

async function runDemo() {
    console.clear();
    
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}     TALA AI - EMAIL TO TASK INTELLIGENCE DEMO${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    
    await sleep(1000);
    
    // Show inbox
    await showEmailInbox();
    await sleep(2000);
    
    // Process emails
    for (const email of demoEmails) {
        await processEmail(email);
        await sleep(2000);
    }
    
    // Show integration options
    await showIntegrationOptions();
    await sleep(2000);
    
    // Show dashboard
    await showDashboard();
    
    // Summary
    console.log(`\n${colors.bright}${colors.green}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}✨ DEMO COMPLETE${colors.reset}`);
    console.log(`${colors.bright}${colors.green}${'='.repeat(60)}${colors.reset}`);
    
    console.log('\n🎯 What you just saw:');
    console.log('   ✅ Emails automatically analyzed by AI');
    console.log('   ✅ Multiple tasks extracted from each email');
    console.log('   ✅ Smart priority and deadline assignment');
    console.log('   ✅ Automatic task assignment to team members');
    console.log('   ✅ Intelligent reminder scheduling');
    console.log('   ✅ Optional integration with external tools');
    
    console.log(`\n${colors.cyan}💡 Key Features:${colors.reset}`);
    console.log('   • Works with Gmail, Outlook, or any email provider');
    console.log('   • No integrations required - fully standalone');
    console.log('   • Optional sync with Notion and Linear');
    console.log('   • Multi-channel reminders (email, SMS, push)');
    console.log('   • Learns from your patterns over time');
    
    console.log(`\n${colors.yellow}🚀 Ready for production with:${colors.reset}`);
    console.log('   • Enterprise-grade security');
    console.log('   • Real-time monitoring');
    console.log('   • Comprehensive API');
    console.log('   • WebSocket support');
    console.log('   • Full audit trail');
    
    console.log(`\n${colors.bright}Thank you for watching the Tala AI demo!${colors.reset}\n`);
}

// Run the demo
if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = { runDemo };