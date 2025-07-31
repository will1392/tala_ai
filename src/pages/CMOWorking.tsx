import React, { useState } from 'react';
import { NotificationProvider, useNotifications } from '../components/cmo/NotificationSystem';
import { Trophy, HelpCircle, Play, Sparkles, TrendingUp, Users, Mail, Hash } from 'lucide-react';
import { motion } from 'framer-motion';

// Simple dashboard component that works
const SimpleDashboard: React.FC = () => {
  const { addNotification } = useNotifications();
  
  const handleTestNotification = () => {
    addNotification({
      type: 'success',
      title: 'Test Notification',
      message: 'This is a test notification without any complex icons'
    });
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">CMO Dashboard</h2>
      
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Campaigns</p>
              <p className="text-2xl font-bold">12</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reach</p>
              <p className="text-2xl font-bold">45.2K</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Email Opens</p>
              <p className="text-2xl font-bold">78%</p>
            </div>
            <Mail className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Social Engagement</p>
              <p className="text-2xl font-bold">92%</p>
            </div>
            <Hash className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>
      
      {/* Test Button */}
      <button
        onClick={handleTestNotification}
        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
      >
        Test Notification
      </button>
    </div>
  );
};

// Working CMO Mode with all features visible
const CMOWorking: React.FC = () => {
  const [showMessage, setShowMessage] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showTour, setShowTour] = useState(false);

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Main Dashboard */}
        <SimpleDashboard />

        {/* Feature Panels */}
        <div className="fixed top-20 right-6 z-40 space-y-4">
          {showOnboarding && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80"
            >
              <h3 className="font-semibold mb-2">Welcome to CMO Mode!</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                This is your marketing command center. Let's get you started!
              </p>
              <button
                onClick={() => setShowOnboarding(false)}
                className="text-sm text-primary hover:underline"
              >
                Start Tutorial →
              </button>
            </motion.div>
          )}
          
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80"
            >
              <h3 className="font-semibold mb-2">Need Help?</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  • Click on any metric to see details
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  • Use the control buttons for quick actions
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  • Check achievements for your progress
                </p>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                Got it!
              </button>
            </motion.div>
          )}
          
          {showAchievements && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80"
            >
              <h3 className="font-semibold mb-2">Your Achievements</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="font-medium text-sm">First Campaign</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Created your first campaign!</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded opacity-50">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="font-medium text-sm">Campaign Master</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Create 10 campaigns</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAchievements(false)}
                className="mt-3 text-sm text-primary hover:underline"
              >
                View All →
              </button>
            </motion.div>
          )}
          
          {showTour && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-80"
            >
              <h3 className="font-semibold mb-2">Guided Tour</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Let me show you around the CMO dashboard!
              </p>
              <div className="space-y-2">
                <button className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm">
                  1. Dashboard Overview
                </button>
                <button className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm">
                  2. Creating Campaigns
                </button>
                <button className="w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm">
                  3. Analytics & Reports
                </button>
              </div>
              <button
                onClick={() => setShowTour(false)}
                className="mt-3 text-sm text-red-600 hover:underline"
              >
                Skip Tour
              </button>
            </motion.div>
          )}
        </div>

        {/* Control Buttons - Always Visible */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
          <motion.button
            onClick={() => {
              setShowAchievements(!showAchievements);
              setShowHelp(false);
              setShowTour(false);
              setShowOnboarding(false);
            }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View achievements"
          >
            <Trophy className="w-5 h-5 text-yellow-500" />
          </motion.button>
          
          <motion.button
            onClick={() => {
              setShowHelp(!showHelp);
              setShowAchievements(false);
              setShowTour(false);
              setShowOnboarding(false);
            }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Get help"
          >
            <HelpCircle className="w-5 h-5 text-blue-500" />
          </motion.button>
          
          <motion.button
            onClick={() => {
              setShowTour(!showTour);
              setShowHelp(false);
              setShowAchievements(false);
              setShowOnboarding(false);
            }}
            className="bg-teal-500 text-white shadow-lg rounded-full p-3 hover:scale-105 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Take a guided tour"
          >
            <Play className="w-5 h-5" />
          </motion.button>
          
          <motion.button
            onClick={() => {
              setShowOnboarding(!showOnboarding);
              setShowHelp(false);
              setShowAchievements(false);
              setShowTour(false);
            }}
            className="bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="View onboarding"
          >
            <Sparkles className="w-5 h-5 text-purple-500" />
          </motion.button>
        </div>

        {/* Simple message display */}
        {showMessage && (
          <div className="fixed top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm">
            <p className="text-sm">{showMessage}</p>
            <button
              onClick={() => setShowMessage('')}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Status Badge */}
        <div className="fixed top-4 left-4 z-30 bg-teal-500 text-white px-3 py-1 rounded-full text-xs">
          CMO Mode Active - Working Version
        </div>
      </div>
    </NotificationProvider>
  );
};

export default CMOWorking;