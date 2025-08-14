/**
 * ExpertiseLevelSelector - Component for selecting marketing expertise level
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, HelpCircle, TrendingUp, Award, Rocket } from 'lucide-react';

interface ExpertiseLevelSelectorProps {
  onSelect: (level: 'beginner' | 'intermediate' | 'advanced' | 'expert') => void;
  initialData?: string;
}

export const ExpertiseLevelSelector: React.FC<ExpertiseLevelSelectorProps> = ({
  onSelect,
  initialData
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(initialData || null);
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);

  const levels = [
    {
      value: 'beginner',
      icon: '🌱',
      iconComponent: TrendingUp,
      title: 'Marketing Beginner',
      subtitle: 'Just getting started',
      description: "I'm new to marketing and want to learn the fundamentals",
      examples: [
        "Starting my first business or marketing role",
        "Learning basic marketing concepts",
        "Want simple, jargon-free explanations"
      ],
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-800',
      textColor: 'text-green-700 dark:text-green-300'
    },
    {
      value: 'intermediate',
      icon: '🌿',
      iconComponent: TrendingUp,
      title: 'Marketing Intermediate',
      subtitle: 'Building my skills',
      description: 'I understand the basics and have run some campaigns',
      examples: [
        "Know what SEO, PPC, and email marketing mean",
        "Have sent marketing emails or run basic ads",
        "Understand metrics like CTR and conversion rate"
      ],
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-800',
      textColor: 'text-blue-700 dark:text-blue-300'
    },
    {
      value: 'advanced',
      icon: '🌳',
      iconComponent: Award,
      title: 'Marketing Advanced',
      subtitle: 'Experienced practitioner',
      description: 'I regularly run campaigns and analyze performance',
      examples: [
        "Use tools like Google Analytics and Facebook Ads Manager",
        "Run A/B tests and optimize based on data",
        "Manage multiple marketing channels simultaneously"
      ],
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-800',
      textColor: 'text-purple-700 dark:text-purple-300'
    },
    {
      value: 'expert',
      icon: '🏆',
      iconComponent: Rocket,
      title: 'Marketing Expert',
      subtitle: 'Strategic leader',
      description: 'I have deep expertise and want cutting-edge strategies',
      examples: [
        "Manage complex, multi-channel marketing funnels",
        "Lead marketing teams or agencies",
        "Stay current with latest marketing technologies and trends"
      ],
      color: 'from-orange-400 to-red-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-700 dark:text-orange-300'
    }
  ];

  const handleSelect = (level: string) => {
    setSelectedLevel(level);
    // Add a small delay for visual feedback
    setTimeout(() => {
      onSelect(level as any);
    }, 200);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {levels.map((level, index) => {
          const isSelected = selectedLevel === level.value;
          const isHovered = hoveredLevel === level.value;
          const IconComponent = level.iconComponent;
          
          return (
            <motion.button
              key={level.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(level.value)}
              onMouseEnter={() => setHoveredLevel(level.value)}
              onMouseLeave={() => setHoveredLevel(null)}
              className={`relative p-6 rounded-xl border-2 text-left transition-all duration-300 ${
                isSelected
                  ? `${level.bgColor} ${level.borderColor} shadow-lg`
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4"
                >
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </motion.div>
              )}

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                  isSelected ? level.bgColor : 'bg-gray-100 dark:bg-gray-600'
                }`}>
                  <span className="text-2xl">{level.icon}</span>
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    isSelected ? level.textColor : 'text-gray-900 dark:text-white'
                  }`}>
                    {level.title}
                  </h3>
                  <p className={`text-sm ${
                    isSelected ? level.textColor : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {level.subtitle}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className={`text-sm mb-4 ${
                isSelected ? level.textColor : 'text-gray-600 dark:text-gray-300'
              }`}>
                {level.description}
              </p>

              {/* Examples */}
              <div className="space-y-2">
                <p className={`text-xs font-medium ${
                  isSelected ? level.textColor : 'text-gray-500 dark:text-gray-400'
                }`}>
                  Perfect if you:
                </p>
                <ul className="space-y-1">
                  {level.examples.map((example, i) => (
                    <li key={i} className={`text-xs flex items-start gap-2 ${
                      isSelected ? level.textColor : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      <span className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0"></span>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hover indicator */}
              {(isSelected || isHovered) && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 mt-4 pt-4 border-t border-current/20"
                >
                  <span className={`text-sm font-medium ${level.textColor}`}>
                    {isSelected ? 'Selected' : 'Select this level'}
                  </span>
                  <ArrowRight className={`w-4 h-4 ${level.textColor}`} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Help text */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6"
      >
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Not sure which level to choose?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Don't worry! We'll adjust as we learn more about your knowledge. You can always change this later.
              Start with the level that feels most comfortable - it's better to begin with simpler explanations than to feel overwhelmed.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};