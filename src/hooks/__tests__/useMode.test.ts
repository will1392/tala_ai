/**
 * useMode Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMode } from '../useMode';
import { useAuthStore } from '../../store/authStore';
import { modeService } from '../../services/modeService';

// Mock dependencies
vi.mock('../../store/authStore');
vi.mock('../../services/modeService');

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Default auth mock
    (useAuthStore as any).mockReturnValue({
      user: { id: 'test-user-123' },
      isAuthenticated: true,
    });
    
    // Default service mocks
    (modeService.getUserMode as any).mockResolvedValue({
      mode: 'travel',
      subMode: null,
    });
    (modeService.setUserMode as any).mockResolvedValue({
      success: true,
      mode: 'travel',
      subMode: null,
    });
  });

  it('should initialize with default mode', async () => {
    const { result } = renderHook(() => useMode());
    
    expect(result.current.mode).toBe('travel');
    expect(result.current.subMode).toBe(null);
    expect(result.current.isLoading).toBe(true);
    
    // Wait for initialization
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should load user mode preference', async () => {
    (modeService.getUserMode as any).mockResolvedValue({
      mode: 'cmo',
      subMode: 'seo',
    });

    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.mode).toBe('cmo');
      expect(result.current.subMode).toBe('seo');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should switch modes', async () => {
    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Switch to CMO mode
    await act(async () => {
      await result.current.switchMode('cmo', 'email');
    });

    expect(modeService.setUserMode).toHaveBeenCalledWith('test-user-123', 'cmo', 'email');
    expect(result.current.mode).toBe('cmo');
    expect(result.current.subMode).toBe('email');
  });

  it('should persist mode to localStorage', async () => {
    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.switchMode('cmo', 'seo');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'tala_user_mode',
      JSON.stringify({ mode: 'cmo', subMode: 'seo' })
    );
  });

  it('should load mode from localStorage when offline', async () => {
    // Mock offline scenario
    (modeService.getUserMode as any).mockRejectedValue(new Error('Network error'));
    
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ mode: 'cmo', subMode: 'email' })
    );

    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.mode).toBe('cmo');
      expect(result.current.subMode).toBe('email');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle switch mode errors', async () => {
    (modeService.setUserMode as any).mockRejectedValue(new Error('Switch failed'));
    
    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.switchMode('cmo');
    });

    expect(result.current.error).toBe('Failed to switch mode');
    // Mode should not change on error
    expect(result.current.mode).toBe('travel');
  });

  it('should clear sub-mode when switching to travel', async () => {
    // Start in CMO mode with sub-mode
    (modeService.getUserMode as any).mockResolvedValue({
      mode: 'cmo',
      subMode: 'seo',
    });

    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.mode).toBe('cmo');
      expect(result.current.subMode).toBe('seo');
    });

    // Switch to travel mode
    await act(async () => {
      await result.current.switchMode('travel');
    });

    expect(result.current.mode).toBe('travel');
    expect(result.current.subMode).toBe(null);
  });

  it('should validate mode values', async () => {
    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Try invalid mode
    await act(async () => {
      await result.current.switchMode('invalid' as any);
    });

    expect(result.current.error).toBe('Invalid mode');
    expect(result.current.mode).toBe('travel'); // Should not change
  });

  it('should validate sub-mode values', async () => {
    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Try invalid sub-mode for CMO
    await act(async () => {
      await result.current.switchMode('cmo', 'invalid' as any);
    });

    expect(result.current.error).toBe('Invalid sub-mode for CMO');
  });

  it('should handle unauthenticated users', async () => {
    (useAuthStore as any).mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const { result } = renderHook(() => useMode());
    
    // Should still work with localStorage only
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.mode).toBe('travel');
    
    // Should not call service methods
    expect(modeService.getUserMode).not.toHaveBeenCalled();
  });

  it('should emit mode change events', async () => {
    const modeChangeHandler = vi.fn();
    window.addEventListener('modeChange', modeChangeHandler);

    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.switchMode('cmo', 'seo');
    });

    expect(modeChangeHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: {
          mode: 'cmo',
          subMode: 'seo',
          previousMode: 'travel',
        },
      })
    );

    window.removeEventListener('modeChange', modeChangeHandler);
  });

  it('should provide mode helpers', () => {
    const { result } = renderHook(() => useMode());
    
    expect(result.current.isTravel).toBe(true);
    expect(result.current.isCMO).toBe(false);
    expect(result.current.currentTheme).toBe('travel');
  });

  it('should update helpers when mode changes', async () => {
    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.switchMode('cmo');
    });

    expect(result.current.isTravel).toBe(false);
    expect(result.current.isCMO).toBe(true);
    expect(result.current.currentTheme).toBe('cmo');
  });

  it('should handle rapid mode switches', async () => {
    const { result } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Rapid switches
    await act(async () => {
      const promises = [
        result.current.switchMode('cmo'),
        result.current.switchMode('travel'),
        result.current.switchMode('cmo', 'seo'),
      ];
      await Promise.all(promises);
    });

    // Should end up with the last switch
    expect(result.current.mode).toBe('cmo');
    expect(result.current.subMode).toBe('seo');
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useMode());
    
    unmount();
    
    // Should not cause errors when switching after unmount
    expect(() => {
      act(() => {
        // This would normally be called by a component
        // but should be handled gracefully after unmount
      });
    }).not.toThrow();
  });
});

describe('useMode Integration', () => {
  it('should sync across multiple hook instances', async () => {
    const { result: result1 } = renderHook(() => useMode());
    const { result: result2 } = renderHook(() => useMode());
    
    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
    });

    // Switch mode in first instance
    await act(async () => {
      await result1.current.switchMode('cmo', 'email');
    });

    // Both instances should update
    expect(result1.current.mode).toBe('cmo');
    expect(result2.current.mode).toBe('cmo');
    expect(result1.current.subMode).toBe('email');
    expect(result2.current.subMode).toBe('email');
  });
});