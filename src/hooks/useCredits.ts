import { useState, useEffect, useCallback } from 'react';

interface CreditInfo {
  available_credits: number;
  plan_type: string;
  is_organization_pool: boolean;
}

export const useCredits = () => {
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = localStorage.getItem('userId') || '59b70373-ba68-4d89-8420-5c3723aef01f';
      
      const response = await fetch('/api/credits/balance', {
        headers: {
          'x-user-id': userId
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        setCreditInfo({
          available_credits: data.data.available_credits,
          plan_type: data.data.plan_type || 'agent',
          is_organization_pool: data.data.is_organization_pool || false
        });
      } else {
        setError('Failed to fetch credits');
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
      setError('Failed to fetch credits');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Set up polling
  useEffect(() => {
    const interval = setInterval(fetchCredits, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchCredits]);

  // Listen for credit update events
  useEffect(() => {
    const handleCreditUpdate = () => {
      console.log('📊 Credit update event received, fetching new balance...');
      fetchCredits();
    };

    window.addEventListener('creditUpdate', handleCreditUpdate);
    return () => window.removeEventListener('creditUpdate', handleCreditUpdate);
  }, [fetchCredits]);

  return {
    creditInfo,
    loading,
    error,
    refetch: fetchCredits
  };
};