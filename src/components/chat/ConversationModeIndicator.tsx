/**
 * Conversation Mode Indicator Component
 * 
 * Displays a visual indicator for the conversation mode (Travel/CMO)
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Plane, TrendingUp, Target, Mail, Share2, DollarSign, Package } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ConversationModeIndicatorProps {
  mode: 'travel' | 'cmo';
  subMode?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const ConversationModeIndicator: React.FC<ConversationModeIndicatorProps> = ({
  mode,
  subMode,
  size = 'sm',
  showLabel = false,
  className
}) => {
  // Get icon and styling based on mode
  const getModeConfig = () => {
    if (mode === 'travel') {
      return {
        icon: Plane,
        label: 'Travel',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30'
      };
    }

    // CMO mode with sub-modes
    const subModeConfigs = {
      seo: {
        icon: Target,
        label: 'SEO',
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/20',
        borderColor: 'border-purple-500/30'
      },
      email: {
        icon: Mail,
        label: 'Email',
        color: 'text-pink-400',
        bgColor: 'bg-pink-500/20',
        borderColor: 'border-pink-500/30'
      },
      social: {
        icon: Share2,
        label: 'Social',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        borderColor: 'border-cyan-500/30'
      },
      ads: {
        icon: DollarSign,
        label: 'Ads',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30'
      },
      direct_mail: {
        icon: Package,
        label: 'Direct Mail',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30'
      }
    };

    // If we have a sub-mode, use its config, otherwise default CMO config
    if (subMode && subModeConfigs[subMode as keyof typeof subModeConfigs]) {
      return subModeConfigs[subMode as keyof typeof subModeConfigs];
    }

    // Default CMO config
    return {
      icon: TrendingUp,
      label: 'Marketing',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30'
    };
  };

  const config = getModeConfig();
  const Icon = config.icon;

  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'h-6 px-2',
      icon: 12,
      text: 'text-xs'
    },
    md: {
      container: 'h-8 px-3',
      icon: 16,
      text: 'text-sm'
    },
    lg: {
      container: 'h-10 px-4',
      icon: 20,
      text: 'text-base'
    }
  };

  const sizeConfig = sizeClasses[size];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        sizeConfig.container,
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon 
        size={sizeConfig.icon} 
        className={config.color}
      />
      {showLabel && (
        <span className={cn(
          'font-medium',
          sizeConfig.text,
          config.color
        )}>
          {config.label}
        </span>
      )}
    </motion.div>
  );
};