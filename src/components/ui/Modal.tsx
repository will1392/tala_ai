import React from 'react';
import { useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useFocusTrap, useEscapeKey } from '../../utils/accessibility';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  description?: string;
}

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className,
  size = 'md',
  showCloseButton = true,
  description
}: ModalProps) => {
  const focusTrapRef = useFocusTrap(isOpen);
  const titleId = useId();
  const descriptionId = useId();
  
  // Use custom escape key hook
  useEscapeKey(onClose, isOpen);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Announce modal opening to screen readers
      const announcement = document.getElementById('announcements');
      if (announcement) {
        announcement.textContent = `${title || 'Modal'} dialog opened`;
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, title]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw] w-full'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
            aria-label="Close modal overlay"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={cn(
              "fixed inset-0 z-50 flex items-center justify-center p-4",
              "overflow-y-auto"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              ref={focusTrapRef}
              className={cn(
                "bg-[var(--panel)] rounded-xl p-6",
                "border border-[var(--border)]",
                "shadow-2xl",
                "w-full my-auto",
                "min-h-[44px]",
                sizeClasses[size],
                className
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              aria-describedby={description ? descriptionId : undefined}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="flex items-center justify-between mb-4">
                  {title && (
                    <h2 id={titleId} className="text-xl font-semibold text-[var(--fg)]">{title}</h2>
                  )}
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="ml-auto bg-[var(--muted)] rounded-xl p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-[var(--muted)]/80 transition-colors text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      aria-label={`Close ${title || 'modal'} dialog`}
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
              
              {/* Hidden description for screen readers */}
              {description && (
                <p id={descriptionId} className="sr-only">{description}</p>
              )}
              
              {/* Content */}
              <div className="text-[var(--fg)]">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};