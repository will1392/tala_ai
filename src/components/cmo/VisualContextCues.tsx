import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, Mail, Hash, Send, 
  TrendingUp, AlertCircle, CheckCircle,
  BarChart3, Target, Zap, Users
} from 'lucide-react';
import { cn } from '../../utils/cn';

// Conversation type badge
interface ConversationBadgeProps {
  type: 'seo' | 'email' | 'social' | 'directMail' | 'general';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const ConversationBadge: React.FC<ConversationBadgeProps> = ({
  type,
  size = 'md',
  animated = true
}) => {
  const badges = {
    seo: {
      icon: TrendingUp,
      label: 'SEO',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-300 dark:border-blue-700'
    },
    email: {
      icon: Mail,
      label: 'Email',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      borderColor: 'border-green-300 dark:border-green-700'
    },
    social: {
      icon: Hash,
      label: 'Social',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      borderColor: 'border-purple-300 dark:border-purple-700'
    },
    directMail: {
      icon: Send,
      label: 'Direct Mail',
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      borderColor: 'border-orange-300 dark:border-orange-700'
    },
    general: {
      icon: MessageCircle,
      label: 'General',
      color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300',
      borderColor: 'border-gray-300 dark:border-gray-700'
    }
  };

  const badge = badges[type];
  const Icon = badge.icon;

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <motion.div
      initial={animated ? { scale: 0, opacity: 0 } : {}}
      animate={animated ? { scale: 1, opacity: 1 } : {}}
      whileHover={{ scale: 1.05 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        badge.color,
        badge.borderColor,
        sizes[size]
      )}
    >
      <Icon className={cn(
        size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
      )} />
      <span>{badge.label}</span>
    </motion.div>
  );
};

