/**
 * Coordination Module - Multi-agent coordination components
 * 
 * Exports all coordination classes for managing complex multi-agent workflows
 */

export { TaskDecomposer } from './TaskDecomposer.js';
export { ParallelExecutor } from './ParallelExecutor.js';
export { ResultAggregator } from './ResultAggregator.js';
export { ConflictResolver } from './ConflictResolver.js';

export {
  CoordinationStrategy,
  HierarchicalCoordinationStrategy,
  PipelineCoordinationStrategy,
  ConsensusCoordinationStrategy,
  AdaptiveCoordinationStrategy
} from './CoordinationStrategy.js';

// Re-export as default for convenience
import TaskDecomposer from './TaskDecomposer.js';
import ParallelExecutor from './ParallelExecutor.js';
import ResultAggregator from './ResultAggregator.js';
import ConflictResolver from './ConflictResolver.js';
import CoordinationStrategies from './CoordinationStrategy.js';

export default {
  TaskDecomposer,
  ParallelExecutor,
  ResultAggregator,
  ConflictResolver,
  ...CoordinationStrategies
};