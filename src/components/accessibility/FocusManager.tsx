import React, { useEffect, useRef } from 'react';

interface FocusManagerProps {
  children: React.ReactNode;
  restoreFocus?: boolean;
  autoFocus?: boolean;
  containFocus?: boolean;
}

/**
 * Focus management component
 * Handles focus restoration, auto-focus, and focus containment
 */
export const FocusManager: React.FC<FocusManagerProps> = ({
  children,
  restoreFocus = true,
  autoFocus = false,
  containFocus = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Store the previously focused element
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Auto-focus first focusable element
    if (autoFocus && containerRef.current) {
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    // Cleanup: restore focus on unmount
    return () => {
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [restoreFocus, autoFocus]);

  useEffect(() => {
    if (!containFocus || !containerRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusableElements = getFocusableElements(containerRef.current);
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

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [containFocus]);

  return (
    <div ref={containerRef} className="focus-manager">
      {children}
    </div>
  );
};

/**
 * Get all focusable elements within a container
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
}

/**
 * Hook to manage focus programmatically
 */
export const useFocusManager = () => {
  const focusFirst = (container: HTMLElement) => {
    const elements = getFocusableElements(container);
    if (elements.length > 0) {
      elements[0].focus();
    }
  };

  const focusLast = (container: HTMLElement) => {
    const elements = getFocusableElements(container);
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
    }
  };

  const focusNext = () => {
    const focusableElements = getFocusableElements(document.body);
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    
    if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
    }
  };

  const focusPrevious = () => {
    const focusableElements = getFocusableElements(document.body);
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement);
    
    if (currentIndex > 0) {
      focusableElements[currentIndex - 1].focus();
    }
  };

  return {
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    getFocusableElements
  };
};