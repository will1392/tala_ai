import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Star, Award, Target, Zap, 
  TrendingUp, Lock, ChevronRight, X
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { achievementSystem } from '../../services/AchievementSystem';
import type { Achievement, UserAchievements } from '../../services/AchievementSystem';
import { useNotifications } from './NotificationSystem';
import { CMOProgressIndicator } from './NotificationSystem';

interface AchievementNotificationProps {
  achievement: Achievement;
  onClose: () => void;
}

// Achievement unlock notification
export const AchievementNotification: React.FC<AchievementNotificationProps> = ({ 
  achievement, 
  onClose 
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const tierColors = {
    bronze: 'from-orange-400 to-orange-600',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-purple-400 to-purple-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.9 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-sm"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        <div className={cn(
          "h-2 bg-gradient-to-r",
          tierColors[achievement.tier]
        )} />
        
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              "w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-3xl",
              tierColors[achievement.tier]
            )}>
              {achievement.icon}
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">Achievement Unlocked!</h3>
              <p className="font-semibold text-lg">{achievement.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {achievement.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-medium text-primary">
                  +{achievement.points} points
                </span>
                <span className="text-xs text-gray-500">
                  {achievement.tier.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Celebration effect */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary rounded-full"
            initial={{ 
              x: 0, 
              y: 0,
              opacity: 1
            }}
            animate={{ 
              x: (Math.random() - 0.5) * 200,
              y: (Math.random() - 0.5) * 200,
              opacity: 0
            }}
            transition={{ 
              duration: 1,
              delay: i * 0.1,
              ease: "easeOut"
            }}
            style={{
              left: '50%',
              top: '50%'
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Achievement card component
const AchievementCard: React.FC<{
  achievement: Achievement;
  isUnlocked: boolean;
  progress?: number;
  onClick: () => void;
}> = ({ achievement, isUnlocked, progress = 0, onClick }) => {
  const tierColors = {
    bronze: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20',
    silver: 'border-gray-400 bg-gray-50 dark:bg-gray-900/20',
    gold: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20',
    platinum: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
  };

  const tierTextColors = {
    bronze: 'text-orange-600 dark:text-orange-400',
    silver: 'text-gray-600 dark:text-gray-400',
    gold: 'text-yellow-600 dark:text-yellow-400',
    platinum: 'text-purple-600 dark:text-purple-400'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-lg border-2 cursor-pointer transition-all",
        isUnlocked
          ? tierColors[achievement.tier]
          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
      )}
    >
      {!isUnlocked && (
        <div className="absolute inset-0 bg-gray-900/10 dark:bg-gray-900/30 rounded-lg flex items-center justify-center">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
      )}

      <div className={cn("flex items-start gap-3", !isUnlocked && "opacity-50")}>
        <div className="text-3xl">{achievement.icon}</div>
        
        <div className="flex-1">
          <h4 className="font-semibold">{achievement.name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {achievement.description}
          </p>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                isUnlocked
                  ? tierTextColors[achievement.tier]
                  : "text-gray-500"
              )}>
                {achievement.tier.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500">
                {achievement.points} pts
              </span>
            </div>

            {!isUnlocked && progress > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(progress / achievement.criteria.target) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {progress}/{achievement.criteria.target}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isUnlocked && achievement.unlockedAt && (
        <div className="mt-2 text-xs text-gray-500">
          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  );
};

// Main achievements panel
export const AchievementsPanel: React.FC<{
  userId: string;
  onClose?: () => void;
}> = ({ userId, onClose }) => {
  const [userAchievements, setUserAchievements] = useState<UserAchievements | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  useEffect(() => {
    const loadAchievements = () => {
      const achievements = achievementSystem.getUserAchievements(userId);
      setUserAchievements(achievements);
    };

    loadAchievements();

    // Subscribe to achievement updates
    const unsubscribe = achievementSystem.onAchievementUnlocked(() => {
      loadAchievements();
    });

    return unsubscribe;
  }, [userId]);

  if (!userAchievements) return null;

  const categories = [
    { id: 'all', label: 'All', icon: Trophy },
    { id: 'campaign', label: 'Campaigns', icon: Target },
    { id: 'tool', label: 'Tools', icon: Zap },
    { id: 'channel', label: 'Channels', icon: TrendingUp },
    { id: 'result', label: 'Results', icon: Award },
    { id: 'special', label: 'Special', icon: Star }
  ];

  const allAchievements = achievementSystem.getAchievementsByCategory(
    selectedCategory === 'all' ? undefined : selectedCategory
  );

  const unlockedCount = userAchievements.achievements.filter(a => a.unlockedAt).length;
  const totalCount = achievementSystem.getAchievementsByCategory().length;
  const completionPercentage = (unlockedCount / totalCount) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-6xl mx-auto max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-purple-600 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Achievements</h2>
              <p className="text-white/80">Track your marketing milestones</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-white/80 text-sm">Level</p>
            <p className="text-2xl font-bold">{userAchievements.level}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-white/80 text-sm">Total Points</p>
            <p className="text-2xl font-bold">{userAchievements.totalPoints}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-white/80 text-sm">Unlocked</p>
            <p className="text-2xl font-bold">{unlockedCount}/{totalCount}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3">
            <p className="text-white/80 text-sm">Completion</p>
            <p className="text-2xl font-bold">{completionPercentage.toFixed(0)}%</p>
          </div>
        </div>

        {/* Level progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Level {userAchievements.level}</span>
            <span>Level {userAchievements.level + 1}</span>
          </div>
          <CMOProgressIndicator
            value={userAchievements.totalPoints}
            max={userAchievements.nextLevelPoints}
            variant="linear"
            size="sm"
          />
          <p className="text-xs text-white/60 mt-1">
            {userAchievements.nextLevelPoints - userAchievements.totalPoints} points to next level
          </p>
        </div>
      </div>

      {/* Categories */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex gap-4 overflow-x-auto py-3">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors",
                  selectedCategory === category.id
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievements grid - scrollable */}
      <div className="p-6 overflow-y-auto flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allAchievements.map(achievement => {
            const userAchievement = userAchievements.achievements.find(
              a => a.id === achievement.id
            );
            const isUnlocked = !!userAchievement?.unlockedAt;
            const progress = userAchievement?.progress || 0;

            return (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                isUnlocked={isUnlocked}
                progress={progress}
                onClick={() => setSelectedAchievement(achievement)}
              />
            );
          })}
        </div>
      </div>

      {/* Achievement detail modal */}
      <AnimatePresence>
        {selectedAchievement && (
          <AchievementDetailModal
            achievement={selectedAchievement}
            isUnlocked={userAchievements.achievements.some(
              a => a.id === selectedAchievement.id && a.unlockedAt
            )}
            onClose={() => setSelectedAchievement(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Achievement detail modal
const AchievementDetailModal: React.FC<{
  achievement: Achievement;
  isUnlocked: boolean;
  onClose: () => void;
}> = ({ achievement, isUnlocked, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{achievement.icon}</div>
            <div>
              <h3 className="text-xl font-bold">{achievement.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {achievement.tier.toUpperCase()} • {achievement.points} points
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {achievement.description}
        </p>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <h4 className="font-semibold mb-2">How to unlock:</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {achievement.criteria.type === 'count' && 
              `Complete ${achievement.criteria.target} ${achievement.category} tasks`}
            {achievement.criteria.type === 'milestone' && 
              `Reach the milestone of ${achievement.criteria.target}`}
            {achievement.criteria.type === 'streak' && 
              `Maintain a ${achievement.criteria.target}-day streak`}
            {achievement.criteria.type === 'performance' && 
              `Achieve ${achievement.criteria.target}% performance`}
          </p>
        </div>

        {isUnlocked && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-green-700 dark:text-green-300 font-medium">
              ✓ Achievement Unlocked!
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// Achievement tracker hook
export const useAchievements = (userId: string) => {
  const { addNotification } = useNotifications();
  const [showNotification, setShowNotification] = useState<Achievement | null>(null);

  useEffect(() => {
    const unsubscribe = achievementSystem.onAchievementUnlocked((achievement) => {
      setShowNotification(achievement);
      addNotification({
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: achievement.name
        // Remove icon prop - let the notification system use its default achievement icon
      });
    });

    return unsubscribe;
  }, [addNotification]);

  const trackAction = (action: any) => {
    return achievementSystem.trackAction(userId, action);
  };

  return {
    trackAction,
    showNotification,
    clearNotification: () => setShowNotification(null)
  };
};

export default AchievementsPanel;