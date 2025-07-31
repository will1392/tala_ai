import { useState, useEffect, useCallback } from 'react';
import { useMode } from './useMode';
import type { CMOSubMode } from './useMode';
import toast from 'react-hot-toast';

interface ContextAnalysis {
  primaryContext: string | null;
  confidence: number;
  subContexts: Array<{ context: string; score: number }>;
  entities: Array<{ value: string; type: string }>;
  intent: string | null;
  suggestedTools: string[];
}

interface SwitchRecommendation {
  targetSubMode: CMOSubMode;
  confidence: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  type: 'auto' | 'suggest';
  reason: string;
  suggestedTools: string[];
  autoSwitch?: boolean;
}

interface ContextAwareResponse {
  contextAnalysis: ContextAnalysis;
  switchRecommendation: SwitchRecommendation | null;
  enhancedResponse: {
    contextualTips: string[];
    relevantMetrics: string[];
    suggestedActions: string[];
    tools: string[];
  } | null;
}

export const useContextAwareMode = () => {
  const { mode, subMode, switchMode, updateSubMode } = useMode();
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true);
  const [pendingSwitch, setPendingSwitch] = useState<SwitchRecommendation | null>(null);
  const [contextInsights, setContextInsights] = useState<any>(null);

  // Process message for context detection
  const processMessageContext = useCallback(async (message: string): Promise<ContextAwareResponse | null> => {
    if (mode !== 'cmo') {
      return null;
    }

    try {
      const response = await fetch('/api/cmo/context/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          currentMode: mode,
          currentSubMode: subMode,
          autoSwitchEnabled
        })
      });

      if (!response.ok) {
        console.error('Failed to analyze context');
        return null;
      }

      const data: ContextAwareResponse = await response.json();

      // Handle switch recommendation
      if (data.switchRecommendation) {
        const { targetSubMode, type, reason, autoSwitch } = data.switchRecommendation;

        if (autoSwitch && autoSwitchEnabled) {
          // Auto-switch with notification
          updateSubMode(targetSubMode);
          toast.success(
            `Switched to ${getSubModeLabel(targetSubMode)} mode\n${reason}`,
            {
              duration: 4000,
              style: {
                background: '#1f2937',
                color: 'white',
                border: '1px solid #374151'
              }
            }
          );
        } else if (type === 'suggest') {
          // Show suggestion toast
          setPendingSwitch(data.switchRecommendation);
          toast.custom(
            (t) => (
              <div className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                <div className="flex-1 w-0 p-4">
                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-white">Switch to {getSubModeLabel(targetSubMode)} mode?</p>
                    <p className="text-sm text-gray-300">{reason}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          updateSubMode(targetSubMode);
                          setPendingSwitch(null);
                          toast.dismiss(t.id);
                          toast.success(`Switched to ${getSubModeLabel(targetSubMode)} mode`);
                        }}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
                      >
                        Switch
                      </button>
                      <button
                        onClick={() => {
                          setPendingSwitch(null);
                          toast.dismiss(t.id);
                        }}
                        className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500"
                      >
                        Stay
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ),
            {
              duration: 10000
            }
          );
        }
      }

      return data;
    } catch (error) {
      console.error('Error processing message context:', error);
      return null;
    }
  }, [mode, subMode, autoSwitchEnabled, updateSubMode]);

  // Get context insights
  const fetchContextInsights = useCallback(async () => {
    try {
      const response = await fetch('/api/cmo/context/insights');
      if (response.ok) {
        const insights = await response.json();
        setContextInsights(insights);
      }
    } catch (error) {
      console.error('Error fetching context insights:', error);
    }
  }, []);

  // Clear context history
  const clearContextHistory = useCallback(async () => {
    try {
      await fetch('/api/cmo/context/clear', { method: 'POST' });
      setContextInsights(null);
      toast.success('Context history cleared');
    } catch (error) {
      console.error('Error clearing context history:', error);
    }
  }, []);

  // Helper function to get sub-mode label
  const getSubModeLabel = (subMode: CMOSubMode): string => {
    const labels: Record<CMOSubMode, string> = {
      all: 'All Marketing',
      seo: 'SEO',
      email: 'Email Marketing',
      social: 'Social Media',
      directMail: 'Direct Mail',
      ads: 'Paid Advertising'
    };
    return labels[subMode];
  };

  // Accept pending switch
  const acceptPendingSwitch = useCallback(() => {
    if (pendingSwitch) {
      updateSubMode(pendingSwitch.targetSubMode);
      setPendingSwitch(null);
      toast.success(`Switched to ${getSubModeLabel(pendingSwitch.targetSubMode)} mode`);
    }
  }, [pendingSwitch, updateSubMode]);

  // Reject pending switch
  const rejectPendingSwitch = useCallback(() => {
    setPendingSwitch(null);
  }, []);

  useEffect(() => {
    // Fetch initial insights when in CMO mode
    if (mode === 'cmo') {
      fetchContextInsights();
    }
  }, [mode, fetchContextInsights]);

  return {
    processMessageContext,
    autoSwitchEnabled,
    setAutoSwitchEnabled,
    pendingSwitch,
    acceptPendingSwitch,
    rejectPendingSwitch,
    contextInsights,
    fetchContextInsights,
    clearContextHistory
  };
};