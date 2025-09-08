/**
 * Direct Mail Agent API Route
 * Processes consultations through multi-agent system (GPT-5 + Claude Opus 4.1)
 */

import express from 'express';
import { directMailOrchestrator } from '../services/agents/specialized/DirectMailOrchestrator.js';
import { cmoAssistant } from '../services/cmo/CMOAssistant.js';

const router = express.Router();

/**
 * POST /api/direct-mail-agent/process
 * Process consultation through specialized agents and return to Tala
 */
router.post('/process', async (req, res) => {
  console.log('🚀 Direct Mail Agent: Processing consultation request');
  
  try {
    const { consultationData, brandId, mode } = req.body;
    
    if (!consultationData || !brandId) {
      return res.status(400).json({
        error: 'Missing required fields: consultationData and brandId'
      });
    }
    
    // Process through multi-agent system
    const result = await directMailOrchestrator.processConsultation(
      consultationData,
      brandId
    );
    
    if (!result.success) {
      console.error('❌ Multi-agent processing failed:', result.error);
      return res.status(500).json({
        error: 'Failed to process consultation',
        details: result.error
      });
    }
    
    // Now send the formatted message to Tala
    const talaResponse = await cmoAssistant.processMessage(
      result.talaMessage,
      brandId,
      {
        mode: 'marketing',
        subMode: 'direct_mail_strategy',
        context: {
          strategy: result.strategy,
          metadata: result.metadata
        }
      }
    );
    
    console.log('✅ Direct Mail Agent: Successfully processed and sent to Tala');
    
    res.json({
      success: true,
      response: talaResponse.response,
      strategy: result.strategy,
      metadata: result.metadata,
      conversationId: talaResponse.conversationId
    });
    
  } catch (error) {
    console.error('❌ Direct Mail Agent Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/direct-mail-agent/analyze
 * Get analysis only (GPT-5)
 */
router.post('/analyze', async (req, res) => {
  try {
    const { consultationData } = req.body;
    
    if (!consultationData) {
      return res.status(400).json({
        error: 'Missing consultationData'
      });
    }
    
    const { directMailAnalyzer } = await import('../services/agents/specialized/DirectMailAnalyzer.js');
    const result = await directMailAnalyzer.analyzeConsultation(consultationData);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Analysis Error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

/**
 * POST /api/direct-mail-agent/copywrite
 * Get copy only (Claude Opus 4.1)
 */
router.post('/copywrite', async (req, res) => {
  try {
    const { consultationData, analysisData } = req.body;
    
    if (!consultationData) {
      return res.status(400).json({
        error: 'Missing consultationData'
      });
    }
    
    const { postcardCopywriter } = await import('../services/agents/specialized/PostcardCopywriter.js');
    const result = await postcardCopywriter.generateCopy(consultationData, analysisData);
    
    res.json(result);
    
  } catch (error) {
    console.error('❌ Copywriting Error:', error);
    res.status(500).json({
      error: 'Copywriting failed',
      message: error.message
    });
  }
});

/**
 * POST /api/direct-mail-agent/analyze-postcards
 * Generate postcard-specific analysis for multiple sizes
 */
router.post('/analyze-postcards', async (req, res) => {
  console.log('📐 Direct Mail Agent: Generating postcard analysis');
  
  try {
    const { consultationData, campaignId, sizes } = req.body;
    
    if (!consultationData || !campaignId) {
      return res.status(400).json({
        error: 'Missing required fields: consultationData and campaignId'
      });
    }
    
    const analysisResult = await directMailOrchestrator.generatePostcardAnalysis(
      consultationData,
      sizes || ['4x6', '6x9', '6x11']
    );
    
    console.log('✅ Direct Mail Agent: Postcard analysis complete');
    
    res.json(analysisResult);
    
  } catch (error) {
    console.error('❌ Postcard Analysis Error:', error);
    res.status(500).json({
      error: 'Postcard analysis failed',
      message: error.message
    });
  }
});

export default router;