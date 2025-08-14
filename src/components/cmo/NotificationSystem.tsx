import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, XCircle, AlertCircle, Info, X, 
  Trophy, Zap, Target, TrendingUp, Gift
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'achievement';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Notification container
const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual notification item
const NotificationItem: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
    achievement: Trophy
  };

  const colors = {
    success: 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800',
    warning: 'bg-orange-50 dark:bg-orange-900 border-orange-200 dark:border-orange-800',
    info: 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800',
    achievement: 'bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-800'
  };

  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-orange-600',
    info: 'text-blue-600',
    achievement: 'text-purple-600'
  };

  const Icon = notification.icon || icons[notification.type];
  
  // Safely render the icon
  const renderIcon = () => {
    if (!Icon) return null;
    
    // If it's a function component, render it as JSX
    if (typeof Icon === 'function') {
      return <Icon className="w-5 h-5" />;
    }
    
    // If it's already a React element, render it directly
    if (React.isValidElement(Icon)) {
      return Icon;
    }
    
    // If it's a string (emoji), render it in a span
    if (typeof Icon === 'string') {
      return <span className="text-xl">{Icon}</span>;
    }
    
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      className={cn(
        "relative p-4 rounded-lg border shadow-lg",
        colors[notification.type]
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex-shrink-0", iconColors[notification.type])}>
          {renderIcon()}
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {notification.title}
          </h4>
          {notification.message && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {notification.message}
            </p>
          )}
          {notification.action && (
            <button
              onClick={notification.action.onClick}
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              {notification.action.label}
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Progress bar for auto-dismiss */}
      {notification.duration && notification.duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-current opacity-20"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: notification.duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
};

// Tool tips component
interface ToolTipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactNode;
}

export const CMOToolTip: React.FC<ToolTipProps> = ({
  content,
  position = 'top',
  delay = 500,
  children
}) => {
  const [show, setShow] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const timeout = setTimeout(() => setShow(true), delay);
    setTimer(timeout);
  };

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer);
    setShow(false);
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block">
      <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </div>
      
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "absolute z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg whitespace-nowrap",
              positions[position]
            )}
          >
            {content}
            <div
              className={cn(
                "absolute w-2 h-2 bg-gray-800 rotate-45",
                position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
                position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
                position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
                'right-full top-1/2 -translate-y-1/2 -mr-1'
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Progress indicator component
interface ProgressIndicatorProps {
  value: number;
  max?: number;
  label?: string;
  variant?: 'linear' | 'circular' | 'steps';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const CMOProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  label,
  variant = 'linear',
  size = 'md',
  animated = true
}) => {
  const percentage = (value / max) * 100;

  if (variant === 'linear') {
    return (
      <div className="w-full">
        {label && (
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
            <span className="text-sm text-gray-500">
              {percentage.toFixed(0)}%
            </span>
          </div>
        )}
        <div className={cn(
          "w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
          size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4'
        )}>
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-purple-600 rounded-full"
            initial={animated ? { width: 0 } : { width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'circular') {
    const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
    const radius = size === 'sm' ? 30 : size === 'md' ? 40 : 50;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg
          className={cn(
            size === 'sm' ? 'w-20 h-20' : size === 'md' ? 'w-28 h-28' : 'w-36 h-36'
          )}
        >
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          <motion.circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="url(#gradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : { strokeDashoffset }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute text-center">
          <span className={cn(
            "font-bold",
            size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl'
          )}>
            {percentage.toFixed(0)}%
          </span>
          {label && (
            <span className="block text-xs text-gray-500">{label}</span>
          )}
        </div>
      </div>
    );
  }

  // Steps variant
  const steps = max;
  return (
    <div className="w-full">
      {label && (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </p>
      )}
      <div className="flex gap-2">
        {Array.from({ length: steps }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              "flex-1 rounded-full",
              size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4'
            )}
            initial={animated ? { backgroundColor: '#e5e7eb' } : {}}
            animate={{
              backgroundColor: index < value ? '#6366f1' : '#e5e7eb'
            }}
            transition={{ delay: animated ? index * 0.1 : 0 }}
          />
        ))}
      </div>
    </div>
  );
};

// Success animation component
export const SuccessAnimation: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-full p-8 shadow-2xl"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <CheckCircle className="w-24 h-24 text-green-500" />
        </motion.div>
      </motion.div>

      {/* Confetti effect */}
      <ConfettiEffect />
    </motion.div>
  );
};

// Confetti effect
const ConfettiEffect: React.FC = () => {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
  const particles = Array.from({ length: 50 });

  return (
    <>
      {particles.map((_, index) => (
        <motion.div
          key={index}
          className="absolute w-3 h-3 rounded-full"
          style={{
            backgroundColor: colors[index % colors.length],
            left: '50%',
            top: '50%'
          }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: (Math.random() - 0.5) * 400,
            y: (Math.random() - 0.5) * 400,
            opacity: 0
          }}
          transition={{
            duration: 1,
            delay: Math.random() * 0.3,
            ease: 'easeOut'
          }}
        />
      ))}
    </>
  );
};

// Remove default export - we're using named exports