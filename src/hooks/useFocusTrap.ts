import { useEffect, useRef } from 'react';

/**
 * Hook to trap focus within a container element
 * Useful for modals, dialogs, and dropdowns
 */
export function useFocusTrap(isActive: boolean = false) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      const elements = container.querySelectorAll(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      return Array.from(elements) as HTMLElement[];
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      setTimeout(() => {
        focusableElements[0].focus();
      }, 0);
    }

    // Handle tab key press
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

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('keydown', handleEscape);

    // Cleanup
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('keydown', handleEscape);
      
      // Restore focus to the previously focused element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook to manage focus return after a component unmounts
 */
export function useFocusReturn() {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Store the currently focused element on mount
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Restore focus on unmount
    return () => {
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        setTimeout(() => {
          previousActiveElement.current?.focus();
        }, 0);
      }
    };
  }, []);
}