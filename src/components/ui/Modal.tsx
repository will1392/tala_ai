import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className,
  size = 'md' 
}: ModalProps) => {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
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
            <div className={cn(
              "bg-gray-900 rounded-2xl p-6",
              "border border-gray-700",
              "shadow-2xl",
              "w-full my-auto",
              sizeClasses[size],
              className
            )}>
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">{title}</h2>
                  <button
                    onClick={onClose}
                    className="bg-gray-800 rounded-lg p-2 hover:bg-gray-700 transition-colors text-white"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
              
              {/* Content */}
              <div className="text-white">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};