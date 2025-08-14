import React, { useEffect, useRef } from 'react';
import { srOnly } from '../../utils/accessibility';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
  className?: string;
}

/**
 * Live region component for screen reader announcements
 * Updates screen readers about dynamic content changes
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  message, 
  priority = 'polite',
  clearAfter = 1000,
  className = ''
}) => {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && regionRef.current) {
      // Clear after specified time to allow for multiple announcements
      const timer = setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = '';
        }
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      ref={regionRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className={`${srOnly} ${className}`}
    >
      {message}
    </div>
  );
};

/**
 * Global live region manager
 * Manages application-wide screen reader announcements
 */
export const LiveRegionManager: React.FC = () => {
  return (
    <>
      <div
        id="live-region-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={srOnly}
      />
      <div
        id="live-region-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={srOnly}
      />
    </>
  );
};

/**
 * Hook to announce messages to screen readers
 */
export const useAnnounce = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const regionId = priority === 'assertive' ? 'live-region-assertive' : 'live-region-polite';
    const region = document.getElementById(regionId);
    
    if (region) {
      // Clear and re-announce to ensure the message is read
      region.textContent = '';
      setTimeout(() => {
        region.textContent = message;
        // Clear after announcement
        setTimeout(() => {
          region.textContent = '';
        }, 1000);
      }, 100);
    }
  };

  return announce;
};