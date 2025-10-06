import { useEffect, useState } from 'react';
import type { Stage } from '../components/chat/StatusProgress';

interface StatusUpdate {
  type: 'connected' | 'status' | 'progress' | 'complete';
  status?: string;
  stage?: string;
  details?: any;
  timestamp: string;
}

interface UseStatusUpdatesReturn {
  currentStage: Stage;
  statusMessage: string;
  details: any;
  isConnected: boolean;
}

// Map backend stage names to our frontend stages
const stageMapping: Record<string, Stage> = {
  'initializing': 'initializing',
  'context': 'context',
  'search': 'searching',
  'search_complete': 'searching',
  'generating': 'generating',
  'analyzing': 'analyzing',
  'finalizing': 'generating',
  'complete': 'complete'
};

export function useStatusUpdates(
  requestId: string | undefined, 
  isProcessing: boolean
): UseStatusUpdatesReturn {
  const [currentStage, setCurrentStage] = useState<Stage>('initializing');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [details, setDetails] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!requestId || !isProcessing) {
      setIsConnected(false);
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const eventSource = new EventSource(
      `${apiUrl}/chat/status/stream/${requestId}`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: StatusUpdate = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            setIsConnected(true);
            break;
            
          case 'status':
            setStatusMessage(data.status || '');
            break;
            
          case 'progress':
            if (data.stage) {
              const mappedStage = stageMapping[data.stage] || 'initializing';
              setCurrentStage(mappedStage);
              
              // Update details based on stage
              if (data.stage === 'search_complete' && data.details) {
                setDetails(prev => ({
                  ...prev,
                  resultsFound: data.details.resultsFound,
                  topResult: data.details.topResult
                }));
              } else if (data.stage === 'generating' && data.details) {
                setDetails(prev => ({
                  ...prev,
                  model: data.details.model
                }));
              }
            }
            break;
            
          case 'complete':
            setCurrentStage('complete');
            setTimeout(() => {
              eventSource.close();
              setIsConnected(false);
            }, 1000);
            break;
        }
      } catch (error) {
        console.error('Failed to parse status update:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setIsConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [requestId, isProcessing]);

  return {
    currentStage,
    statusMessage,
    details,
    isConnected
  };
}