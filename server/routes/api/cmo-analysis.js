/**
 * CMO Data Analysis API Routes
 * Handles file upload, data processing, and analysis workflows
 */

import express from 'express';
import DataAnalysisService from '../../services/cmo/DataAnalysisService.js';

const router = express.Router();
const dataAnalysisService = new DataAnalysisService();

/**
 * Upload CSV data as text
 * POST /api/cmo/analysis/upload-text
 */
router.post('/upload-text', async (req, res) => {
  try {
    const { csvData, dataType = 'custom', fileName = 'data.csv' } = req.body;
    
    if (!csvData) {
      return res.status(400).json({
        success: false,
        error: 'No CSV data provided'
      });
    }

    // Create a mock file object
    const mockFile = {
      originalname: fileName,
      buffer: Buffer.from(csvData, 'utf8')
    };
    
    // Process the uploaded file
    const result = await dataAnalysisService.processFile(mockFile, dataType);
    
    res.json(result);
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process file'
    });
  }
});

/**
 * Upload JSON data
 * POST /api/cmo/analysis/upload-json
 */
router.post('/upload-json', async (req, res) => {
  try {
    const { jsonData, dataType = 'custom', fileName = 'data.json' } = req.body;
    
    if (!jsonData) {
      return res.status(400).json({
        success: false,
        error: 'No JSON data provided'
      });
    }

    // Create a mock file object
    const mockFile = {
      originalname: fileName,
      buffer: Buffer.from(JSON.stringify(jsonData), 'utf8')
    };
    
    // Process the uploaded file
    const result = await dataAnalysisService.processFile(mockFile, dataType);
    
    res.json(result);
  } catch (error) {
    console.error('JSON upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process JSON data'
    });
  }
});

/**
 * Perform analysis on uploaded data
 * POST /api/cmo/analysis/analyze
 */
router.post('/analyze', async (req, res) => {
  try {
    const { dataId, analysisType = 'comprehensive' } = req.body;
    
    if (!dataId) {
      return res.status(400).json({
        success: false,
        error: 'Data ID is required'
      });
    }
    
    const analysis = await dataAnalysisService.analyzeData(dataId, analysisType);
    
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze data'
    });
  }
});

/**
 * Get specific analysis insights
 * GET /api/cmo/analysis/insights/:dataId
 */
router.get('/insights/:dataId', async (req, res) => {
  try {
    const { dataId } = req.params;
    const { type = 'all' } = req.query;
    
    // Get cached analysis results
    const analysisKey = `${dataId}-comprehensive`;
    const cachedAnalysis = dataAnalysisService.analysisResults.get(analysisKey);
    
    if (!cachedAnalysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found. Please run analysis first.'
      });
    }
    
    let insights = {};
    
    switch (type) {
      case 'performance':
        insights = cachedAnalysis.analysis.performance;
        break;
      case 'trends':
        insights = cachedAnalysis.analysis.trends;
        break;
      case 'comparison':
        insights = cachedAnalysis.analysis.comparison;
        break;
      case 'forecast':
        insights = cachedAnalysis.analysis.forecast;
        break;
      default:
        insights = cachedAnalysis.analysis;
    }
    
    res.json({
      success: true,
      insights,
      timestamp: cachedAnalysis.timestamp
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve insights'
    });
  }
});

/**
 * Export analysis results
 * POST /api/cmo/analysis/export
 */
router.post('/export', async (req, res) => {
  try {
    const { dataId, analysisType = 'comprehensive', format = 'pdf' } = req.body;
    
    if (!dataId) {
      return res.status(400).json({
        success: false,
        error: 'Data ID is required'
      });
    }
    
    const exportData = await dataAnalysisService.exportAnalysis(dataId, analysisType, format);
    
    // Set appropriate headers based on format
    switch (format) {
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=analysis-report.pdf');
        break;
      case 'excel':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=analysis-report.xlsx');
        break;
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=analysis-report.json');
        break;
      case 'ppt':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader('Content-Disposition', 'attachment; filename=analysis-report.pptx');
        break;
    }
    
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export analysis'
    });
  }
});

/**
 * Get available data for analysis
 * GET /api/cmo/analysis/data
 */
router.get('/data', async (req, res) => {
  try {
    const availableData = [];
    
    // Get all cached data
    for (const [dataId, data] of dataAnalysisService.dataCache) {
      availableData.push({
        dataId,
        fileName: data.originalName,
        dataType: data.dataType,
        uploadDate: data.uploadDate,
        recordCount: data.processedData.length || 0,
        summary: data.summary
      });
    }
    
    res.json({
      success: true,
      data: availableData
    });
  } catch (error) {
    console.error('Data retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve data'
    });
  }
});

/**
 * Compare multiple datasets
 * POST /api/cmo/analysis/compare
 */
