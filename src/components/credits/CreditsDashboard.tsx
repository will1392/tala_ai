import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  TrendingUp, 
  Package, 
  Clock, 
  AlertTriangle,
  Check,
  Zap,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreditStatus {
  credits: {
    user_id: string;
    balance: number;
    monthly_allocation: number;
    tier: 'free' | 'premium' | 'enterprise' | 'payAsYouGo';
    daily_usage: number;
    daily_limit: number;
    monthly_usage: number;
    last_reset: string;
    created_at: string;
    updated_at: string;
  };
  usage: {
    totalOperations: number;
    totalCreditsUsed: number;
    periodStart: string;
    periodEnd: string;
    byOperation: Record<string, { count: number; credits: number }>;
    dailyUsage: Array<{ date: string; credits: number }>;
  };
  costs: Record<string, number>;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  bonus?: number;
  popular?: boolean;
}

const TIER_BENEFITS = {
  free: {
    name: 'Free',
    monthlyCredits: 100,
    dailyLimit: 10,
    features: ['Basic chat', 'Limited documents', 'Standard support'],
    color: 'text-gray-600',
    bgColor: 'bg-gray-50'
  },
  agent: {
    name: 'Agent',
    monthlyCredits: 5000,
    dailyLimit: 100,
    features: ['Full access to all features', 'Priority support', 'Unlimited documents', 'Advanced AI models'],
    color: 'text-[var(--primary)]',
    bgColor: 'bg-[var(--primary)]/10'
  },
  premium: {
    name: 'Premium',
    monthlyCredits: 1000,
    dailyLimit: 100,
    features: ['Advanced AI models', 'Unlimited documents', 'Priority support', 'Custom integrations'],
    color: 'text-[var(--primary)]',
    bgColor: 'bg-[var(--primary)]/10'
  },
  enterprise: {
    name: 'Enterprise',
    monthlyCredits: 10000,
    dailyLimit: 1000,
    features: ['All premium features', 'Dedicated support', 'Custom models', 'SLA guarantee'],
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  agency: {
    name: 'Agency',
    monthlyCredits: 25000,
    dailyLimit: 1000,
    features: ['All enterprise features', 'Multi-user support', 'Shared credit pool', 'Custom branding'],
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50'
  },
  payAsYouGo: {
    name: 'Pay As You Go',
    monthlyCredits: 0,
    dailyLimit: null,
    features: ['Flexible pricing', 'No monthly commitment', 'All features available'],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  }
};

export default function CreditsDashboard() {
  const [creditStatus, setCreditStatus] = useState<CreditStatus | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'usage' | 'purchase' | 'upgrade'>('overview');
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    fetchCreditStatus();
    fetchPackages();
  }, []);

  const fetchCreditStatus = async () => {
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
          const monthlyAllocation = data.data.monthly_allocation || data.data.total_credits || 0;
          const availableCredits = data.data.available_credits || 0;
          setCreditStatus({
            credits: {
              user_id: userId,
              balance: availableCredits,
              monthly_allocation: monthlyAllocation,
              tier: data.data.plan_type || 'agent',
              daily_usage: 0,
              daily_limit: 100,
              monthly_usage: monthlyAllocation - availableCredits,
              last_reset: data.data.next_reset_date || data.data.last_reset_date || new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            usage: {
              totalOperations: 0,
              totalCreditsUsed: monthlyAllocation - availableCredits,
              periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              periodEnd: new Date().toISOString(),
              byOperation: {},
              dailyUsage: []
            },
            costs: {}
          });
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Failed to fetch credit status:', error);
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/credits/packages');
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages || [
          { id: 'starter', name: 'Starter Pack', credits: 100, price: 9.99 },
          { id: 'growth', name: 'Growth Pack', credits: 500, price: 39.99, bonus: 50, popular: true },
          { id: 'pro', name: 'Pro Pack', credits: 1200, price: 89.99, bonus: 200 },
          { id: 'enterprise', name: 'Enterprise Pack', credits: 5000, price: 349.99, bonus: 1000 }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    }
  };

  const handlePurchase = async (packageId: string) => {
    setPurchaseLoading(true);
    try {
      const response = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || 'demo-user'
        },
        body: JSON.stringify({ packageId })
      });
      
      if (response.ok) {
        await fetchCreditStatus();
        setSelectedTab('overview');
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleUpgradeTier = async (tier: string) => {
    setPurchaseLoading(true);
    try {
      const response = await fetch('/api/credits/upgrade-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || 'demo-user'
        },
        body: JSON.stringify({ tier })
      });
      
      if (response.ok) {
        await fetchCreditStatus();
        setSelectedTab('overview');
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setPurchaseLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  const credits = creditStatus?.credits;
  const usage = creditStatus?.usage;
  const currentTier = credits?.tier || 'free';
  const tierInfo = TIER_BENEFITS[currentTier];
  const usagePercentage = credits ? (credits.balance / credits.monthly_allocation) * 100 : 0;
  const isLowBalance = credits && credits.balance < credits.monthly_allocation * 0.2;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--fg)] mb-2">Credits Dashboard</h1>
        <p className="text-[var(--muted)]">Manage your API credits and usage</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--panel)] rounded-xl border border-[var(--border)] p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <CreditCard className="text-[var(--primary)]" size={20} />
            {isLowBalance && <AlertTriangle className="text-orange-500" size={16} />}
          </div>
          <div className="text-2xl font-bold text-[var(--fg)]">{(credits?.balance || 0).toLocaleString('en-US')}</div>
          <div className="text-sm text-[var(--muted)]">Available Credits</div>
          <div className="mt-2 w-full bg-[var(--border)] rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${isLowBalance ? 'bg-orange-500' : 'bg-[var(--primary)]'}`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--panel)] rounded-xl border border-[var(--border)] p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Package className={tierInfo.color} size={20} />
          </div>
          <div className="text-2xl font-bold text-[var(--fg)]">{tierInfo.name}</div>
          <div className="text-sm text-[var(--muted)]">Current Tier</div>
          <div className={`mt-2 inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${tierInfo.bgColor} ${tierInfo.color}`}>
            {(credits?.monthly_allocation || 0).toLocaleString('en-US')} credits/month
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--panel)] rounded-xl border border-[var(--border)] p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Activity className="text-green-600" size={20} />
          </div>
          <div className="text-2xl font-bold text-[var(--fg)]">{(credits?.daily_usage || 0).toLocaleString('en-US')}</div>
          <div className="text-sm text-[var(--muted)]">Used Today</div>
          <div className="mt-2 text-xs text-[var(--muted)]">
            Limit: {credits?.daily_limit || 'Unlimited'} / day
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[var(--panel)] rounded-xl border border-[var(--border)] p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="text-purple-600" size={20} />
          </div>
          <div className="text-2xl font-bold text-[var(--fg)]">
            {credits?.last_reset ? new Date(credits.last_reset).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-sm text-[var(--muted)]">Next Reset</div>
          <div className="mt-2 text-xs text-[var(--muted)]">
            Monthly allocation refresh
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] mb-6">
        <div className="flex space-x-6">
          {(['overview', 'usage', 'purchase', 'upgrade'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
                selectedTab === tab 
                  ? 'text-[var(--primary)]' 
                  : 'text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {selectedTab === tab && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {selectedTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Tier Benefits */}
            <div className="bg-[var(--panel)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold mb-4">Your {tierInfo.name} Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tierInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Check className="text-green-500 mt-0.5" size={16} />
                    <span className="text-sm text-[var(--fg)]">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[var(--panel)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {usage?.byOperation && Object.entries(usage.byOperation).slice(0, 5).map(([op, data]) => (
                  <div key={op} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <Zap className="text-[var(--primary)]" size={16} />
                      <div>
                        <div className="text-sm font-medium text-[var(--fg)]">
                          {op.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-[var(--muted)]">{data.count} operations</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-[var(--fg)]">
                      -{data.credits.toLocaleString('en-US')} credits
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {selectedTab === 'usage' && (
          <motion.div
            key="usage"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Usage Chart */}
            <div className="bg-[var(--panel)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Usage (Last 7 Days)</h3>
              <div className="h-64 flex items-end space-x-2">
                {usage?.dailyUsage?.map((day, index) => {
                  const height = (day.credits / (credits?.daily_limit || 100)) * 100;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div className="w-full bg-[var(--border)] rounded-t relative">
                        <div
                          className="bg-[var(--primary)] rounded-t transition-all"
                          style={{ height: `${Math.min(height * 2, 200)}px` }}
                        />
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-2">
                        {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                      </div>
                      <div className="text-xs font-medium text-[var(--fg)]">
                        {day.credits}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Operation Breakdown */}
            <div className="bg-[var(--panel)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold mb-4">Credits by Operation</h3>
              <div className="space-y-4">
                {usage?.byOperation && Object.entries(usage.byOperation).map(([op, data]) => {
                  const percentage = (data.credits / (usage.totalCreditsUsed || 1)) * 100;
                  return (
                    <div key={op}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-[var(--fg)]">
                          {op.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="text-sm text-[var(--muted)]">
                          {data.credits.toLocaleString('en-US')} credits ({data.count} uses)
                        </span>
                      </div>
                      <div className="w-full bg-[var(--border)] rounded-full h-2">
                        <div 
                          className="bg-[var(--primary)] h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {selectedTab === 'purchase' && (
          <motion.div
            key="purchase"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`bg-[var(--panel)] rounded-xl border ${
                  pkg.popular ? 'border-[var(--primary)] ring-2 ring-[var(--ring)]' : 'border-[var(--border)]'
                } p-6 relative`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-[var(--primary)] text-black text-xs font-bold px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  </div>
                )}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-[var(--fg)]">{pkg.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-[var(--fg)]">{pkg.credits.toLocaleString('en-US')}</span>
                    <span className="text-sm text-[var(--muted)]"> credits</span>
                  </div>
                  {pkg.bonus && (
                    <div className="mt-1 text-sm text-green-500">
                      +{pkg.bonus.toLocaleString('en-US')} bonus credits
                    </div>
                  )}
                </div>
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold text-[var(--fg)]">${pkg.price}</span>
                </div>
                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchaseLoading}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    pkg.popular
                      ? 'bg-[var(--primary)] text-black hover:bg-[var(--primary)]/90'
                      : 'bg-[var(--border)] text-[var(--fg)] hover:bg-[var(--border)]/80'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {purchaseLoading ? 'Processing...' : 'Purchase'}
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {selectedTab === 'upgrade' && (
          <motion.div
            key="upgrade"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {Object.entries(TIER_BENEFITS).map(([tier, info]) => {
              const isCurrent = tier === currentTier;
              return (
                <div
                  key={tier}
                  className={`bg-[var(--panel)] rounded-xl border ${
                    isCurrent ? 'border-[var(--primary)] ring-2 ring-[var(--ring)]' : 'border-[var(--border)]'
                  } p-6`}
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-[var(--fg)]">{info.name}</h3>
                    {isCurrent && (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] mt-2">
                        Current Plan
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <div className="text-3xl font-bold text-[var(--fg)]">
                      {info.monthlyCredits || 'Custom'}
                    </div>
                    <div className="text-sm text-[var(--muted)]">credits/month</div>
                    {info.dailyLimit && (
                      <div className="text-sm text-[var(--muted)] mt-1">
                        {info.dailyLimit} credits daily limit
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {info.features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Check className="text-green-500 mt-0.5" size={16} />
                        <span className="text-sm text-[var(--fg)]">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleUpgradeTier(tier)}
                      disabled={purchaseLoading}
                      className="w-full py-2 px-4 rounded-lg font-medium bg-[var(--primary)] text-black hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {purchaseLoading ? 'Processing...' : 'Upgrade'}
                    </button>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}