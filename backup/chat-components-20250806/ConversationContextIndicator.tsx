/**
 * Conversation Context Indicator Component
 * 
 * Displays current conversation context, entities, and provides
 * context management controls for users.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  MapPin, 
  Calendar, 
  User, 
  Globe, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../shared/Button';
import { cn } from '../../utils/cn';

interface ConversationEntity {
  id: string;
  type: string;
  value: string;
  confidence: number;
  referenceCount: number;
}

interface ConversationIntent {
  id: string;
  type: string;
  confidence: number;
  isActive: boolean;
}

interface ContextIndicatorProps {
  /** Full conversation context object */
  context?: any;
  /** Whether context persistence is enabled */
  persistContext?: boolean;
  /** Toggle context persistence */
  onTogglePersistence?: () => void;
  /** Reset conversation context */
  onResetContext?: () => void;
  /** Whether component is in compact mode */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export const ConversationContextIndicator = ({
  context,
  persistContext = true,
  onTogglePersistence,
  onResetContext,
  compact = false,
  className
}: ContextIndicatorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Extract data from context
  const entities = context ? Array.from(context.entities?.values() || []) : [];
  const intents = context?.intents || [];
  const primaryContext = context?.primaryContext;

  // Filter entities by type for better organization
  const locationEntities = entities.filter(e => e.type === 'country' || e.type === 'city');
  const dateEntities = entities.filter(e => e.type === 'date' || e.type === 'travel_date' || e.type === 'passport_expiry');
  const personEntities = entities.filter(e => e.type === 'person_name');
  const otherEntities = entities.filter(e => 
    !['country', 'city', 'date', 'travel_date', 'passport_expiry', 'person_name'].includes(e.type)
  );

  const activeIntents = intents.filter(intent => intent.isActive);
  const hasContext = entities.length > 0 || activeIntents.length > 0;

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'country':
      case 'city':
        return <MapPin size={12} className="text-blue-400" />;
      case 'date':
      case 'travel_date':
      case 'passport_expiry':
        return <Calendar size={12} className="text-green-400" />;
      case 'person_name':
        return <User size={12} className="text-purple-400" />;
      default:
        return <Globe size={12} className="text-gray-400" />;
    }
  };

  const getIntentColor = (type: string) => {
    switch (type) {
      case 'visa_inquiry':
        return 'bg-blue-500/20 text-blue-300';
      case 'passport_check':
        return 'bg-green-500/20 text-green-300';
      case 'restaurant_search':
        return 'bg-orange-500/20 text-orange-300';
      case 'hotel_search':
        return 'bg-purple-500/20 text-purple-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const formatIntentName = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (!isVisible) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {hasContext && (
          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/20 rounded-md">
            <Brain size={14} className="text-primary" />
            <span className="text-xs text-primary font-medium">
              {entities.length + activeIntents.length}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(true)}
          className="p-1.5"
          title="Show conversation context"
        >
          <Eye size={14} />
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm",
        compact ? "p-3" : "p-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-primary" />
          <span className="font-medium text-sm">Conversation Context</span>
          {hasContext && (
            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
              {entities.length + activeIntents.length} items
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {!compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5"
              title={isExpanded ? "Collapse details" : "Expand details"}
            >
              <ChevronDown 
                size={14} 
                className={cn(
                  "transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
            </Button>
          )}
          {onTogglePersistence && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTogglePersistence}
              className={cn(
                "p-1.5",
                persistContext ? "text-green-400 hover:text-green-300" : "text-gray-400 hover:text-gray-300"
              )}
              title={persistContext ? "Context persistence enabled" : "Context persistence disabled"}
            >
              <Brain size={14} />
            </Button>
          )}
          {onResetContext && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetContext}
              className="p-1.5 text-red-400 hover:text-red-300"
              title="Reset conversation context"
              disabled={!hasContext}
            >
              <RotateCcw size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="p-1.5"
            title="Hide conversation context"
          >
            <EyeOff size={14} />
          </Button>
        </div>
      </div>

      {/* Primary Context Summary */}
      {primaryContext && (
        <div className="mb-3 p-2 bg-primary/5 border border-primary/10 rounded-md">
          <div className="text-xs font-medium text-primary mb-1">Current Focus</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {primaryContext.country && (
              <div className="flex items-center gap-1">
                <MapPin size={10} />
                <span>{primaryContext.country}</span>
              </div>
            )}
            {primaryContext.city && (
              <div className="flex items-center gap-1">
                <MapPin size={10} />
                <span>{primaryContext.city}</span>
              </div>
            )}
            {primaryContext.purpose && (
              <div className="flex items-center gap-1">
                <Brain size={10} />
                <span>{primaryContext.purpose}</span>
              </div>
            )}
            {primaryContext.timeframe && (
              <div className="flex items-center gap-1">
                <Calendar size={10} />
                <span>{primaryContext.timeframe}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Context State */}
      {!hasContext && (
        <div className="text-center py-4 text-white/50">
          <AlertTriangle size={20} className="mx-auto mb-2 opacity-50" />
          <div className="text-xs">No conversation context yet</div>
          <div className="text-xs opacity-75">Context will appear as you chat</div>
        </div>
      )}

      {/* Active Intents */}
      {activeIntents.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-white/70 mb-2">Active Topics</div>
          <div className="flex flex-wrap gap-1">
            {activeIntents.map(intent => (
              <div
                key={intent.id}
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  getIntentColor(intent.type)
                )}
              >
                {formatIntentName(intent.type)}
                <span className="ml-1 opacity-75">
                  {Math.round(intent.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entities Summary */}
      {entities.length > 0 && (
        <div className="space-y-2">
          {/* Locations */}
          {locationEntities.length > 0 && (
            <div>
              <div className="text-xs font-medium text-white/70 mb-1">Locations</div>
              <div className="flex flex-wrap gap-1">
                {locationEntities.map(entity => (
                  <div
                    key={entity.id}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md text-xs"
                  >
                    {getEntityIcon(entity.type)}
                    <span>{entity.value}</span>
                    {entity.referenceCount > 1 && (
                      <span className="text-blue-400 opacity-75">×{entity.referenceCount}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          {dateEntities.length > 0 && (
            <div>
              <div className="text-xs font-medium text-white/70 mb-1">Dates & Times</div>
              <div className="flex flex-wrap gap-1">
                {dateEntities.map(entity => (
                  <div
                    key={entity.id}
                    className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-md text-xs"
                  >
                    {getEntityIcon(entity.type)}
                    <span>{entity.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expanded Details */}
          <AnimatePresence>
            {(isExpanded || compact) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                {/* People */}
                {personEntities.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-white/70 mb-1">People</div>
                    <div className="flex flex-wrap gap-1">
                      {personEntities.map(entity => (
                        <div
                          key={entity.id}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md text-xs"
                        >
                          {getEntityIcon(entity.type)}
                          <span>{entity.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Entities */}
                {otherEntities.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-white/70 mb-1">Other</div>
                    <div className="flex flex-wrap gap-1">
                      {otherEntities.map(entity => (
                        <div
                          key={entity.id}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-500/10 border border-gray-500/20 rounded-md text-xs"
                        >
                          {getEntityIcon(entity.type)}
                          <span>{entity.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Context Tips */}
      {hasContext && !compact && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs text-white/50">
            💡 I can now understand references like "there", "it", and "the place" in your messages.
            {!persistContext && (
              <span className="block mt-1 text-yellow-400/70">
                ⚠️ Context persistence is disabled. Context will be cleared for each message.
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};