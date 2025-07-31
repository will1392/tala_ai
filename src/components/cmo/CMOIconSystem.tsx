import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

// Icon wrapper with CMO styling and animations
interface CMOIconProps {
  icon: LucideIcon;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  animated?: boolean;
  pulse?: boolean;
  rotate?: boolean;
  bounce?: boolean;
  className?: string;
}

export const CMOIcon: React.FC<CMOIconProps> = ({
  icon: Icon,
  size = 'md',
  variant = 'default',
  animated = false,
  pulse = false,
  rotate = false,
  bounce = false,
  className
}) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const variants = {
    default: 'text-gray-600 dark:text-gray-400',
    primary: 'text-primary',
    secondary: 'text-purple-600',
    success: 'text-green-600',
    warning: 'text-orange-600',
    error: 'text-red-600'
  };

  const animations = {
    pulse: pulse ? {
      scale: [1, 1.2, 1],
      opacity: [0.8, 1, 0.8]
    } : {},
    rotate: rotate ? {
      rotate: 360
    } : {},
    bounce: bounce ? {
      y: [0, -5, 0]
    } : {}
  };

  const activeAnimation = pulse ? animations.pulse : 
                         rotate ? animations.rotate : 
                         bounce ? animations.bounce : {};

  return (
    <motion.div
      className={cn(
        "inline-flex items-center justify-center",
        className
      )}
      animate={animated ? activeAnimation : {}}
      transition={animated ? {
        duration: pulse ? 2 : rotate ? 2 : 1,
        repeat: Infinity,
        ease: pulse ? "easeInOut" : rotate ? "linear" : "easeInOut"
      } : {}}
    >
      <Icon className={cn(sizes[size], variants[variant])} />
    </motion.div>
  );
};

// Animated icon badge
interface IconBadgeProps {
  icon: LucideIcon;
  badge?: number | string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export const CMOIconBadge: React.FC<IconBadgeProps> = ({
  icon: Icon,
  badge,
  color = 'bg-primary',
  size = 'md',
  animate = true
}) => {
  const sizes = {
    sm: { icon: 'w-8 h-8', badge: 'w-5 h-5 text-xs' },
    md: { icon: 'w-10 h-10', badge: 'w-6 h-6 text-sm' },
    lg: { icon: 'w-12 h-12', badge: 'w-7 h-7 text-base' }
  };

  return (
    <div className="relative inline-flex">
      <div className={cn(
        "rounded-full p-2",
        color.replace('bg-', 'bg-opacity-10 '),
        sizes[size].icon
      )}>
        <Icon className={cn("w-full h-full", color.replace('bg-', 'text-'))} />
      </div>
      
      {badge !== undefined && (
        <motion.div
          className={cn(
            "absolute -top-1 -right-1 rounded-full flex items-center justify-center text-white font-bold",
            color,
            sizes[size].badge
          )}
          initial={animate ? { scale: 0 } : {}}
          animate={animate ? { scale: 1 } : {}}
          transition={{ type: "spring", duration: 0.5 }}
        >
          {badge}
        </motion.div>
      )}
    </div>
  );
};

// Icon with tooltip
interface IconTooltipProps {
  icon: LucideIcon;
  tooltip: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export const CMOIconTooltip: React.FC<IconTooltipProps> = ({
  icon: Icon,
  tooltip,
  position = 'top',
  size = 'md'
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-flex">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <CMOIcon icon={Icon} size={size} />
      </button>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "absolute z-10 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap",
              positions[position]
            )}
          >
            {tooltip}
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

// Animated icon stack
interface IconStackProps {
  icons: LucideIcon[];
  size?: 'sm' | 'md' | 'lg';
  overlap?: boolean;
}

export const CMOIconStack: React.FC<IconStackProps> = ({
  icons,
  size = 'md',
  overlap = true
}) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  };

  return (
    <div className={cn("flex", overlap ? "-space-x-2" : "space-x-2")}>
      {icons.map((Icon, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 p-1.5",
            sizes[size]
          )}
          style={{ zIndex: icons.length - index }}
        >
          <Icon className="w-full h-full text-gray-700 dark:text-gray-300" />
        </motion.div>
      ))}
    </div>
  );
};

// Status icon with animation
interface StatusIconProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const CMOStatusIcon: React.FC<StatusIconProps> = ({
  status,
  size = 'md',
  showLabel = false
}) => {
  const statusConfig = {
    idle: { color: 'text-gray-400', animation: null, label: 'Idle' },
    loading: { color: 'text-blue-600', animation: 'spin', label: 'Loading' },
    success: { color: 'text-green-600', animation: 'bounce', label: 'Success' },
    error: { color: 'text-red-600', animation: 'shake', label: 'Error' },
    warning: { color: 'text-orange-600', animation: 'pulse', label: 'Warning' }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <motion.div
        className={cn("rounded-full", config.color)}
        animate={
          config.animation === 'spin' ? { rotate: 360 } :
          config.animation === 'bounce' ? { y: [0, -5, 0] } :
          config.animation === 'shake' ? { x: [-2, 2, -2, 2, 0] } :
          config.animation === 'pulse' ? { scale: [1, 1.2, 1] } :
          {}
        }
        transition={
          config.animation === 'spin' ? { duration: 1, repeat: Infinity, ease: "linear" } :
          config.animation ? { duration: 0.5, repeat: Infinity } :
          {}
        }
      >
        <div className={cn(
          "rounded-full",
          size === 'sm' ? 'w-2 h-2' :
          size === 'md' ? 'w-3 h-3' :
          'w-4 h-4',
          config.color.replace('text-', 'bg-')
        )} />
      </motion.div>
      
      {showLabel && (
        <span className={cn("text-sm font-medium", config.color)}>
          {config.label}
        </span>
      )}
    </div>
  );
};

export { AnimatePresence } from 'framer-motion';