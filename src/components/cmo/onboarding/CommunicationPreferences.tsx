/**
 * CommunicationPreferences - Component for selecting learning and communication preferences
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Eye, Headphones, HandIcon, BookOpen, Zap, Gauge, Settings, CheckSquare } from 'lucide-react';

interface Preferences {
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  technicalComfort: number;
  detailPreference: 'high-level' | 'balanced' | 'detailed';
  pace: 'slow' | 'medium' | 'fast';
  industries: string[];
  tools: string[];
  goals: string[];
}

interface CommunicationPreferencesProps {
  onSelect: (preferences: Preferences) => void;
  initialData?: Partial<Preferences>;
  expertiseLevel?: string;
}

export const CommunicationPreferences: React.FC<CommunicationPreferencesProps> = ({
  onSelect,
  initialData = {},
  expertiseLevel = 'intermediate'
}) => {
  const [preferences, setPreferences] = useState<Preferences>({
    learningStyle: 'visual',
    technicalComfort: 0.5,
    detailPreference: 'balanced',
    pace: 'medium',
    industries: [],
    tools: [],
    goals: [],
    ...initialData
  });

  const [currentSection, setCurrentSection] = useState(0);

  const learningStyles = [
    {
      value: 'visual',
      icon: Eye,
      title: 'Visual Learner',
      description: 'I learn best with charts, diagrams, and screenshots',
      examples: ['Step-by-step screenshots', 'Infographics and charts', 'Visual templates'],
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      value: 'auditory',
      icon: Headphones,
      title: 'Auditory Learner',
      description: 'I prefer detailed explanations and analogies',
      examples: ['Thorough explanations', 'Real-world analogies', 'Verbal walkthroughs'],
      color: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      value: 'kinesthetic',
      icon: HandIcon,
      title: 'Hands-On Learner',
      description: 'I learn by doing and practicing',
      examples: ['Step-by-step tutorials', 'Practice exercises', 'Interactive examples'],
      color: 'from-purple-400 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      value: 'reading',
      icon: BookOpen,
      title: 'Reading/Writing Learner',
      description: 'I prefer comprehensive written resources',
      examples: ['Detailed guides', 'Checklists and lists', 'Documentation'],
      color: 'from-orange-400 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    }
  ];

  const travelSpecializations = [
    { value: 'luxury', label: 'Luxury Travel' },
    { value: 'adventure', label: 'Adventure Travel' },
    { value: 'cruise', label: 'Cruise Specialist' },
    { value: 'allinclusive', label: 'All-Inclusive Resorts' },
    { value: 'destination-wedding', label: 'Destination Weddings' },
    { value: 'disney', label: 'Disney & Theme Parks' },
    { value: 'european', label: 'European Travel' },
    { value: 'caribbean', label: 'Caribbean Specialist' },
    { value: 'asia', label: 'Asia Specialist' },
    { value: 'group', label: 'Group Travel' }
  ];

  const tools = [
    { value: 'google-analytics', label: 'Google Analytics' },
    { value: 'google-ads', label: 'Google Ads' },
    { value: 'facebook-ads', label: 'Facebook Ads' },
    { value: 'mailchimp', label: 'Mailchimp' },
    { value: 'hubspot', label: 'HubSpot' },
    { value: 'hootsuite', label: 'Hootsuite' },
    { value: 'canva', label: 'Canva' },
    { value: 'wordpress', label: 'WordPress' },
    { value: 'shopify', label: 'Shopify' },
    { value: 'salesforce', label: 'Salesforce' }
  ];

  const goals = [
    { value: 'increase-traffic', label: 'Increase website traffic' },
    { value: 'improve-conversions', label: 'Improve conversion rates' },
    { value: 'brand-awareness', label: 'Build brand awareness' },
    { value: 'lead-generation', label: 'Generate more leads' },
    { value: 'customer-retention', label: 'Improve customer retention' },
    { value: 'sales-growth', label: 'Increase sales' },
    { value: 'reduce-costs', label: 'Reduce marketing costs' },
    { value: 'better-analytics', label: 'Better measurement and analytics' }
  ];

  const sections = [
    { title: 'Learning Style', key: 'learningStyle', component: 'learningStyle' },
    { title: 'Communication Details', key: 'details', component: 'details' },
    { title: 'Background & Goals', key: 'background', component: 'background' }
  ];

  const updatePreference = (key: string, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key: string, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(item => item !== value)
        : [...prev[key], value]
    }));
  };

  const isLastSection = currentSection === sections.length - 1;
  const canContinue = preferences.learningStyle && preferences.detailPreference && preferences.pace;

  // Automatically advance to next section when current section is complete
  React.useEffect(() => {
    if (currentSection === 0 && preferences.learningStyle) {
      setCurrentSection(1);
    } else if (currentSection === 1 && preferences.detailPreference && preferences.pace && preferences.technicalComfort) {
      setCurrentSection(2);
    }
  }, [currentSection, preferences.learningStyle, preferences.detailPreference, preferences.pace, preferences.technicalComfort]);

  // Automatically complete when all preferences are set
  React.useEffect(() => {
    if (canContinue && preferences.industries.length > 0 && preferences.goals.length > 0) {
      onSelect(preferences);
    }
  }, [canContinue, preferences, onSelect]);

  return (
    <div className="space-y-6">
      {/* Section navigation */}
      <div className="flex items-center justify-center space-x-8 mb-8">
        {sections.map((section, index) => (
          <div key={section.key} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= currentSection
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
              }`}
            >
              {index < currentSection ? <CheckCircle className="w-4 h-4" /> : index + 1}
            </div>
            <span className={`ml-2 text-sm ${
              index <= currentSection
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {section.title}
            </span>
            {index < sections.length - 1 && (
              <div className={`w-12 h-px mx-4 ${
                index < currentSection
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Section content */}
      <div>
        {currentSection === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                How do you prefer to learn?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose the learning style that resonates most with you. This will help us tailor our explanations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learningStyles.map((style) => {
                const isSelected = preferences.learningStyle === style.value;
                const IconComponent = style.icon;
                
                return (
                  <motion.button
                    key={style.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updatePreference('learningStyle', style.value)}
                    className={`p-6 rounded-xl border-2 text-left transition-all duration-300 ${
                      isSelected
                        ? `${style.bgColor} border-blue-500 shadow-lg`
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle className="absolute top-4 right-4 w-6 h-6 text-green-600" />
                    )}
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isSelected ? style.bgColor : 'bg-gray-100 dark:bg-gray-600'
                      }`}>
                        <IconComponent className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {style.title}
                        </h4>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {style.description}
                    </p>
                    
                    <div className="space-y-1">
                      {style.examples.map((example, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-1 h-1 bg-current rounded-full opacity-60"></div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{example}</span>
                        </div>
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {currentSection === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Communication Preferences
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Help us understand how technical and detailed you'd like our responses to be.
              </p>
            </div>

            {/* Technical Comfort */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Technical Comfort Level
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                How comfortable are you with technical terms and concepts?
              </p>
              
              <div className="space-y-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={preferences.technicalComfort}
                  onChange={(e) => updatePreference('technicalComfort', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Keep it simple</span>
                  <span>Balanced</span>
                  <span>Technical details</span>
                </div>
              </div>
            </div>

            {/* Detail Preference */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Level of Detail
              </h4>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'high-level', label: 'High-level', desc: 'Quick summaries' },
                  { value: 'balanced', label: 'Balanced', desc: 'Mix of overview and details' },
                  { value: 'detailed', label: 'Detailed', desc: 'Comprehensive explanations' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updatePreference('detailPreference', option.value)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      preferences.detailPreference === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Pace */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                Learning Pace
              </h4>
              
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'slow', label: 'Take it slow', desc: 'Step-by-step guidance' },
                  { value: 'medium', label: 'Steady pace', desc: 'Balanced progression' },
                  { value: 'fast', label: 'Fast track', desc: 'Quick overviews and next steps' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updatePreference('pace', option.value)}
                    className={`p-4 rounded-lg border-2 text-center transition-all ${
                      preferences.pace === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{option.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {currentSection === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Background & Goals
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tell us about your specializations and tools so we can provide relevant travel marketing examples.
              </p>
            </div>

            {/* Travel Specializations */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                What types of travel do you specialize in? (Optional)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {travelSpecializations.map((specialization) => (
                  <button
                    key={specialization.value}
                    onClick={() => toggleArrayItem('industries', specialization.value)}
                    className={`p-3 rounded-lg border text-sm transition-all ${
                      preferences.industries.includes(specialization.value)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {specialization.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tools */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Which tools do you currently use? (Optional)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {tools.map((tool) => (
                  <button
                    key={tool.value}
                    onClick={() => toggleArrayItem('tools', tool.value)}
                    className={`p-3 rounded-lg border text-sm transition-all ${
                      preferences.tools.includes(tool.value)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Goals */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                What are your main marketing goals? (Optional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {goals.map((goal) => (
                  <button
                    key={goal.value}
                    onClick={() => toggleArrayItem('goals', goal.value)}
                    className={`p-3 rounded-lg border text-sm text-left transition-all ${
                      preferences.goals.includes(goal.value)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {preferences.goals.includes(goal.value) && (
                        <CheckSquare className="w-4 h-4" />
                      )}
                      {goal.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

    </div>
  );
};