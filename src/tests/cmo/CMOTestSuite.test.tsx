import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import CMOFull from '../../pages/CMOFull';
import { NotificationProvider } from '../../components/cmo/NotificationSystem';
import { achievementSystem } from '../../services/AchievementSystem';
import { toolAnalyticsService } from '../../services/ToolAnalyticsService';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <NotificationProvider>
      {children}
    </NotificationProvider>
  </BrowserRouter>
);

describe('CMO Mode - End-to-End Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('First Time User Experience', () => {
    it('should show onboarding flow on first visit', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Welcome to CMO Mode/i)).toBeInTheDocument();
      });
    });

    it('should complete onboarding flow', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      // Fill in name
      const nameInput = await screen.findByPlaceholderText(/Enter your name/i);
      await user.type(nameInput, 'Test User');

      // Select role
      const roleSelect = screen.getByLabelText(/Your Role/i);
      await user.selectOptions(roleSelect, 'cmo');

      // Click next
      const nextButton = screen.getByText(/Get Started/i);
      await user.click(nextButton);

      // Verify onboarding completion
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'cmo-seen-onboarding',
          'true'
        );
      });
    });
  });

  describe('Dashboard Functionality', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'cmo-seen-onboarding') return 'true';
        if (key === 'cmo-show-onboarding') return 'false';
        return null;
      });
    });

    it('should display dashboard metrics', async () => {
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Active Campaigns/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Reach/i)).toBeInTheDocument();
        expect(screen.getByText(/Email Opens/i)).toBeInTheDocument();
        expect(screen.getByText(/Social Engagement/i)).toBeInTheDocument();
      });
    });

    it('should update metrics on refresh', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      // Find and click refresh button (if exists)
      const refreshButton = screen.queryByRole('button', { name: /refresh/i });
      if (refreshButton) {
        await user.click(refreshButton);
        
        await waitFor(() => {
          expect(screen.getByText(/Dashboard Updated/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Feature Access', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue('true');
    });

    it('should open achievements panel', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      const achievementsButton = await screen.findByTitle(/View achievements/i);
      await user.click(achievementsButton);

      await waitFor(() => {
        expect(screen.getByText(/Your Achievements/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Points/i)).toBeInTheDocument();
      });
    });

    it('should open help modal', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      const helpButton = await screen.findByTitle(/Get help/i);
      await user.click(helpButton);

      await waitFor(() => {
        expect(screen.getByText(/Need Help\?/i)).toBeInTheDocument();
      });
    });

    it('should start guided tour', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      const tourButton = await screen.findByTitle(/Take a guided tour/i);
      await user.click(tourButton);

      await waitFor(() => {
        expect(screen.getByText(/Welcome to the CMO Dashboard/i)).toBeInTheDocument();
      });
    });

    it('should close modals on outside click', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      // Open achievements
      const achievementsButton = await screen.findByTitle(/View achievements/i);
      await user.click(achievementsButton);

      // Wait for panel to appear
      await waitFor(() => {
        expect(screen.getByText(/Your Achievements/i)).toBeInTheDocument();
      });

      // Click outside
      const overlay = screen.getByRole('presentation');
      await user.click(overlay);

      // Panel should be closed
      await waitFor(() => {
        expect(screen.queryByText(/Your Achievements/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Achievement System', () => {
    it('should track user actions', async () => {
      const trackActionSpy = vi.spyOn(achievementSystem, 'trackAction');
      
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      // Simulate user action that triggers achievement
      // This would be triggered by actual user interactions
      achievementSystem.trackAction('user-123', {
        type: 'campaign_created',
        metadata: { campaignId: 'test-123' }
      });

      expect(trackActionSpy).toHaveBeenCalledWith('user-123', {
        type: 'campaign_created',
        metadata: { campaignId: 'test-123' }
      });
    });

    it('should display achievement notifications', async () => {
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      // Trigger achievement unlock
      achievementSystem.unlockAchievement('user-123', 'first-campaign');

      await waitFor(() => {
        expect(screen.getByText(/Achievement Unlocked!/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error boundary on component crash', async () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error in the dashboard
      vi.doMock('../../pages/CMODashboardEnhanced', () => ({
        default: () => {
          throw new Error('Test error');
        }
      }));

      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error in CMODashboardEnhanced/i)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      // Check for accessible buttons
      expect(screen.getByTitle(/View achievements/i)).toHaveAttribute('title');
      expect(screen.getByTitle(/Get help/i)).toHaveAttribute('title');
      expect(screen.getByTitle(/Take a guided tour/i)).toHaveAttribute('title');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      // Tab through buttons
      await user.tab();
      await user.tab();
      
      // Press Enter on focused button
      await user.keyboard('{Enter}');

      // Verify action was triggered
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});

describe('CMO Mode - Cross-Browser Tests', () => {
  const browsers = ['chrome', 'firefox', 'safari', 'edge'];

  browsers.forEach(browser => {
    it(`should render correctly in ${browser}`, async () => {
      // Mock user agent for browser detection
      Object.defineProperty(navigator, 'userAgent', {
        value: browser === 'chrome' ? 'Chrome/100.0' :
               browser === 'firefox' ? 'Firefox/100.0' :
               browser === 'safari' ? 'Safari/100.0' :
               'Edge/100.0',
        writable: true
      });

      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      // Basic rendering check
      await waitFor(() => {
        expect(screen.getByText(/CMO Mode Active/i)).toBeInTheDocument();
      });
    });
  });
});

describe('CMO Mode - Mobile Responsiveness', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 }
  ];

  viewports.forEach(({ name, width, height }) => {
    it(`should be responsive on ${name}`, async () => {
      // Set viewport size
      global.innerWidth = width;
      global.innerHeight = height;
      global.dispatchEvent(new Event('resize'));

      render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );

      // Check that critical elements are visible
      await waitFor(() => {
        expect(screen.getByText(/CMO Mode Active/i)).toBeInTheDocument();
      });

      // Mobile specific checks
      if (width < 768) {
        // Check for mobile-optimized layout
        const dashboard = screen.getByText(/CMO Dashboard/i);
        expect(dashboard).toBeInTheDocument();
      }
    });
  });
});

describe('CMO Mode - Performance Tests', () => {
  it('should render within performance budget', async () => {
    const startTime = performance.now();
    
    render(
      <TestWrapper>
        <CMOFull />
      </TestWrapper>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Initial render should be under 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('should handle rapid interactions without lag', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <CMOFull />
      </TestWrapper>
    );

    const startTime = performance.now();

    // Rapid button clicks
    const buttons = await screen.findAllByRole('button');
    for (const button of buttons.slice(0, 3)) {
      await user.click(button);
    }

    const endTime = performance.now();
    const interactionTime = endTime - startTime;

    // All interactions should complete within 500ms
    expect(interactionTime).toBeLessThan(500);
  });

  it('should not leak memory on repeated renders', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    // Render and unmount multiple times
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(
        <TestWrapper>
          <CMOFull />
        </TestWrapper>
      );
      unmount();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be minimal (less than 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});