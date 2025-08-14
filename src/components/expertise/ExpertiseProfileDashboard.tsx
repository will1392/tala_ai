/**
 * Expertise Profile Dashboard
 * Displays granular expertise levels across marketing channels
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Target,
  BookOpen,
  Zap,
  Settings,
  Star,
  AlertCircle,
  ChevronRight,
  Brain,
  Award,
  Activity
} from 'lucide-react';
import { 
  ExpertiseProfile, 
  ExpertiseSummary, 
  ChannelRecommendation,
  expertiseProfilesService 
} from '../../services/expertiseProfilesService';

interface ExpertiseProfileDashboardProps {
  userId: string;
  onClose?: () => void;
}

export const ExpertiseProfileDashboard: React.FC<ExpertiseProfileDashboardProps> = ({
  userId,
  onClose
}) => {
  const [profile, setProfile] = useState<ExpertiseProfile | null>(null);
  const [summary, setSummary] = useState<ExpertiseSummary | null>(null);
  const [recommendations, setRecommendations] = useState<ChannelRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'channels' | 'learning' | 'recommendations'>('overview');

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const [profileData, summaryData, recommendationsData] = await Promise.all([
        expertiseProfilesService.getProfile(userId),
        expertiseProfilesService.getExpertiseSummary(userId),
        expertiseProfilesService.getChannelRecommendations(userId)
      ]);
      
      setProfile(profileData);
      setSummary(summaryData);
      setRecommendations(recommendationsData);
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="animate-pulse">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !summary) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Profile Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Complete the expertise assessment to create your detailed profile.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Get Started
        </button>
      </div>
    );
  }

  const channelLevels = expertiseProfilesService.getChannelLevels(profile);
  const strengthScore = expertiseProfilesService.calculateStrengthScore(profile);
  const focusAreas = expertiseProfilesService.getRecommendedFocusAreas(profile);
  const learningStyleInfo = expertiseProfilesService.getLearningStyleRecommendations(profile.preferred_learning_style);

  const TabButton = ({ id, label, icon: Icon, active }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        active
          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  const ChannelCard = ({ channel, displayName, level, confidence, color, description }) => {
    const strengthScore = level * confidence;
    const levelDesc = expertiseProfilesService.getLevelDescription(level);
    const confidenceDesc = expertiseProfilesService.getConfidenceDescription(confidence);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">{displayName}</h4>
          <div className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
            {levelDesc}
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{description}</p>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Level</span>
            <span className="font-medium">{level.toFixed(1)}/4.0</span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(level / 4) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Confidence</span>
            <span className="font-medium">{Math.round(confidence * 100)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl mx-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Expertise Profile
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {summary.overall_level.charAt(0).toUpperCase() + summary.overall_level.slice(1)} level • 
                {profile.industry_experience.length > 0 && ` ${profile.industry_experience.join(', ')} experience`}
              </p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6">
          <TabButton id="overview" label="Overview" icon={BarChart3} active={activeTab === 'overview'} />
          <TabButton id="channels" label="Channels" icon={Target} active={activeTab === 'channels'} />
          <TabButton id="learning" label="Learning Style" icon={BookOpen} active={activeTab === 'learning'} />
          <TabButton id="recommendations" label="Recommendations" icon={Star} active={activeTab === 'recommendations'} />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Overall Strength
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(strengthScore * 10) / 10}/4.0
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    Strongest Area
                  </span>
                </div>
                <div className="text-lg font-bold text-green-600 capitalize">
                  {summary.strongest_channels[0]?.channel || 'N/A'}
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Focus Areas
                  </span>
                </div>
                <div className="text-2xl font-bold text-orange-600">
                  {focusAreas.filter(a => a.priority === 'high').length}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    Learning Style
                  </span>
                </div>
                <div className="text-lg font-bold text-purple-600 capitalize">
                  {profile.preferred_learning_style}
                </div>
              </div>
            </div>

            {/* Channel Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Channel Expertise
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {channelLevels.slice(0, 6).map((channel) => (
                  <ChannelCard key={channel.channel} {...channel} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                All Marketing Channels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {channelLevels.map((channel) => (
                  <ChannelCard key={channel.channel} {...channel} />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'learning' && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Your Learning Profile
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Preferred Learning Style
                  </h4>
                  <div className="text-blue-600 font-semibold capitalize mb-2">
                    {profile.preferred_learning_style}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {learningStyleInfo.approach}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Technical Comfort Level
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${profile.technical_comfort * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(profile.technical_comfort * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Recommended Content Types
                </h4>
                <div className="flex flex-wrap gap-2">
                  {learningStyleInfo.contentTypes.map((type, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 
                               rounded-full text-sm"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Learning Tips
                </h4>
                <ul className="space-y-2">
                  {learningStyleInfo.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Industry & Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Industry Experience
                </h4>
                {profile.industry_experience.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.industry_experience.map((industry, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 
                                 rounded-full text-sm capitalize"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No specific industry experience recorded
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Familiar Tools
                </h4>
                {profile.tools_familiar.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.tools_familiar.map((tool, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 
                                 rounded-full text-sm"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No specific tools recorded
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-6">
            {/* Focus Areas */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recommended Focus Areas
              </h3>
              <div className="space-y-3">
                {focusAreas.map((area, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${
                      area.priority === 'high'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : area.priority === 'medium'
                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1 rounded-full ${
                        area.priority === 'high' ? 'bg-red-100 dark:bg-red-900' :
                        area.priority === 'medium' ? 'bg-orange-100 dark:bg-orange-900' :
                        'bg-blue-100 dark:bg-blue-900'
                      }`}>
                        <AlertCircle className={`w-4 h-4 ${
                          area.priority === 'high' ? 'text-red-600' :
                          area.priority === 'medium' ? 'text-orange-600' :
                          'text-blue-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                            {area.channel}
                          </h4>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            area.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            area.priority === 'medium' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {area.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {area.reason}
                        </p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Action: {area.action}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* System Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  System Recommendations
                </h3>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                          {rec.channel} - {rec.type}
                        </h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {rec.recommendation}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Level: {rec.current_level.toFixed(1)}</span>
                        <span>Confidence: {Math.round(rec.confidence * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};