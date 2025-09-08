/**
 * Pipeline Stages Index
 * 
 * Exports all available pipeline stages for easy importing
 */

export { DetectionStage } from './DetectionStage.js';
export { SpecializedStage } from './SpecializedStage.js';
export { KnowledgeBaseStage } from './KnowledgeBaseStage.js';
export { EnhancementStage } from './EnhancementStage.js';
export { AdaptationStage } from './AdaptationStage.js';

// Re-export base stage classes
export { Stage, ConditionalStage, TransformStage, ParallelStage, CacheStage } from '../Stage.js';

// Export stage factory for convenience
export const createStages = {
  detection: (contextDetector, expertiseProfiles, options) => 
    new (require('./DetectionStage.js').DetectionStage)(contextDetector, expertiseProfiles, options),
    
  specialized: (options) => 
    new (require('./SpecializedStage.js').SpecializedStage)(options),
    
  knowledgeBase: (knowledgeBase, options) => 
    new (require('./KnowledgeBaseStage.js').KnowledgeBaseStage)(knowledgeBase, options),
    
  enhancement: (responseEnhancer, options) => 
    new (require('./EnhancementStage.js').EnhancementStage)(responseEnhancer, options),
    
  adaptation: (communicationAdapter, expertiseProfiles, options) => 
    new (require('./AdaptationStage.js').AdaptationStage)(communicationAdapter, expertiseProfiles, options)
};