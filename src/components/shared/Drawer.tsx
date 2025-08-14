import React, { useEffect } from "react";
import { X } from "lucide-react";
import { useFocusTrap, useEscapeKey } from "../../utils/accessibility";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: "left" | "right";
  title?: string;
  description?: string;
}

export default function Drawer({
  open, 
  onClose, 
  children, 
  side = "left",
  title = "Navigation menu",
  description,
}: DrawerProps) {
  const focusTrapRef = useFocusTrap(open);
  
  // Handle escape key
  useEscapeKey(onClose, open);
  
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  
  // Don't render if not open (better for screen readers)
  if (!open) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50"
      role="presentation"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 opacity-100"
        onClick={onClose}
        aria-label="Close drawer overlay"
      />
      
      {/* Panel */}
      <div
        ref={focusTrapRef}
        className={`absolute top-0 ${side === "left" ? "left-0" : "right-0"} h-full w-[84vw] max-w-[360px]
                    bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 ${
                      side === "left" ? "border-r" : "border-l"
                    } shadow-xl
                    transition-transform duration-300 translate-x-0`}
        role="dialog" 
        aria-modal="true"
        aria-label={title}
        aria-describedby={description ? "drawer-description" : undefined}
      >
        {/* Visually hidden title for screen readers */}
        <h2 className="sr-only">{title}</h2>
        {description && (
          <p id="drawer-description" className="sr-only">{description}</p>
        )}
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Close navigation menu"
        >
          <X size={20} aria-hidden="true" />
        </button>
        
        {/* Content */}
        <nav className="h-full overflow-y-auto" role="navigation" aria-label="Main navigation">
          {children}
        </nav>
      </div>
    </div>
  );
}