// Confidence indicator
interface ConfidenceIndicatorProps {
  level: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  level,
  showLabel = true,
  size = 'md',
  animated = true
}) => {
  const getColor = (level: number) => {
    if (level >= 80) return 'text-green-600';
    if (level >= 60) return 'text-blue-600';
    if (level >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLabel = (level: number) => {
    if (level >= 80) return 'High';
    if (level >= 60) return 'Medium';
    if (level >= 40) return 'Low';
    return 'Very Low';
  };

  const sizes = {
    sm: { bar: 'h-1', text: 'text-xs' },
    md: { bar: 'h-2', text: 'text-sm' },
    lg: { bar: 'h-3', text: 'text-base' }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className={cn(
          "w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden",
          sizes[size].bar
        )}>
          <motion.div
            className={cn(
              "h-full rounded-full transition-colors",
              getColor(level).replace('text-', 'bg-')
            )}
            initial={animated ? { width: 0 } : { width: `${level}%` }}
            animate={{ width: `${level}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
      
      {showLabel && (
        <div className={cn("flex items-center gap-1", sizes[size].text)}>
          <span className={cn("font-medium", getColor(level))}>
            {level}%
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            ({getLabel(level)})
          </span>
        </div>
      )}
    </div>
  );
};

// Related topic highlight
interface TopicHighlightProps {
  topics: string[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const TopicHighlight: React.FC<TopicHighlightProps> = ({
  topics,
  maxVisible = 3,
  size = 'md'
}) => {
  const visibleTopics = topics.slice(0, maxVisible);
  const remainingCount = topics.length - maxVisible;

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  return (
    <div className="flex flex-wrap gap-2">
      {visibleTopics.map((topic, index) => (
        <motion.span
          key={topic}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            "rounded-lg bg-primary/10 text-primary font-medium",
            sizes[size]
          )}
        >
          {topic}
        </motion.span>
      ))}
      
      {remainingCount > 0 && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: maxVisible * 0.1 }}
          className={cn(
            "rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
            sizes[size]
          )}
        >
          +{remainingCount} more
        </motion.span>
      )}
    </div>
  );
};

// Active tool indicator
interface ActiveToolIndicatorProps {
  toolName: string;
  toolIcon?: React.ElementType;
  status: 'idle' | 'active' | 'processing' | 'complete';
  size?: 'sm' | 'md' | 'lg';
}

export const ActiveToolIndicator: React.FC<ActiveToolIndicatorProps> = ({
  toolName,
  toolIcon: Icon = Zap,
  status,
  size = 'md'
}) => {
  const statusConfig = {
    idle: {
      color: 'bg-gray-100 dark:bg-gray-800 text-gray-600',
      pulse: false,
      icon: null
    },
    active: {
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700',
      pulse: true,
      icon: null
    },
    processing: {
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700',
      pulse: true,
      icon: AlertCircle
    },
    complete: {
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700',
      pulse: false,
      icon: CheckCircle
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const sizes = {
    sm: { padding: 'px-3 py-1.5', icon: 'w-4 h-4', text: 'text-sm' },
    md: { padding: 'px-4 py-2', icon: 'w-5 h-5', text: 'text-base' },
    lg: { padding: 'px-5 py-2.5', icon: 'w-6 h-6', text: 'text-lg' }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg font-medium",
        config.color,
        sizes[size].padding,
        config.pulse && "animate-pulse"
      )}
    >
      <Icon className={sizes[size].icon} />
      <span className={sizes[size].text}>{toolName}</span>
      {StatusIcon && (
        <StatusIcon className={cn(sizes[size].icon, "ml-1")} />
      )}
    </motion.div>
  );
};

// Marketing metric indicator
interface MetricIndicatorProps {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ElementType;
  size?: 'sm' | 'md' | 'lg';
}

export const MetricIndicator: React.FC<MetricIndicatorProps> = ({
  label,
  value,
  change,
  icon: Icon = BarChart3,
  size = 'md'
}) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  const sizes = {
    sm: { padding: 'p-3', icon: 'w-8 h-8', text: 'text-sm', value: 'text-lg' },
    md: { padding: 'p-4', icon: 'w-10 h-10', text: 'text-base', value: 'text-2xl' },
    lg: { padding: 'p-6', icon: 'w-12 h-12', text: 'text-lg', value: 'text-3xl' }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700",
        sizes[size].padding
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-gray-600 dark:text-gray-400", sizes[size].text)}>
            {label}
          </p>
          <p className={cn("font-bold mt-1", sizes[size].value)}>
            {value}
          </p>
          
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 mt-2",
              isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-500"
            )}>
              <TrendingUp className={cn(
                "w-4 h-4",
                isNegative && "rotate-180"
              )} />
              <span className="text-sm font-medium">
                {isPositive && '+'}{change}%
              </span>
            </div>
          )}
        </div>
        
        <div className={cn(
          "rounded-lg bg-primary/10 p-3 text-primary",
          sizes[size].icon
        )}>
          <Icon className="w-full h-full" />
        </div>
      </div>
    </motion.div>
  );
};

// Activity status indicator
interface ActivityStatusProps {
  activities: {
    type: 'campaign' | 'analysis' | 'content' | 'optimization';
    status: 'active' | 'pending' | 'complete';
    count: number;
  }[];
}

export const ActivityStatus: React.FC<ActivityStatusProps> = ({ activities }) => {
  const typeIcons = {
    campaign: Target,
    analysis: BarChart3,
    content: MessageCircle,
    optimization: Zap
  };

  const statusColors = {
    active: 'bg-green-500',
    pending: 'bg-orange-500',
    complete: 'bg-gray-400'
  };

  return (
    <div className="flex items-center gap-4">
      {activities.map((activity, index) => {
        const Icon = typeIcons[activity.type];
        
        return (
          <motion.div
            key={activity.type}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <div className={cn(
                "absolute -top-1 -right-1 w-3 h-3 rounded-full",
                statusColors[activity.status]
              )} />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {activity.count}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

// Context-aware hint
interface ContextHintProps {
  message: string;
  type?: 'info' | 'tip' | 'warning';
  dismissible?: boolean;
}

export const ContextHint: React.FC<ContextHintProps> = ({
  message,
  type = 'info',
  dismissible = true
}) => {
  const [visible, setVisible] = React.useState(true);

  if (!visible) return null;

  const typeConfig = {
    info: {
      icon: MessageCircle,
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    tip: {
      icon: Zap,
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    warning: {
      icon: AlertCircle,
      color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
      borderColor: 'border-orange-200 dark:border-orange-800'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border",
        config.color,
        config.borderColor
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{message}</p>
      
      {dismissible && (
        <button
          onClick={() => setVisible(false)}
          className="text-current opacity-60 hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}
    </motion.div>
  );
};

export default {
  ConversationBadge,
  ConfidenceIndicator,
  TopicHighlight,
  ActiveToolIndicator,
  MetricIndicator,
  ActivityStatus,
  ContextHint
};