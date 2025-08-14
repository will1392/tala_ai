/**
 * Tabs Component
 * Consistent tabbed interface component
 */

import React, { createContext, useContext, useState } from 'react';
import { motion } from 'framer-motion';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  children,
  className = ''
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({
  children,
  className = ''
}) => {
  return (
    <div
      className={`
        inline-flex h-10 items-center justify-center rounded-lg
        bg-gray-100 dark:bg-gray-800 p-1
        ${className}
      `}
      role="tablist"
    >
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  disabled = false,
  className = ''
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs');
  }

  const { value: selectedValue, onValueChange } = context;
  const isSelected = value === selectedValue;

  return (
    <button
      role="tab"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      className={`
        relative inline-flex items-center justify-center
        whitespace-nowrap rounded-md px-3 py-1.5
        text-sm font-medium ring-offset-background
        transition-all focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-ring
        focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
        ${isSelected && !className.includes('text-')
          ? 'bg-white dark:bg-gray-900 text-foreground shadow-sm'
          : !className.includes('text-') 
            ? 'text-muted-foreground hover:text-foreground'
            : ''
        }
        ${isSelected ? 'bg-white dark:bg-gray-900 shadow-sm' : ''}
        ${className}
      `}
    >
      {children}
      {isSelected && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 bg-white dark:bg-gray-900 rounded-md shadow-sm -z-10"
          transition={{ type: "spring", duration: 0.3 }}
        />
      )}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className = ''
}) => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be used within Tabs');
  }

  const { value: selectedValue } = context;
  
  if (value !== selectedValue) {
    return null;
  }

  return (
    <motion.div
      role="tabpanel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};