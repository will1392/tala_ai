import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface DropdownPortalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  className?: string;
}

export const DropdownPortal: React.FC<DropdownPortalProps> = ({
  isOpen,
  onClose,
  triggerRef,
  children,
  className = ''
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current!.getBoundingClientRect();
      const dropdownHeight = 320; // Max height from the original dropdown
      const dropdownWidth = 224; // w-56 = 14rem = 224px
      const padding = 8;

      let top = triggerRect.bottom + 8; // 8px gap
      let left = triggerRect.left;

      // Check if dropdown would go off the bottom of the screen
      if (top + dropdownHeight > window.innerHeight - padding) {
        // Position above the trigger instead
        top = triggerRect.top - dropdownHeight - 8;
      }

      // Check if dropdown would go off the right side of the screen
      if (left + dropdownWidth > window.innerWidth - padding) {
        // Align to the right edge of the trigger
        left = triggerRect.right - dropdownWidth;
      }

      // Ensure it doesn't go off the left side
      if (left < padding) {
        left = padding;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, triggerRef]);

  // Handle clicks outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // Use a slight delay to avoid immediate closure on open
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className={`fixed ${className}`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 9999
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};