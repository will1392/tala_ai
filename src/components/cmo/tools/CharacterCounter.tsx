import React, { useState, useEffect } from 'react';
import { Type, Twitter, Linkedin, Facebook, Instagram, MessageSquare, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface CharacterCounterProps {
  onResult?: (result: any) => void;
  initialData?: any;
  isFullscreen?: boolean;
}

interface PlatformLimit {
  platform: string;
  limit: number;
  warning: number;
  icon: React.ElementType;
  description: string;
}

interface CountAnalysis {
  text: string;
  characters: number;
  charactersNoSpaces: number;
  words: number;
  lines: number;
  bytes: number;
  platforms: Array<{
    platform: string;
    status: 'good' | 'warning' | 'error';
    remaining: number;
    percentage: number;
  }>;
}

const PLATFORM_LIMITS: PlatformLimit[] = [
  {
    platform: 'Twitter/X',
    limit: 280,
    warning: 250,
    icon: Twitter,
    description: 'Tweet character limit'
  },
  {
    platform: 'LinkedIn Post',
    limit: 3000,
    warning: 2700,
    icon: Linkedin,
    description: 'LinkedIn post limit'
  },
  {
    platform: 'Facebook Post',
    limit: 63206,
    warning: 60000,
    icon: Facebook,
    description: 'Facebook post limit'
  },
  {
    platform: 'Instagram Caption',
    limit: 2200,
    warning: 2000,
    icon: Instagram,
    description: 'Instagram caption limit'
  },
  {
    platform: 'Meta Description',
    limit: 160,
    warning: 150,
    icon: Type,
    description: 'SEO meta description'
  },
  {
    platform: 'SMS',
    limit: 160,
    warning: 140,
    icon: MessageSquare,
    description: 'Single SMS message'
  },
  {
    platform: 'Google Ads Headline',
    limit: 30,
    warning: 25,
    icon: Type,
    description: 'Google Ads headline'
  },
  {
    platform: 'Email Subject',
    limit: 60,
    warning: 50,
    icon: Type,
    description: 'Email subject line'
  }
];

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
  onResult,
  initialData,
  isFullscreen = false
}) => {
  const [text, setText] = useState(initialData?.text || '');
  const [analysis, setAnalysis] = useState<CountAnalysis | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    initialData?.selectedPlatforms || ['Twitter/X', 'LinkedIn Post', 'Meta Description']
  );

  // Analyze text
  const analyzeText = () => {
    if (!text) {
      setAnalysis(null);
      return;
    }

    const characters = text.length;
    const charactersNoSpaces = text.replace(/\s/g, '').length;
    const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    const lines = text.split('\n').length;
    const bytes = new Blob([text]).size;

    // Platform analysis
    const platforms = PLATFORM_LIMITS.map(platform => {
      const remaining = platform.limit - characters;
      const percentage = (characters / platform.limit) * 100;
      
      let status: 'good' | 'warning' | 'error' = 'good';
      if (characters > platform.limit) {
        status = 'error';
      } else if (characters > platform.warning) {
        status = 'warning';
      }

      return {
        platform: platform.platform,
        status,
        remaining,
        percentage: Math.min(100, percentage)
      };
    });

    const result: CountAnalysis = {
      text,
      characters,
      charactersNoSpaces,
      words,
      lines,
      bytes,
      platforms
    };

    setAnalysis(result);

    if (onResult) {
      onResult({
        text,
        analysis: result,
        selectedPlatforms,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Auto-analyze on text change
  useEffect(() => {
    analyzeText();
  }, [text]);

  // Toggle platform selection
  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  // Get status color
  const getStatusColor = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'error': return 'text-red-600 dark:text-red-400';
    }
  };

  // Get progress bar color
  const getProgressColor = (status: 'good' | 'warning' | 'error') => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
    }
  };

  return (
    <div className={cn(
      "space-y-4",
      isFullscreen ? "max-w-4xl mx-auto" : ""
    )}>
      {/* Text Input */}
      <div>
        <label htmlFor="text-input" className="block text-sm font-medium mb-2">
          Enter Your Text
        </label>
        <textarea
          id="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste your text here..."
          className={cn(
            "w-full px-4 py-3",
            "border border-gray-300 dark:border-gray-600 rounded-lg",
            "bg-white dark:bg-gray-800",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            "placeholder-gray-400 dark:placeholder-gray-500",
            "resize-none"
          )}
          rows={isFullscreen ? 8 : 6}
        />
      </div>

      {/* Quick Stats */}
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-2xl font-bold">{analysis.characters}</div>
            <div className="text-xs text-gray-500">Characters</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-2xl font-bold">{analysis.charactersNoSpaces}</div>
            <div className="text-xs text-gray-500">No Spaces</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-2xl font-bold">{analysis.words}</div>
            <div className="text-xs text-gray-500">Words</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-2xl font-bold">{analysis.lines}</div>
            <div className="text-xs text-gray-500">Lines</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-2xl font-bold">{analysis.bytes}</div>
            <div className="text-xs text-gray-500">Bytes</div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
            <div className="text-2xl font-bold">
              {analysis.characters > 0 ? Math.round(analysis.words / (analysis.characters / 1000)) : 0}
            </div>
            <div className="text-xs text-gray-500">Words/1K</div>
          </div>
        </div>
      )}

      {/* Platform Selection */}
      <div>
        <h4 className="text-sm font-medium mb-3">Select Platforms to Monitor</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {PLATFORM_LIMITS.map(platform => {
            const Icon = platform.icon;
            const isSelected = selectedPlatforms.includes(platform.platform);
            
            return (
              <button
                key={platform.platform}
                onClick={() => togglePlatform(platform.platform)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all",
                  "border",
                  isSelected
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate">{platform.platform}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform Analysis */}
      <AnimatePresence>
        {analysis && selectedPlatforms.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-medium">Platform Limits</h4>
            
            {PLATFORM_LIMITS
              .filter(p => selectedPlatforms.includes(p.platform))
              .map(platform => {
                const platformAnalysis = analysis.platforms.find(
                  p => p.platform === platform.platform
                );
                
                if (!platformAnalysis) return null;
                
                const Icon = platform.icon;
                
                return (
                  <motion.div
                    key={platform.platform}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <div>
                          <div className="font-medium">{platform.platform}</div>
                          <div className="text-xs text-gray-500">
                            {platform.description}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-medium",
                          getStatusColor(platformAnalysis.status)
                        )}>
                          {platformAnalysis.remaining >= 0 
                            ? `${platformAnalysis.remaining} left`
                            : `${Math.abs(platformAnalysis.remaining)} over`
                        }
                        </div>
                        <div className="text-xs text-gray-500">
                          {analysis.characters} / {platform.limit}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${platformAnalysis.percentage}%` }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "absolute h-full rounded-full",
                          getProgressColor(platformAnalysis.status)
                        )}
                      />
                    </div>
                    
                    {/* Status Message */}
                    {platformAnalysis.status === 'error' && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        Character limit exceeded!
                      </div>
                    )}
                    {platformAnalysis.status === 'warning' && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                        <AlertCircle className="w-4 h-4" />
                        Approaching character limit
                      </div>
                    )}
                  </motion.div>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      {analysis && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Character Count Tips</h4>
          <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
            <li>• Twitter counts emojis as 2 characters</li>
            <li>• URLs in tweets count as 23 characters</li>
            <li>• LinkedIn truncates posts at 210 characters in feed</li>
            <li>• SMS may split into multiple messages over 160 chars</li>
            <li>• Meta descriptions show ~155-160 chars in search results</li>
          </ul>
        </div>
      )}
    </div>
  );
};