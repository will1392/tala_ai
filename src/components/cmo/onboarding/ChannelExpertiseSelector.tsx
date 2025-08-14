/**
 * ChannelExpertiseSelector - Component for selecting channel-specific expertise
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Star, ArrowRight, Info } from 'lucide-react';

interface ChannelExpertise {
  level: number;
  confidence: number;
}

interface ChannelExpertiseSelectorProps {
  onSelect: (channels: Record<string, ChannelExpertise>) => void;
  initialData?: Record<string, ChannelExpertise>;
  expertiseLevel?: string;
}

export const ChannelExpertiseSelector: React.FC<ChannelExpertiseSelectorProps> = ({
  onSelect,
  initialData = {},
  expertiseLevel = 'intermediate'
}) => {
  const [channelLevels, setChannelLevels] = useState<Record<string, ChannelExpertise>>(initialData);
  const [completedChannels, setCompletedChannels] = useState(new Set(Object.keys(initialData)));

  const channels = [
    {
      id: 'seo',
      name: 'Search Engine Optimization (SEO)',
      icon: '🔍',
      description: 'Improving website visibility in search results',
      examples: ['Keyword research', 'On-page optimization', 'Link building'],
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800'
    },
    {
      id: 'email',
      name: 'Email Marketing',
      icon: '📧',
      description: 'Creating and sending targeted email campaigns',
      examples: ['Newsletter campaigns', 'Automated sequences', 'Segmentation'],
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800'
    },
    {
      id: 'social',
      name: 'Social Media Marketing',
      icon: '📱',
      description: 'Building brand presence on social platforms',
      examples: ['Content creation', 'Community management', 'Social advertising'],
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800'
    },
    {
      id: 'ppc',
      name: 'Pay-Per-Click (PPC) Advertising',
      icon: '💰',
      description: 'Running paid advertising campaigns',
      examples: ['Google Ads', 'Facebook Ads', 'Campaign optimization'],
      color: 'from-orange-400 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800'
    },
    {
      id: 'content',
      name: 'Content Marketing',
      icon: '✍️',
      description: 'Creating valuable content to attract customers',
      examples: ['Blog writing', 'Video marketing', 'Content strategy'],
      color: 'from-indigo-400 to-indigo-600',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      borderColor: 'border-indigo-200 dark:border-indigo-800'
    },
    {
      id: 'analytics',
      name: 'Marketing Analytics',
      icon: '📊',
      description: 'Measuring and analyzing marketing performance',
      examples: ['Google Analytics', 'Performance tracking', 'ROI analysis'],
      color: 'from-teal-400 to-teal-600',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      borderColor: 'border-teal-200 dark:border-teal-800'
    }
  ];

  const experienceLevels = [
    { value: 1, label: 'No experience', description: 'Never worked with this' },
    { value: 2, label: 'Basic understanding', description: 'Know the basics, limited hands-on' },
    { value: 3, label: 'Some experience', description: 'Have run campaigns or projects' },
    { value: 4, label: 'Very experienced', description: 'Regular use with good results' },
    { value: 5, label: 'Expert level', description: 'Deep expertise, could teach others' }
  ];

  const handleChannelUpdate = (channelId: string, level: number) => {
    // Calculate confidence based on level selection
    const confidence = level === 1 ? 0.2 : level === 2 ? 0.4 : level === 3 ? 0.6 : level === 4 ? 0.8 : 0.95;
    
    const updatedChannels = {
      ...channelLevels,
      [channelId]: { level: level / 5 * 4, confidence } // Convert 1-5 scale to 0-4 scale
    };
    
    setChannelLevels(updatedChannels);
    setCompletedChannels(new Set([...completedChannels, channelId]));
  };

  const handleContinue = () => {
    // Ensure all channels have a value (default to level 1 if not selected)
    const completeChannels = { ...channelLevels };
    channels.forEach(channel => {
      if (!completeChannels[channel.id]) {
        completeChannels[channel.id] = { level: 0.8, confidence: 0.4 }; // Default to basic
      }
    });
    
    onSelect(completeChannels);
  };

  const allChannelsCompleted = channels.every(channel => completedChannels.has(channel.id));
  const selectedCount = completedChannels.size;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Rate your experience with each marketing channel
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This helps us provide the right level of detail for each topic. Don't worry if you're new to some areas - we'll help you learn!
            </p>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>Select your experience level for each channel</span>
        <span>{selectedCount} of {channels.length} completed</span>
      </div>

      {/* Channel list */}
      <div className="space-y-4">
        {channels.map((channel, index) => {
          const isCompleted = completedChannels.has(channel.id);
          const currentLevel = channelLevels[channel.id]?.level || 0;
          const displayLevel = Math.round((currentLevel / 4) * 5) || 1;
          
          return (
            <motion.div
              key={channel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`border-2 rounded-xl p-6 transition-all duration-300 ${
                isCompleted
                  ? `${channel.bgColor} ${channel.borderColor}`
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              {/* Channel header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                    isCompleted ? channel.bgColor : 'bg-gray-100 dark:bg-gray-600'
                  }`}>
                    {channel.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {channel.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {channel.description}
                    </p>
                  </div>
                </div>
                
                {isCompleted && (
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                )}
              </div>

              {/* Examples */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Includes:
                </p>
                <div className="flex flex-wrap gap-2">
                  {channel.examples.map((example, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-xs rounded-full text-gray-700 dark:text-gray-300"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experience level selector */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your experience level:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {experienceLevels.map((level) => {
                    const isSelected = displayLevel === level.value;
                    
                    return (
                      <button
                        key={level.value}
                        onClick={() => handleChannelUpdate(channel.id, level.value)}
                        className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < level.value
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          {isSelected && <CheckCircle className="w-4 h-4 text-blue-600" />}
                        </div>
                        <p className="text-xs font-medium mb-1">{level.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {level.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Continue button */}
      <div className="flex justify-end pt-6">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleContinue}
          disabled={selectedCount === 0}
          className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
            selectedCount > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Preferences
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};