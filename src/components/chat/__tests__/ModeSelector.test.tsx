/**
 * ModeSelector Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModeSelector } from '../ModeSelector';
import { useMode } from '../../../hooks/useMode';

// Mock the useMode hook
vi.mock('../../../hooks/useMode');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ModeSelector', () => {
  const mockSwitchMode = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useMode as any).mockReturnValue({
      mode: 'travel',
      subMode: null,
      switchMode: mockSwitchMode,
      isLoading: false,
      error: null,
    });
  });

  it('should render correctly in travel mode', () => {
    render(<ModeSelector />);
    
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByTestId('mode-toggle')).toBeInTheDocument();
    
    // Should show travel icon
    const icon = screen.getByTestId('mode-icon');
    expect(icon.className).toContain('text-blue-600');
  });

  it('should render correctly in CMO mode', () => {
    (useMode as any).mockReturnValue({
      mode: 'cmo',
      subMode: 'seo',
      switchMode: mockSwitchMode,
      isLoading: false,
      error: null,
    });

    render(<ModeSelector />);
    
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.getByText('SEO')).toBeInTheDocument();
    
    // Should show marketing icon
    const icon = screen.getByTestId('mode-icon');
    expect(icon.className).toContain('text-purple-600');
  });

  it('should toggle between modes', async () => {
    render(<ModeSelector />);
    
    const toggle = screen.getByTestId('mode-toggle');
    fireEvent.click(toggle);
    
    await waitFor(() => {
      expect(mockSwitchMode).toHaveBeenCalledWith('cmo');
    });
  });

  it('should show sub-mode dropdown in CMO mode', () => {
    (useMode as any).mockReturnValue({
      mode: 'cmo',
      subMode: 'email',
      switchMode: mockSwitchMode,
      isLoading: false,
      error: null,
    });

    render(<ModeSelector />);
    
    const dropdown = screen.getByTestId('submode-dropdown');
    expect(dropdown).toBeInTheDocument();
    
    // Click dropdown
    fireEvent.click(dropdown);
    
    // Should show all sub-modes
    expect(screen.getByText('SEO')).toBeInTheDocument();
    expect(screen.getByText('Email Marketing')).toBeInTheDocument();
    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Paid Ads')).toBeInTheDocument();
    expect(screen.getByText('Direct Mail')).toBeInTheDocument();
  });

  it('should switch sub-modes', async () => {
    (useMode as any).mockReturnValue({
      mode: 'cmo',
      subMode: 'email',
      switchMode: mockSwitchMode,
      isLoading: false,
      error: null,
    });

    render(<ModeSelector />);
    
    // Open dropdown
    const dropdown = screen.getByTestId('submode-dropdown');
    fireEvent.click(dropdown);
    
    // Click on SEO option
    const seoOption = screen.getByText('SEO');
    fireEvent.click(seoOption);
    
    await waitFor(() => {
      expect(mockSwitchMode).toHaveBeenCalledWith('cmo', 'seo');
    });
  });

  it('should show loading state', () => {
    (useMode as any).mockReturnValue({
      mode: 'travel',
      subMode: null,
      switchMode: mockSwitchMode,
      isLoading: true,
      error: null,
    });

    render(<ModeSelector />);
    
    const toggle = screen.getByTestId('mode-toggle');
    expect(toggle).toHaveAttribute('disabled');
    expect(toggle.className).toContain('opacity-50');
  });

  it('should show error state', () => {
    (useMode as any).mockReturnValue({
      mode: 'travel',
      subMode: null,
      switchMode: mockSwitchMode,
      isLoading: false,
      error: 'Failed to switch mode',
    });

    render(<ModeSelector />);
    
    expect(screen.getByText('Failed to switch mode')).toBeInTheDocument();
    expect(screen.getByTestId('error-message')).toHaveClass('text-red-500');
  });

  it('should apply correct theme classes', () => {
    // Test travel mode theme
    const { rerender } = render(<ModeSelector />);
    let container = screen.getByTestId('mode-selector-container');
    expect(container.className).toContain('bg-white');
    
    // Test CMO mode theme
    (useMode as any).mockReturnValue({
      mode: 'cmo',
      subMode: 'seo',
      switchMode: mockSwitchMode,
      isLoading: false,
      error: null,
    });
    
    rerender(<ModeSelector />);
    container = screen.getByTestId('mode-selector-container');
    expect(container.className).toContain('bg-purple-50');
  });

  it('should handle keyboard navigation', async () => {
    (useMode as any).mockReturnValue({
      mode: 'cmo',
      subMode: 'email',
      switchMode: mockSwitchMode,
      isLoading: false,
      error: null,
    });

    render(<ModeSelector />);
    
    const dropdown = screen.getByTestId('submode-dropdown');
    
    // Focus dropdown and press Enter
    dropdown.focus();
    fireEvent.keyDown(dropdown, { key: 'Enter', code: 'Enter' });
    
    // Dropdown should be open
    expect(screen.getByText('SEO')).toBeInTheDocument();
    
    // Press Escape to close
    fireEvent.keyDown(dropdown, { key: 'Escape', code: 'Escape' });
    
    // Dropdown should be closed
    await waitFor(() => {
      expect(screen.queryByText('SEO')).not.toBeInTheDocument();
    });
  });

  it('should show mode descriptions on hover', async () => {
    render(<ModeSelector />);
    
    const toggle = screen.getByTestId('mode-toggle');
    
    // Hover over toggle
    fireEvent.mouseEnter(toggle);
    
    await waitFor(() => {
      expect(screen.getByText(/Discover destinations/)).toBeInTheDocument();
    });
    
    // Mouse leave
    fireEvent.mouseLeave(toggle);
    
    await waitFor(() => {
      expect(screen.queryByText(/Discover destinations/)).not.toBeInTheDocument();
    });
  });
});

describe('ModeSelector Accessibility', () => {
  const mockSwitchMode = vi.fn();
  
  beforeEach(() => {
    (useMode as any).mockReturnValue({
      mode: 'travel',
      subMode: null,
      switchMode: mockSwitchMode,
      isLoading: false,
      error: null,
    });
  });

  it('should have proper ARIA labels', () => {
    render(<ModeSelector />);
    
    const toggle = screen.getByTestId('mode-toggle');
    expect(toggle).toHaveAttribute('aria-label', 'Switch between Travel and Marketing modes');
    expect(toggle).toHaveAttribute('role', 'switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('should update ARIA states', () => {
    (useMode as any).mockReturnValue({
      mode: 'cmo',
      subMode: 'seo',
      switchMode: mockSwitchMode,
      isLoading: false,
      error: null,
    });

    render(<ModeSelector />);
    
    const toggle = screen.getByTestId('mode-toggle');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('should support screen readers', () => {
    render(<ModeSelector />);
    
    // Check for screen reader only text
    expect(screen.getByText('Current mode:')).toHaveClass('sr-only');
    expect(screen.getByText('Travel mode active')).toHaveClass('sr-only');
  });
});