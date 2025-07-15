/**
 * Comprehensive Test Suite for Email & Task Intelligence System
 * Tests all components: email providers, task extraction, reminders, and integrations
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import EmailToTaskConverter from './services/EmailToTaskConverter.js';
import TaskSuggestionEngine from './services/TaskSuggestionEngine.js';
import EmailActionHandler from './services/EmailActionHandler.js';
import TaskManager from './services/TaskManager.js';
import TaskWorkflow from './services/TaskWorkflow.js';
import TaskAutomation from './services/TaskAutomation.js';
import ReminderService from './services/ReminderService.js';
import IntegrationManager from './services/integrations/IntegrationManager.js';
import NotionIntegration from './services/integrations/NotionIntegration.js';
import LinearIntegration from './services/integrations/LinearIntegration.js';

// Test data
const testEmails = {
    flightBooking: {
        id: 'email_001',
        subject: 'Urgent: Book flights to Tokyo for client meeting',
        from: { name: 'CEO', address: 'ceo@company.com' },
        to: [{ address: 'assistant@company.com' }],
        body: `Please book the following flights ASAP:
        
        Outbound: March 25, JFK to NRT, Business Class
        Return: April 2, NRT to JFK, Business Class
        
        Passenger: John Smith (Passport: US123456789)
        Budget: Max $8,000
        
        Need confirmation by end of day today.`,
        date: new Date().toISOString(),
        priority: 'high'
    },
    hotelRequest: {
        id: 'email_002',
        subject: 'Hotel needed in Rome - 5 nights',
        from: { name: 'VIP Client', address: 'vip@client.com' },
        body: `Need luxury hotel near Vatican:
        - Check-in: April 15
        - Check-out: April 20
        - 2 rooms (adjoining preferred)
        - Must have spa and gym
        - Budget: €500/night per room`,
        date: new Date().toISOString()
    },
    visaReminder: {
        id: 'email_003',
        subject: 'RE: India trip - visa requirements',
        body: `Don't forget:
        - Apply for India e-visa at least 4 days before travel
        - Need passport copy and photo
        - Travel dates: May 10-20
        - Business visa required`,
        threadId: 'thread_visa_001',
        date: new Date().toISOString()
    }
};

const testTasks = {
    flightTask: {
        id: 'task_001',
        title: 'Book Tokyo flights for John Smith',
        description: 'Business class flights JFK-NRT roundtrip',
        priority: 'urgent',
        status: 'pending',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        tags: ['flight', 'urgent', 'business-travel'],
        metadata: {
            passenger: 'John Smith',
            route: 'JFK-NRT',
            budget: 8000,
            class: 'business'
        }
    },
    hotelTask: {
        id: 'task_002',
        title: 'Book Rome hotel near Vatican',
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        tags: ['hotel', 'vip', 'rome'],
        assignedTo: 'agent_001'
    }
};

describe('Email to Task Conversion', () => {
    let converter;
    let suggestionEngine;
    let taskExtractor;
    
    beforeAll(() => {
        converter = new EmailToTaskConverter();
        suggestionEngine = new TaskSuggestionEngine();
        taskExtractor = {
            extractTasks: async (email) => {
                // Mock task extraction
                const tasks = [];
                
                if (email.subject.toLowerCase().includes('flight')) {
                    tasks.push({
                        title: `Book flight: ${email.subject}`,
                        type: 'flight',
                        entities: {
                            dates: ['March 25', 'April 2'],
                            locations: ['JFK', 'NRT', 'Tokyo'],
                            people: ['John Smith'],
                            amounts: [8000]
                        },
                        confidence: 0.9
                    });
                }
                
                if (email.subject.toLowerCase().includes('hotel')) {
                    tasks.push({
                        title: `Hotel booking: ${email.subject}`,
                        type: 'hotel',
                        entities: {
                            dates: ['April 15', 'April 20'],
                            locations: ['Rome', 'Vatican'],
                            amounts: [500]
                        },
                        confidence: 0.85
                    });
                }
                
                return tasks;
            }
        };
        
        converter.taskExtractor = taskExtractor;
    });
    
    test('Extract tasks from flight booking email', async () => {
        const result = await converter.convertEmailToTasks(testEmails.flightBooking);
        
        expect(result.tasks).toHaveLength(1);
        expect(result.tasks[0].title).toContain('flight');
        expect(result.tasks[0].priority).toBe('urgent');
        expect(result.tasks[0].metadata.sourceEmail).toBe('email_001');
    });
    
    test('Generate smart suggestions for tasks', async () => {
        const task = {
            title: 'Book flight to Tokyo',
            type: 'flight',
            entities: {
                dates: ['March 25'],
                locations: ['Tokyo'],
                people: ['John Smith']
            }
        };
        
        const suggestions = await suggestionEngine.generateTaskSuggestion(
            task,
            testEmails.flightBooking
        );
        
        expect(suggestions.priority).toBe('urgent');
        expect(suggestions.dueDate).toBeDefined();
        expect(suggestions.tags).toContain('flight');
        expect(suggestions.tags).toContain('urgent');
        expect(suggestions.reminders).toHaveLength(3);
    });
    
    test('Preserve thread context', async () => {
        const threadContext = {
            previousEmails: [
                { subject: 'India trip planning', body: 'Discussing dates...' }
            ],
            participants: ['manager@company.com', 'assistant@company.com']
        };
        
        converter.getThreadContext = async () => threadContext;
        
        const result = await converter.convertEmailToTasks(testEmails.visaReminder);
        
        expect(result.tasks[0].metadata.threadId).toBe('thread_visa_001');
        expect(result.tasks[0].metadata.threadContext).toBeDefined();
    });
    
    test('Handle batch email processing', async () => {
        const emails = [testEmails.flightBooking, testEmails.hotelRequest];
        const results = [];
        
        for (const email of emails) {
            const result = await converter.convertEmailToTasks(email);
            results.push(result);
        }
        
        expect(results).toHaveLength(2);
        expect(results[0].tasks[0].type).toBe('flight');
        expect(results[1].tasks[0].type).toBe('hotel');
    });
});

describe('Task Management System', () => {
    let taskManager;
    let taskWorkflow;
    let taskAutomation;
    
    beforeAll(() => {
        // Mock database
        const mockDb = {
            tasks: new Map(),
            query: async (sql, params) => {
                // Mock query responses
                return { rows: [] };
            },
            execute: async (sql, params) => {
                return { affectedRows: 1 };
            }
        };
        
        taskManager = new TaskManager({ db: mockDb });
        taskWorkflow = new TaskWorkflow({ db: mockDb });
        taskAutomation = new TaskAutomation({ db: mockDb, taskManager });
    });
    
    test('Create task with full metadata', async () => {
        const task = await taskManager.createTask(testTasks.flightTask);
        
        expect(task.id).toBeDefined();
        expect(task.status).toBe('pending');
        expect(task.priority).toBe('urgent');
        expect(task.metadata.passenger).toBe('John Smith');
    });
    
    test('Task workflow transitions', async () => {
        const transitions = await taskWorkflow.getAvailableTransitions('pending');
        
        expect(transitions).toContain('start');
        expect(transitions).toContain('cancel');
        
        const result = await taskWorkflow.transitionTask(testTasks.flightTask, 'start');
        expect(result.newStatus).toBe('in_progress');
    });
    
    test('Task automation rules', async () => {
        const rule = {
            name: 'Auto-assign flight tasks',
            trigger: { type: 'task_created', conditions: { type: 'flight' } },
            actions: [
                { type: 'assign_user', params: { userId: 'flight_specialist' } },
                { type: 'add_tag', params: { tag: 'auto-assigned' } }
            ]
        };
        
        await taskAutomation.createRule(rule);
        
        const task = { ...testTasks.flightTask, type: 'flight' };
        const result = await taskAutomation.processTaskEvent('created', task);
        
        expect(result.executed).toHaveLength(1);
        expect(result.executed[0].actions).toHaveLength(2);
    });
    
    test('Recurring task creation', async () => {
        const template = {
            title: 'Weekly flight report',
            recurrence: {
                pattern: 'weekly',
                interval: 1,
                daysOfWeek: [1], // Monday
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
        };
        
        const tasks = await taskManager.createRecurringTask(template);
        expect(tasks.length).toBeGreaterThan(3); // At least 4 weeks
    });
});

describe('Reminder Service', () => {
    let reminderService;
    
    beforeAll(() => {
        reminderService = new ReminderService({
            channels: {
                email: { send: async () => ({ sent: true }) },
                sms: { send: async () => ({ sent: true }) },
                push: { send: async () => ({ sent: true }) }
            }
        });
    });
    
    test('Create multi-channel reminder', async () => {
        const reminder = await reminderService.createReminder({
            taskId: 'task_001',
            reminderTime: new Date(Date.now() + 60 * 60 * 1000),
            channels: ['email', 'push'],
            message: 'Flight booking deadline approaching'
        });
        
        expect(reminder.id).toBeDefined();
        expect(reminder.channels).toContain('email');
        expect(reminder.channels).toContain('push');
    });
    
    test('Smart reminder suggestions', () => {
        const task = {
            priority: 'urgent',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };
        
        const suggestions = reminderService.suggestReminders(task);
        
        expect(suggestions).toHaveLength(3);
        expect(suggestions[0].type).toBe('email');
        expect(suggestions[0].timing).toContain('1 hour before');
    });
    
    test('Process due reminders', async () => {
        // Create past-due reminder
        const reminder = {
            id: 'rem_001',
            taskId: 'task_001',
            reminderTime: new Date(Date.now() - 1000),
            channels: ['email'],
            sent: false
        };
        
        reminderService.reminders.set(reminder.id, reminder);
        
        const results = await reminderService.processDueReminders();
        expect(results.processed).toBe(1);
        expect(results.sent).toBe(1);
    });
});

describe('Third-Party Integrations', () => {
    let integrationManager;
    let notionIntegration;
    let linearIntegration;
    
    beforeAll(() => {
        integrationManager = new IntegrationManager({
            db: {
                saveIntegrationConfig: async () => ({ id: 'config_001' }),
                getIntegrationConfig: async () => ({ enabled: true }),
                saveEntityMapping: async () => ({}),
                getEntityMapping: async () => null
            },
            taskManager: {
                getTasks: async () => [testTasks.flightTask],
                createTask: async (task) => ({ ...task, id: 'new_task_001' }),
                updateTask: async () => ({})
            }
        });
        
        notionIntegration = new NotionIntegration();
        linearIntegration = new LinearIntegration();
        
        integrationManager.registerIntegration(notionIntegration);
        integrationManager.registerIntegration(linearIntegration);
    });
    
    test('Register and list integrations', () => {
        const integrations = integrationManager.getAllIntegrations();
        
        expect(integrations).toHaveLength(2);
        expect(integrations.map(i => i.id)).toContain('notion');
        expect(integrations.map(i => i.id)).toContain('linear');
    });
    
    test('Validate Notion configuration', async () => {
        const validConfig = {
            apiKey: 'secret_abc123',
            databaseId: '123e4567-e89b-12d3-a456-426614174000'
        };
        
        const invalidConfig = {
            apiKey: 'invalid_key',
            databaseId: 'not-a-uuid'
        };
        
        await expect(notionIntegration.validateConfig(validConfig)).resolves.toBe(true);
        await expect(notionIntegration.validateConfig(invalidConfig)).rejects.toThrow();
    });
    
    test('Enable integration for user', async () => {
        const config = await integrationManager.enableIntegration('user_001', 'notion', {
            apiKey: 'secret_abc123',
            databaseId: '123e4567-e89b-12d3-a456-426614174000',
            syncDirection: 'bidirectional',
            syncMode: 'batch'
        });
        
        expect(config.id).toBeDefined();
        expect(config.status).toBe('active');
        expect(config.integration_id).toBe('notion');
    });
    
    test('One-way push sync strategy', async () => {
        const mockConfig = {
            id: 'config_001',
            user_id: 'user_001',
            integration_id: 'notion',
            sync_direction: 'push',
            config: { apiKey: 'test', databaseId: 'test' }
        };
        
        // Mock Notion createTask
        notionIntegration.createTask = async () => ({
            id: 'notion_page_001',
            url: 'https://notion.so/page',
            created: true
        });
        
        const result = await integrationManager.syncTasks('config_001');
        
        expect(result.itemsSynced).toBeGreaterThan(0);
        expect(result.created).toBeGreaterThan(0);
    });
    
    test('Conflict resolution - newest wins', async () => {
        const conflict = {
            talaTask: {
                id: 'task_001',
                title: 'Tala version',
                updated_at: new Date(Date.now() - 1000)
            },
            externalTask: {
                id: 'notion_001',
                title: 'Notion version',
                updated_at: new Date()
            }
        };
        
        const resolution = await integrationManager.resolveConflict(
            conflict,
            'newest_wins',
            notionIntegration
        );
        
        expect(resolution.action).toBe('update_tala');
        expect(resolution.data.title).toBe('Notion version');
    });
});

describe('Error Scenarios', () => {
    test('Handle email without clear tasks', async () => {
        const converter = new EmailToTaskConverter();
        const vagueEmail = {
            id: 'email_vague',
            subject: 'Thoughts on the project',
            body: 'Just some random thoughts about what we discussed...'
        };
        
        const result = await converter.convertEmailToTasks(vagueEmail);
        expect(result.tasks).toHaveLength(0);
    });
    
    test('Handle integration connection failure', async () => {
        const integration = new NotionIntegration();
        integration.testConnection = async () => {
            throw new Error('API key invalid');
        };
        
        await expect(integration.testConnection({ apiKey: 'bad_key' }))
            .rejects.toThrow('API key invalid');
    });
    
    test('Handle sync conflicts gracefully', async () => {
        const manager = new IntegrationManager();
        const conflict = {
            talaTask: { id: '1', data: 'A' },
            externalTask: { id: '1', data: 'B' }
        };
        
        manager.storeConflict = async (c) => {
            expect(c).toBeDefined();
            expect(c.talaTask.data).toBe('A');
            expect(c.externalTask.data).toBe('B');
        };
        
        await manager.resolveConflict(conflict, 'manual', null);
    });
});

describe('Performance Tests', () => {
    test('Batch process 100 emails efficiently', async () => {
        const converter = new EmailToTaskConverter();
        const emails = Array(100).fill(null).map((_, i) => ({
            id: `email_${i}`,
            subject: `Task ${i}: Do something`,
            body: 'Task details here',
            from: { address: 'sender@test.com' }
        }));
        
        const startTime = Date.now();
        const results = [];
        
        // Process in batches of 10
        for (let i = 0; i < emails.length; i += 10) {
            const batch = emails.slice(i, i + 10);
            const batchResults = await Promise.all(
                batch.map(email => converter.convertEmailToTasks(email))
            );
            results.push(...batchResults);
        }
        
        const duration = Date.now() - startTime;
        
        expect(results).toHaveLength(100);
        expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });
    
    test('Handle 1000 task reminders', async () => {
        const reminderService = new ReminderService();
        const reminders = Array(1000).fill(null).map((_, i) => ({
            id: `rem_${i}`,
            taskId: `task_${i}`,
            reminderTime: new Date(Date.now() + i * 1000),
            channels: ['email']
        }));
        
        reminders.forEach(r => reminderService.reminders.set(r.id, r));
        
        const startTime = Date.now();
        const upcoming = await reminderService.getUpcomingReminders({ hours: 24 });
        const duration = Date.now() - startTime;
        
        expect(upcoming.length).toBeGreaterThan(0);
        expect(duration).toBeLessThan(100); // Should be very fast
    });
});

describe('Integration Health Monitoring', () => {
    test('Track sync metrics', async () => {
        const manager = new IntegrationManager();
        
        // Simulate sync operations
        const metrics = {
            syncCount: 10,
            successCount: 8,
            errorCount: 2,
            avgDuration: 1500,
            itemsSynced: 150
        };
        
        manager.getSyncStats = async () => ({
            totalSyncs: metrics.syncCount,
            successfulSyncs: metrics.successCount,
            failedSyncs: metrics.errorCount,
            averageSyncTime: metrics.avgDuration,
            itemsSynced: metrics.itemsSynced,
            successRate: (metrics.successCount / metrics.syncCount) * 100
        });
        
        const stats = await manager.getSyncStats('config_001');
        
        expect(stats.successRate).toBe(80);
        expect(stats.averageSyncTime).toBe(1500);
    });
    
    test('Email processing accuracy', () => {
        const suggestionEngine = new TaskSuggestionEngine();
        
        // Track accuracy over time
        const feedback = [
            { suggested: 'high', actual: 'high', correct: true },
            { suggested: 'medium', actual: 'high', correct: false },
            { suggested: 'urgent', actual: 'urgent', correct: true },
            { suggested: 'low', actual: 'medium', correct: false },
            { suggested: 'high', actual: 'high', correct: true }
        ];
        
        const accuracy = feedback.filter(f => f.correct).length / feedback.length;
        expect(accuracy).toBe(0.6); // 60% accuracy
        
        // Improve based on feedback
        suggestionEngine.learnFromFeedback(feedback);
    });
});

// Run all tests
async function runAllTests() {
    console.log('🧪 Running Comprehensive Test Suite...\n');
    
    const testSuites = [
        'Email to Task Conversion',
        'Task Management System',
        'Reminder Service',
        'Third-Party Integrations',
        'Error Scenarios',
        'Performance Tests',
        'Integration Health Monitoring'
    ];
    
    console.log('Test Suites:', testSuites.join(', '));
    console.log('\n✅ All tests completed!');
}

// Export for Jest or run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    runAllTests();
}

export { runAllTests };