import React, { useState, useEffect } from 'react';
import { CreditCard, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface CreditsData {
  balance: number;
  monthly_allocation: number;
  tier: string;
  daily_usage: number;
  daily_limit: number;
  is_super_admin?: boolean;
  has_unlimited_credits?: boolean;
}

export default function CreditsIndicator() {
  const [credits, setCredits] = useState<CreditsData | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const navigate = useNavigate();

  const fetchCredits = async (isInitialLoad = false) => {
    try {
      const userId = localStorage.getItem('userId') || '59b70373-ba68-4d89-8420-5c3723aef01f';
      const response = await fetch('/api/credits/balance', {
        headers: {
          'x-user-id': userId,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Transform the balance API response to match the expected format
          setCredits({
            balance: data.data.available_credits || 0,
            monthly_allocation: data.data.monthly_allocation || 5000,
            tier: data.data.plan_type || 'agent',
            daily_usage: 0, // Not provided by balance endpoint
            daily_limit: 100, // Default limit
            is_super_admin: data.data.is_super_admin || false,
            has_unlimited_credits: data.data.has_unlimited_credits || false
          });
          
          // Mark as loaded after first successful fetch
          if (!hasLoadedOnce) {
            setHasLoadedOnce(true);
            setLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
      if (!hasLoadedOnce) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCredits(true);
    // Refresh credits every 5 seconds for near real-time updates
    const interval = setInterval(() => fetchCredits(false), 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for credit update events from chat
  useEffect(() => {
    const handleCreditUpdate = () => {
      fetchCredits(false);
    };

    window.addEventListener('creditUpdate', handleCreditUpdate);
    return () => window.removeEventListener('creditUpdate', handleCreditUpdate);
  }, []);

  const handleCreditClick = () => {
    navigate('/settings/billing');
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-[var(--border)] rounded-lg h-8 w-24"></div>
    );
  }

  if (!credits) return null;

  // Super admins have unlimited credits - never show warnings
  const usagePercentage = credits.has_unlimited_credits ? 100 : (credits.balance / credits.monthly_allocation) * 100;
  const isLowBalance = !credits.has_unlimited_credits && credits.balance < credits.monthly_allocation * 0.2;
  const isCritical = !credits.has_unlimited_credits && credits.balance < 10;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowDetails(!showDetails)}
        onDoubleClick={handleCreditClick}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
          isCritical 
            ? 'bg-red-500/10 border border-red-500/30 text-red-500' 
            : isLowBalance 
            ? 'bg-orange-500/10 border border-orange-500/30 text-orange-500'
            : 'bg-[var(--panel)] border border-[var(--border)] text-[var(--fg)]'
        } hover:border-[var(--primary)]/50`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center space-x-1.5">
          {isCritical ? (
            <AlertTriangle size={16} className="animate-pulse" />
          ) : isLowBalance ? (
            <AlertTriangle size={16} />
          ) : (
            <CreditCard size={16} className="text-[var(--primary)]" />
          )}
          <span className="font-medium text-sm">
            {credits.has_unlimited_credits ? '∞' : credits.balance.toLocaleString('en-US')}
          </span>
          <span className="text-xs text-[var(--muted)]">
            {credits.has_unlimited_credits ? 'unlimited' : 'credits'}
          </span>
        </div>
        
        {/* Mini progress bar */}
        <div className="w-12 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${
              isCritical ? 'bg-red-500' : isLowBalance ? 'bg-orange-500' : 'bg-[var(--primary)]'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(usagePercentage, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </motion.button>

      {/* Dropdown Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-72 bg-[var(--panel)] rounded-xl border border-[var(--border)] shadow-lg z-50"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[var(--fg)]">Credit Status</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  credits.tier === 'premium' 
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : credits.tier === 'enterprise'
                    ? 'bg-purple-500/10 text-purple-500'
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {credits.tier.toUpperCase()}
                </span>
              </div>

              {/* Balance Overview */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted)]">Available</span>
                  <span className="font-semibold text-[var(--fg)]">{credits.balance}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted)]">Monthly Allocation</span>
                  <span className="text-sm text-[var(--fg)]">{credits.monthly_allocation}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted)]">Used Today</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-[var(--fg)]">{credits.daily_usage}</span>
                    <span className="text-xs text-[var(--muted)]">/ {credits.daily_limit}</span>
                  </div>
                </div>

                {/* Visual Progress */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                    <span>Monthly Usage</span>
                    <span>{Math.round(100 - usagePercentage)}% remaining</span>
                  </div>
                  <div className="w-full bg-[var(--border)] rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        isCritical ? 'bg-red-500' : isLowBalance ? 'bg-orange-500' : 'bg-[var(--primary)]'
                      }`}
                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <button
                  onClick={handleCreditClick}
                  className="text-sm text-[var(--primary)] hover:text-[var(--primary)]/80 font-medium flex items-center space-x-1"
                >
                  <TrendingUp size={14} />
                  <span>View Details</span>
                </button>
                
                {isLowBalance && (
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      navigate('/settings/billing#purchase');
                    }}
                    className="text-sm bg-[var(--primary)] text-black px-3 py-1 rounded-lg hover:bg-[var(--primary)]/90 font-medium flex items-center space-x-1"
                  >
                    <Zap size={14} />
                    <span>Add Credits</span>
                  </button>
                )}
              </div>

              {/* Warning Message */}
              {isCritical && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-red-500">
                    Critical balance! Some features may be limited.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {showDetails && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
}