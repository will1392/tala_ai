# CMO Pipeline Architecture Migration Guide

## Overview

This guide helps you migrate from the original CMO Assistant to the new pipeline architecture that properly routes queries to specialized agents like DirectMailAgent.

## Architecture Benefits

The new pipeline architecture provides:

1. **Clear Ownership**: Each stage owns its transformation
2. **No Silent Failures**: Stages pass through instead of returning null
3. **Self-Registering Agents**: No manual registration needed
4. **Better Debugging**: Clear pipeline flow with stage-by-stage logging
5. **Extensibility**: Easy to add new agents and stages

## Quick Start

### Option 1: Drop-in Replacement (Zero Code Changes)

Replace your CMOAssistant import with the compatibility wrapper:

```javascript
// Old:
import { cmoAssistant } from './services/cmo/CMOAssistant.js';

// New (no other code changes needed):
import { cmoAssistant } from './services/cmo/migration/CMOCompatibilityWrapper.js';
```

### Option 2: Gradual Migration

Use the migration system to test both versions:

```javascript
import cmoMigration from './services/cmo/migration/CMOMigration.js';

// Set migration mode
await cmoMigration.setMode('migration'); // Uses rules to decide V1 vs V2

// Process messages
const response = await cmoMigration.processMessage(message, userId, options);
```

### Option 3: Full Migration to V2

Use the new CMOAssistantV2 directly:

```javascript
import cmoAssistantV2 from './services/cmo/CMOAssistantV2.js';

// Process messages with new API
const response = await cmoAssistantV2.processMessage(message, userId, options);
```

## Migration Steps

### 1. Test Current System

```bash
# Run the test to verify DirectMailAgent works
node server/services/cmo/tests/testDirectMailPipeline.js
```

### 2. Validate Migration

```bash
# Run migration validation
node server/services/cmo/migration/runMigration.js validate
```

### 3. Compare Versions

```bash
# Compare V1 and V2 responses
node server/services/cmo/migration/runMigration.js compare
```

### 4. Enable Gradual Rollout

Set environment variables:

```bash
# Start with 10% of traffic to V2
export CMO_V2_ROLLOUT_PERCENTAGE=10

# Gradually increase as confidence grows
export CMO_V2_ROLLOUT_PERCENTAGE=25
export CMO_V2_ROLLOUT_PERCENTAGE=50
export CMO_V2_ROLLOUT_PERCENTAGE=100
```

### 5. Monitor Metrics

```javascript
// Get migration metrics
const metrics = cmoMigration.getMetrics();
console.log('V2 Usage:', metrics.v2Percentage + '%');
console.log('Error Rate:', metrics.errorRate + '%');
```

## Adding New Agents

Create a new agent with self-registration:

```javascript
// services/cmo/agents/specialized/EmailAgent.js
import { registerAgent } from '../AgentRegistry.js';

export class EmailAgent {
  static metadata = {
    channel: 'email',
    triggers: [/email campaign/i, /newsletter/i],
    confidence: (message, context) => {
      // Return 0-1 confidence score
    }
  };

  async execute(input) {
    // Agent logic
    return {
      status: 'success',
      content: { text: '...', structured: {...} }
    };
  }
}

// Self-register
registerAgent(EmailAgent);
```

## Troubleshooting

### DirectMailAgent Not Being Called

1. Check agent registration:
```javascript
const agents = agentRegistry.listAgents();
console.log('Registered agents:', agents);
```

2. Check detection:
```javascript
// Enable debug logging
const response = await cmoAssistantV2.processMessage(message, userId, {
  debug: true
});
```

3. Force direct_mail routing:
```javascript
const response = await cmoAssistantV2.processMessage(message, userId, {
  subMode: 'direct_mail',
  detectedChannel: 'direct_mail'
});
```

### Generic Responses Instead of Agent Content

This usually means the agent isn't being called. Check:

1. **Import Issues**: Ensure DirectMailAgent is imported during initialization
2. **Channel Detection**: Verify the detected channel matches the agent
3. **Confidence Threshold**: Check if confidence is too low

### Performance Issues

Monitor pipeline metrics:

```javascript
const metrics = cmoAssistantV2.getMetrics();
console.log('Pipeline metrics:', metrics.pipeline);
console.log('Slow stages:', metrics.pipeline.stageStats);
```

## Environment Variables

```bash
# Migration mode (v1, v2, dual, migration)
CMO_MODE=migration

# V2 rollout percentage (0-100)
CMO_V2_ROLLOUT_PERCENTAGE=50

# Use V2 by default
CMO_USE_V2=true
```

## Integration Examples

### Express Route

```javascript
app.post('/api/chat/intelligent', async (req, res) => {
  const { message, conversationId } = req.body;
  const userId = req.user?.id || 'anonymous';
  
  try {
    // Use compatibility wrapper
    const response = await cmoAssistant.processMessage(
      message,
      userId,
      { conversationId }
    );
    
    res.json({ success: true, response });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Testing in Development

```javascript
// Force V2 for testing
process.env.CMO_MODE = 'v2';

// Or use dual mode to compare
process.env.CMO_MODE = 'dual';
```

## Rollback Plan

If issues arise, rollback is simple:

1. **Immediate**: Change import back to original CMOAssistant
2. **Gradual**: Set `CMO_V2_ROLLOUT_PERCENTAGE=0`
3. **Mode Switch**: Set `CMO_MODE=v1`

## Success Metrics

Monitor these metrics to ensure successful migration:

- ✅ DirectMailAgent invocation rate increases
- ✅ Response quality improves (more specific, travel-focused)
- ✅ Error rate remains low (<1%)
- ✅ Performance stays consistent or improves
- ✅ User satisfaction metrics improve

## Next Steps

1. Run tests to verify DirectMailAgent works
2. Deploy with compatibility wrapper (no code changes)
3. Monitor metrics and gradually increase V2 usage
4. Once stable, migrate to V2 API directly
5. Add more specialized agents as needed