router.post('/compare', async (req, res) => {
  try {
    const { dataIds, metrics } = req.body;
    
    if (!dataIds || dataIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least two data IDs are required for comparison'
      });
    }
    
    const comparisonResults = {
      datasets: [],
      comparison: {}
    };
    
    // Get data for each ID
    for (const dataId of dataIds) {
      const cachedData = dataAnalysisService.dataCache.get(dataId);
      if (cachedData) {
        comparisonResults.datasets.push({
          dataId,
          name: cachedData.originalName,
          data: cachedData.processedData
        });
      }
    }
    
    // Perform comparison analysis
    if (comparisonResults.datasets.length >= 2) {
      const metricsToCompare = metrics || dataAnalysisService.getNumericColumns(comparisonResults.datasets[0].data);
      
      metricsToCompare.forEach(metric => {
        comparisonResults.comparison[metric] = {
          values: comparisonResults.datasets.map(dataset => ({
            name: dataset.name,
            value: dataAnalysisService.average(dataset.data.map(d => d[metric] || 0))
          })),
          variance: 0,
          leader: ''
        };
        
        // Calculate variance and identify leader
        const values = comparisonResults.comparison[metric].values.map(v => v.value);
        const avg = dataAnalysisService.average(values);
        comparisonResults.comparison[metric].variance = 
          Math.sqrt(dataAnalysisService.average(values.map(v => Math.pow(v - avg, 2))));
        
        const maxValue = Math.max(...values);
        const leader = comparisonResults.comparison[metric].values.find(v => v.value === maxValue);
        comparisonResults.comparison[metric].leader = leader.name;
      });
    }
    
    res.json({
      success: true,
      comparison: comparisonResults
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to compare datasets'
    });
  }
});

/**
 * Get recommended actions based on analysis
 * GET /api/cmo/analysis/recommendations/:dataId
 */
router.get('/recommendations/:dataId', async (req, res) => {
  try {
    const { dataId } = req.params;
    const { priority = 'all' } = req.query;
    
    // Get cached analysis
    const analysisKey = `${dataId}-comprehensive`;
    const cachedAnalysis = dataAnalysisService.analysisResults.get(analysisKey);
    
    if (!cachedAnalysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found. Please run analysis first.'
      });
    }
    
    let recommendations = cachedAnalysis.analysis.performance?.recommendations || [];
    
    // Filter by priority if specified
    if (priority !== 'all') {
      recommendations = recommendations.filter(rec => 
        rec.priority === priority || rec.impact === priority
      );
    }
    
    // Add implementation timeline
    recommendations = recommendations.map(rec => ({
      ...rec,
      timeline: {
        immediate: rec.actions.slice(0, 1),
        shortTerm: rec.actions.slice(1, 3),
        longTerm: rec.actions.slice(3)
      },
      estimatedImpact: {
        timeToResult: '2-4 weeks',
        expectedImprovement: '10-20%',
        confidence: 'High'
      }
    }));
    
    res.json({
      success: true,
      recommendations,
      totalCount: recommendations.length
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve recommendations'
    });
  }
});

/**
 * Create action plan from analysis
 * POST /api/cmo/analysis/action-plan
 */
router.post('/action-plan', async (req, res) => {
  try {
    const { dataId, selectedRecommendations, timeline = '30days' } = req.body;
    
    if (!dataId || !selectedRecommendations) {
      return res.status(400).json({
        success: false,
        error: 'Data ID and selected recommendations are required'
      });
    }
    
    // Get analysis results
    const analysisKey = `${dataId}-comprehensive`;
    const cachedAnalysis = dataAnalysisService.analysisResults.get(analysisKey);
    
    if (!cachedAnalysis) {
      return res.status(404).json({
        success: false,
        error: 'Analysis not found'
      });
    }
    
    // Create action plan
    const actionPlan = {
      title: 'Marketing Performance Improvement Plan',
      createdDate: new Date(),
      timeline,
      objectives: [],
      milestones: [],
      kpis: [],
      actions: []
    };
    
    // Build action plan from selected recommendations
    selectedRecommendations.forEach((recId, index) => {
      const recommendation = cachedAnalysis.analysis.performance?.recommendations?.find(
        r => r.title === recId || r.id === recId
      );
      
      if (recommendation) {
        actionPlan.objectives.push({
          id: `obj-${index + 1}`,
          title: recommendation.title,
          priority: recommendation.priority || 'medium',
          status: 'pending'
        });
        
        recommendation.actions.forEach((action, actionIndex) => {
          actionPlan.actions.push({
            id: `action-${index + 1}-${actionIndex + 1}`,
            objectiveId: `obj-${index + 1}`,
            description: action,
            dueDate: this.calculateDueDate(timeline, actionIndex),
            assignee: 'TBD',
            status: 'not_started'
          });
        });
      }
    });
    
    // Add KPIs
    const metrics = cachedAnalysis.analysis.performance?.metrics || {};
    Object.entries(metrics).slice(0, 5).forEach(([metric, value]) => {
      actionPlan.kpis.push({
        metric,
        currentValue: value,
        targetValue: value * 1.2, // 20% improvement target
        measurementFrequency: 'weekly'
      });
    });
    
    // Add milestones
    actionPlan.milestones = [
      {
        title: 'Initial Implementation',
        date: this.calculateDueDate(timeline, 0, 7),
        description: 'Complete setup and begin execution'
      },
      {
        title: 'Mid-point Review',
        date: this.calculateDueDate(timeline, 0, 15),
        description: 'Assess progress and adjust strategies'
      },
      {
        title: 'Final Evaluation',
        date: this.calculateDueDate(timeline, 0, 30),
        description: 'Measure results and plan next steps'
      }
    ];
    
    res.json({
      success: true,
      actionPlan
    });
  } catch (error) {
    console.error('Action plan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create action plan'
    });
  }
});

/**
 * Helper function to calculate due dates
 */
function calculateDueDate(timeline, actionIndex, daysToAdd = null) {
  const baseDate = new Date();
  let days = daysToAdd;
  
  if (days === null) {
    // Calculate based on timeline and action index
    const totalDays = timeline === '7days' ? 7 : timeline === '30days' ? 30 : 90;
    days = Math.floor((actionIndex + 1) * (totalDays / 3));
  }
  
  baseDate.setDate(baseDate.getDate() + days);
  return baseDate;
}

// Bind helper function to router context
router.calculateDueDate = calculateDueDate;

export default router;