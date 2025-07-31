import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface UploadResult {
  success: boolean;
  dataId?: string;
  summary?: any;
  error?: string;
}

interface AnalysisResult {
  success: boolean;
  analysis?: any;
  error?: string;
}

interface ExportOptions {
  dataId: string;
  analysisType?: string;
  format: 'pdf' | 'excel' | 'json' | 'ppt';
}

export const useDataAnalysis = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<any>(null);
  const { user } = useAuth();

  // Upload file for analysis
  const uploadFile = useCallback(async (file: File, dataType: string): Promise<UploadResult> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dataType', dataType);

      const response = await fetch('/api/cmo/analysis/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setUploadedData(prev => [...prev, {
          dataId: result.dataId,
          fileName: file.name,
          dataType,
          uploadDate: new Date(),
          summary: result.summary
        }]);
      }

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  // Analyze uploaded data
  const analyzeData = useCallback(async (dataId: string, analysisType = 'comprehensive'): Promise<AnalysisResult> => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/cmo/analysis/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ dataId, analysisType })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentAnalysis(result.analysis);
      }

      return result;
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, [user]);

  // Get insights from analysis
  const getInsights = useCallback(async (dataId: string, type = 'all') => {
    try {
      const response = await fetch(`/api/cmo/analysis/insights/${dataId}?type=${type}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Get insights error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get insights'
      };
    }
  }, [user]);

  // Export analysis results
  const exportAnalysis = useCallback(async (options: ExportOptions) => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/cmo/analysis/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(options)
      });

      const result = await response.json();
      
      if (result.format === 'json') {
        // Handle JSON download
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analysis-${options.dataId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // For other formats, the backend would handle the file generation
        // This is a placeholder for when actual file generation is implemented
        console.log('Export result:', result);
      }

      return result;
    } catch (error) {
      console.error('Export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    } finally {
      setIsExporting(false);
    }
  }, [user]);

  // Get recommendations
  const getRecommendations = useCallback(async (dataId: string, priority = 'all') => {
    try {
      const response = await fetch(`/api/cmo/analysis/recommendations/${dataId}?priority=${priority}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Get recommendations error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recommendations'
      };
    }
  }, [user]);

  // Create action plan
  const createActionPlan = useCallback(async (dataId: string, selectedRecommendations: string[], timeline = '30days') => {
    try {
      const response = await fetch('/api/cmo/analysis/action-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          dataId,
          selectedRecommendations,
          timeline
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Create action plan error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create action plan'
      };
    }
  }, [user]);

  // Compare datasets
  const compareDatasets = useCallback(async (dataIds: string[], metrics?: string[]) => {
    try {
      const response = await fetch('/api/cmo/analysis/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ dataIds, metrics })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Compare error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Comparison failed'
      };
    }
  }, [user]);

  // Get available data
  const getAvailableData = useCallback(async () => {
    try {
      const response = await fetch('/api/cmo/analysis/data', {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setUploadedData(result.data);
      }
      
      return result;
    } catch (error) {
      console.error('Get data error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get data'
      };
    }
  }, [user]);

  return {
    // State
    isUploading,
    isAnalyzing,
    isExporting,
    uploadedData,
    currentAnalysis,

    // Methods
    uploadFile,
    analyzeData,
    getInsights,
    exportAnalysis,
    getRecommendations,
    createActionPlan,
    compareDatasets,
    getAvailableData
  };
};