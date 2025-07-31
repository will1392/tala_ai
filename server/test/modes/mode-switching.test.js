/**
 * Mode Switching Tests
 * 
 * Tests mode detection, switching, and persistence
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { modeManager } from '../../services/modes/ModeManager.js';
import { modeContext } from '../../services/modes/ModeContext.js';
import { getSupabaseService } from '../../services/db/sharedDatabase.js';

// Mock Supabase
jest.mock('../../services/db/sharedDatabase.js', () => ({
  getSupabaseService: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { mode: 'travel', sub_mode: null, mode_context: {} },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({
                data: { mode: 'cmo', sub_mode: 'seo' },
                error: null
              }))
            }))
          }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ error: null })),
      upsert: jest.fn(() => Promise.resolve({ error: null }))
    }))
  }))
}));

describe('Mode Manager', () => {
  beforeEach(() => {
    // Clear any cached data
    modeManager.userPreferencesCache.clear();
  });

  describe('Mode Detection', () => {
    it('should detect travel mode from keywords', () => {
      const testCases = [
        { message: 'Book a flight to Paris', expected: 'travel' },
        { message: 'Find hotels in Tokyo', expected: 'travel' },
        { message: 'What visa do I need for Brazil?', expected: 'travel' },
        { message: 'Best restaurants in Rome', expected: 'travel' }
      ];

      testCases.forEach(({ message, expected }) => {
        const result = modeManager.detectMode(message);
        expect(result.mode).toBe(expected);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('should detect CMO mode from marketing keywords', () => {
      const testCases = [
        { message: 'How to improve SEO rankings', expected: 'cmo', subMode: 'seo' },
        { message: 'Write an email subject line', expected: 'cmo', subMode: 'email' },
        { message: 'Best hashtags for Instagram', expected: 'cmo', subMode: 'social' },
        { message: 'Google Ads optimization tips', expected: 'cmo', subMode: 'ads' }
      ];

      testCases.forEach(({ message, expected, subMode }) => {
        const result = modeManager.detectMode(message);
        expect(result.mode).toBe(expected);
        if (subMode) {
          expect(result.subMode).toBe(subMode);
        }
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('should detect explicit mode switches', () => {
      const result1 = modeManager.detectMode('Switch to marketing mode');
      expect(result1.mode).toBe('cmo');
      expect(result1.explicit).toBe(true);
      expect(result1.confidence).toBe(1.0);

      const result2 = modeManager.detectMode('Switch to travel mode');
      expect(result2.mode).toBe('travel');
      expect(result2.explicit).toBe(true);
    });

    it('should consider current context in detection', () => {
      const currentContext = { mode: 'cmo', subMode: 'seo' };
      const result = modeManager.detectMode('How do I improve this?', currentContext);
      
      // Should favor current mode when query is ambiguous
      expect(result.mode).toBe('cmo');
      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe('Mode Switching', () => {
    it('should switch modes successfully', async () => {
      const result = await modeManager.switchMode(
        'test-user',
        'test-conversation',
        'cmo',
        'seo'
      );

      expect(result.success).toBe(true);
      expect(result.newMode).toBe('cmo');
      expect(result.subMode).toBe('seo');
    });

    it('should reject invalid modes', async () => {
      const result = await modeManager.switchMode(
        'test-user',
        'test-conversation',
        'invalid-mode'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid mode');
    });

    it('should track mode switch history', async () => {
      const mockSupabase = getSupabaseService();
      const updateCall = mockSupabase.from().update;

      await modeManager.switchMode(
        'test-user',
        'test-conversation',
        'cmo',
        'email'
      );

      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'cmo',
          sub_mode: 'email',
          mode_context: expect.objectContaining({
            mode_history: expect.any(Array)
          })
        })
      );
    });
  });

  describe('User Preferences', () => {
    it('should save mode preferences', async () => {
      const result = await modeManager.saveModePreference('test-user', {
        default_mode: 'cmo',
        mode_settings: {
          preferred_sub_mode: 'seo',
          email_notifications: true
        }
      });

      expect(result.success).toBe(true);
      expect(result.preferences.default_mode).toBe('cmo');
    });

    it('should cache user preferences', async () => {
      await modeManager.saveModePreference('test-user', {
        default_mode: 'travel'
      });

      // Should retrieve from cache
      const cachedPref = modeManager.userPreferencesCache.get('test-user');
      expect(cachedPref.default_mode).toBe('travel');
    });

    it('should get user default mode', async () => {
      // First call hits database
      const mode1 = await modeManager.getUserDefaultMode('test-user');
      expect(mode1).toBe('travel'); // Default

      // Save preference
      await modeManager.saveModePreference('test-user', {
        default_mode: 'cmo'
      });

      // Should get from cache
      const mode2 = await modeManager.getUserDefaultMode('test-user');
      expect(mode2).toBe('cmo');
    });
  });

  describe('Mode Greetings', () => {
    it('should return appropriate greetings', () => {
      const travelGreeting = modeManager.getModeGreeting('travel');
      expect(travelGreeting).toMatch(/travel|adventure|explore|trip/i);

      const cmoGreeting = modeManager.getModeGreeting('cmo');
      expect(cmoGreeting).toMatch(/marketing|business|grow/i);

      const seoGreeting = modeManager.getModeGreeting('cmo', 'seo');
      expect(seoGreeting).toMatch(/seo|search|ranking|optimize/i);
    });
  });
});

describe('Mode Context', () => {
  beforeEach(() => {
    modeContext.contextCache.clear();
  });

  describe('Context Initialization', () => {
    it('should initialize context for new conversation', async () => {
      const context = await modeContext.initializeContext(
        'test-conversation',
        'travel',
        { destination: 'Paris' }
      );

      expect(context).toHaveProperty('destination', 'Paris');
      expect(context).toHaveProperty('travel_dates');
      expect(context).toHaveProperty('preferences');
    });

    it('should initialize CMO context with sub-contexts', async () => {
      const context = await modeContext.initializeContext(
        'test-conversation',
        'cmo',
        { business_info: { name: 'Test Corp' } }
      );

      expect(context).toHaveProperty('business_info.name', 'Test Corp');
      expect(context).toHaveProperty('sub_contexts.seo');
      expect(context).toHaveProperty('sub_contexts.email');
    });
  });

  describe('Context Updates', () => {
    it('should update context fields', async () => {
      await modeContext.initializeContext('test-conv', 'travel');
      
      const updated = await modeContext.updateContext('test-conv', {
        destination: 'Tokyo',
        budget: '$5000'
      });

      expect(updated.destination).toBe('Tokyo');
      expect(updated.budget).toBe('$5000');
      expect(updated._last_updated).toBeDefined();
    });

    it('should merge nested context properly', async () => {
      await modeContext.initializeContext('test-conv', 'cmo');
      
      const updated = await modeContext.updateContext('test-conv', {
        sub_contexts: {
          seo: {
            target_keywords: ['marketing', 'automation']
          }
        }
      });

      expect(updated.sub_contexts.seo.target_keywords).toEqual(['marketing', 'automation']);
      expect(updated.sub_contexts.email).toBeDefined(); // Should preserve other sub-contexts
    });
  });

  describe('Context Switching', () => {
    it('should switch context between modes', async () => {
      await modeContext.initializeContext('test-conv', 'travel', {
        destination: 'Paris'
      });

      const newContext = await modeContext.switchContext(
        'test-conv',
        'travel',
        'cmo',
        true // preserve common fields
      );

      expect(newContext._previous_mode).toBe('travel');
      expect(newContext._mode_switches).toHaveLength(1);
      expect(newContext.business_info).toBeDefined();
    });

    it('should preserve common fields when switching', async () => {
      await modeContext.initializeContext('test-conv', 'travel', {
        user_preferences: { language: 'en' },
        timezone: 'EST'
      });

      const newContext = await modeContext.switchContext(
        'test-conv',
        'travel',
        'cmo',
        true
      );

      expect(newContext.user_preferences.language).toBe('en');
      expect(newContext.timezone).toBe('EST');
    });
  });

  describe('Mode-Specific Data Storage', () => {
    it('should store travel mode data', async () => {
      await modeContext.initializeContext('test-conv', 'travel');
      
      const booking = { 
        type: 'flight',
        carrier: 'United',
        confirmation: 'ABC123'
      };

      const updated = await modeContext.storeModeData(
        'test-conv',
        'booking',
        booking
      );

      expect(updated.bookings).toHaveLength(1);
      expect(updated.bookings[0]).toEqual(booking);
    });

    it('should store CMO mode data', async () => {
      await modeContext.initializeContext('test-conv', 'cmo');
      
      const campaign = {
        name: 'Summer Sale',
        channel: 'email',
        status: 'active'
      };

      const updated = await modeContext.storeModeData(
        'test-conv',
        'campaign',
        campaign
      );

      expect(updated.active_campaigns).toHaveLength(1);
      expect(updated.active_campaigns[0]).toEqual(campaign);
    });
  });

  describe('Context Summary', () => {
    it('should generate travel context summary', async () => {
      await modeContext.initializeContext('test-conv', 'travel', {
        destination: 'Paris',
        bookings: [{ type: 'hotel' }, { type: 'flight' }]
      });

      const summary = await modeContext.getContextSummary('test-conv');
      
      expect(summary.mode).toBe('travel');
      expect(summary.travel.destination).toBe('Paris');
      expect(summary.travel.bookingsCount).toBe(2);
    });

    it('should generate CMO context summary', async () => {
      await modeContext.initializeContext('test-conv', 'cmo', {
        business_info: { name: 'Test Corp' },
        active_campaigns: [{ name: 'Campaign 1' }]
      });

      const summary = await modeContext.getContextSummary('test-conv');
      
      expect(summary.mode).toBe('cmo');
      expect(summary.cmo.businessName).toBe('Test Corp');
      expect(summary.cmo.activeCampaigns).toBe(1);
    });
  });
});

// Performance tests
describe('Mode Performance', () => {
  it('should detect mode quickly', () => {
    const start = Date.now();
    
    for (let i = 0; i < 100; i++) {
      modeManager.detectMode('How to improve my SEO rankings?');
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100); // Should process 100 detections in under 100ms
  });

  it('should cache context efficiently', async () => {
    const conversationId = 'perf-test';
    
    // First call initializes
    await modeContext.initializeContext(conversationId, 'travel');
    
    // Subsequent calls should use cache
    const start = Date.now();
    
    for (let i = 0; i < 100; i++) {
      await modeContext.getContext(conversationId);
    }
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50); // Cached calls should be very fast
  });
});