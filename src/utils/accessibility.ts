/**
 * Accessibility utility functions and hooks
 */

import { useEffect, useRef, MutableRefObject } from 'react';

/**
 * Custom hook to trap focus within an element
 * Useful for modals, drawers, and dialogs
 */
export const useFocusTrap = (isActive: boolean): MutableRefObject<HTMLDivElement | null> => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the previously focused element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
};

/**
 * Custom hook to handle escape key press
 */
export const useEscapeKey = (handler: () => void, isActive: boolean = true) => {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handler();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handler, isActive]);
};

/**
 * Custom hook to announce messages to screen readers
 */
export const useAnnouncement = () => {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) {
      // Create announcement element if it doesn't exist
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.setAttribute('role', 'status');
      announcer.className = 'sr-only';
      document.body.appendChild(announcer);
      announcementRef.current = announcer;
    }

    // Update the announcement
    announcementRef.current.setAttribute('aria-live', priority);
    announcementRef.current.textContent = message;

    // Clear after a delay to allow for multiple announcements
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (announcementRef.current && announcementRef.current.parentNode) {
        announcementRef.current.parentNode.removeChild(announcementRef.current);
      }
    };
  }, []);

  return announce;
};

/**
 * Get appropriate ARIA role based on notification kind
 */
export const getAriaRole = (kind: 'info' | 'success' | 'warning' | 'error'): string => {
  switch (kind) {
    case 'error':
      return 'alert';
    case 'warning':
      return 'alert';
    case 'success':
      return 'status';
    case 'info':
    default:
      return 'status';
  }
};

/**
 * Get appropriate ARIA live region based on notification kind
 */
export const getAriaLive = (kind: 'info' | 'success' | 'warning' | 'error'): 'polite' | 'assertive' => {
  switch (kind) {
    case 'error':
    case 'warning':
      return 'assertive';
    case 'success':
    case 'info':
    default:
      return 'polite';
  }
};

/**
 * Screen reader only class for visually hidden content
 */
export const srOnly = 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';