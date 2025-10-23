import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../utils/api';

export interface CreditInfo {
  available_credits: number;
  plan_type: string;
  is_organization_pool: boolean;
  next_reset_date?: string;
  role?: string;
  lastUpdated?: number;
  is_super_admin?: boolean;
  has_unlimited_credits?: boolean;
  monthly_allocation?: number;
}

export const useCredits = () => {
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(true); // Start with true for initial load
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchCredits = useCallback(async (isInitialLoad = false) => {
    try {
      // Only set loading state on initial load, not during polling/updates
      if (isInitialLoad && !hasLoadedOnce) {
        setLoading(true);
      }
      setError(null);
      
      const userId = localStorage.getItem('userId') || '59b70373-ba68-4d89-8420-5c3723aef01f';
      const url = buildApiUrl('credits/balance');
      
      const response = await fetch(url, {
        headers: {
          'x-user-id': userId,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        const newCreditInfo = {
          available_credits: data.data.available_credits,
          plan_type: data.data.plan_type || 'agent',
          is_organization_pool: data.data.is_organization_pool || false,
          next_reset_date: data.data.next_reset_date,
          role: data.data.role,
          lastUpdated: Date.now(),
          is_super_admin: data.data.is_super_admin || false,
          has_unlimited_credits: data.data.has_unlimited_credits || false,
          monthly_allocation: data.data.monthly_allocation
        };
        setCreditInfo(newCreditInfo);
        
        // Store role in localStorage for other components to use
        if (data.data.role) {
          localStorage.setItem('userRole', data.data.role);
        }
        
        // Log for production debugging
        console.log('💳 Credits fetched:', {
          userId: userId?.substring(0, 8),
          credits: newCreditInfo.available_credits,
          role: newCreditInfo.role,
          isSuperAdmin: newCreditInfo.is_super_admin,
          hasUnlimited: newCreditInfo.has_unlimited_credits
        });
        
        // Mark as loaded after first successful fetch
        if (!hasLoadedOnce) {
          setHasLoadedOnce(true);
          setLoading(false);
        }
      } else {
        setError('Failed to fetch credits');
        if (!hasLoadedOnce) {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
      setError('Failed to fetch credits');
      if (!hasLoadedOnce) {
        setLoading(false);
      }
    }
  }, [hasLoadedOnce]);

  // Fetch on mount with initial load flag
  useEffect(() => {
    fetchCredits(true);
  }, []);

  // Set up polling - reduced to 5 seconds for near real-time updates
  // Don't pass isInitialLoad flag for polling updates
  useEffect(() => {
    const interval = setInterval(() => fetchCredits(false), 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchCredits]);

  // Listen for credit update events
  // Don't pass isInitialLoad flag for manual updates
  useEffect(() => {
    const handleCreditUpdate = () => {
      fetchCredits(false);
    };

    window.addEventListener('creditUpdate', handleCreditUpdate);
    return () => window.removeEventListener('creditUpdate', handleCreditUpdate);
  }, [fetchCredits]);

  return {
    creditInfo,
    loading,
    error,
    refetch: () => fetchCredits(false) // Manual refetch shouldn't show loading
  };
};