# Mode Integration Guide for Chat Service

This guide explains how to integrate the new mode management system into the existing chat service.

## Files Created

### 1. Mode Management Services
- **`services/modes/ModeManager.js`** - Handles mode detection, switching, and preferences
- **`services/modes/ModeContext.js`** - Manages mode-specific context data

### 2. Updated Chat Service
- **`services/chatService-updated.js`** - Enhanced chat service with mode support

## Key Features Added

### ModeManager Features
- **Auto-detection** of user intent (travel vs marketing)
- **Mode switching** with conversation history preservation
- **Sub-mode detection** for CMO (SEO, email, social, etc.)
- **User preferences** for default mode
- **Quick action logging** for analytics

### ModeContext Features
- **Context schemas** for each mode
- **Context switching** when changing modes
- **Sub-mode contexts** for specialized data
- **Data persistence** across conversations
- **Context summaries** for UI display

### ChatService Enhancements
- **Mode-aware prompts** - System prompts enhanced based on mode
- **Automatic mode detection** from user messages
- **Context preservation** across mode switches
- **Quick actions** specific to each mode/sub-mode
- **Backward compatibility** maintained

## Integration Steps

### 1. Update Chat Service

Replace the existing `chatService.js` with the enhanced version:

```bash
# Backup current service
cp server/services/chatService.js server/services/chatService-backup.js

# Replace with updated version
cp server/services/chatService-updated.js server/services/chatService.js
```

### 2. Update Chat Routes

Add mode parameters to chat endpoints:

```javascript
// In your chat route handler
app.post('/api/chat', async (req, res) => {
  const { 
    message, 
    conversationId, 
    userId,
    forceMode, // Optional: force specific mode
    detectMode = true // Optional: disable auto-detection
  } = req.body;
  
  const response = await chatService.generateResponse({
    message,
    conversationId,
    userId,
    forceMode,
    detectMode,
    // ... other options
  });
  
  // Response now includes mode information
  res.json({
    ...response,
    mode: response.mode // Contains current mode, sub-mode, detection info
  });
});
```

### 3. Add Mode Switching Endpoint

```javascript
// New endpoint for explicit mode switching
app.post('/api/conversations/:id/switch-mode', async (req, res) => {
  const { id: conversationId } = req.params;
  const { mode, subMode } = req.body;
  const userId = req.userId; // From auth
  
  const result = await modeManager.switchMode(
    userId, 
    conversationId, 
    mode, 
    subMode
  );
  
  res.json(result);
});
```

### 4. Add Mode Preferences Endpoint

```javascript
// Save user mode preferences
app.put('/api/users/mode-preferences', async (req, res) => {
  const userId = req.userId; // From auth
  const { defaultMode, modeSettings } = req.body;
  
  const result = await modeManager.saveModePreference(userId, {
    default_mode: defaultMode,
    mode_settings: modeSettings
  });
  
  res.json(result);
});
```

## Mode Detection Examples

### Automatic Detection
```javascript
// User message: "Help me improve my website's SEO"
// Detected: { mode: 'cmo', subMode: 'seo', confidence: 0.85 }

// User message: "I need to book a flight to Paris"
// Detected: { mode: 'travel', subMode: null, confidence: 0.92 }
```

### Explicit Switching
```javascript
// User message: "Switch to marketing mode"
// Result: Switches to CMO mode regardless of content

// User message: "Switch to travel mode"
// Result: Switches back to travel mode
```

## Context Management

### Travel Mode Context
```json
{
  "destination": "Paris",
  "travel_dates": {
    "start": "2024-06-15",
    "end": "2024-06-22"
  },
  "preferences": {
    "budget": "$3000",
    "accommodation_type": "hotel"
  },
  "bookings": []
}
```

### CMO Mode Context
```json
{
  "business_info": {
    "name": "Acme Corp",
    "industry": "SaaS"
  },
  "brand_voice": "Professional yet friendly",
  "sub_contexts": {
    "seo": {
      "target_keywords": ["project management", "team collaboration"]
    }
  }
}
```

## Testing Mode Features

### Test Mode Detection
```bash
# Test script to verify mode detection
node test-mode-detection.js
```

### Test Context Switching
```bash
# Test context preservation during mode switches
node test-context-switching.js
```

## Best Practices

1. **Let auto-detection work** - Only force mode when user explicitly requests
2. **Preserve context** - Use context switching to maintain relevant data
3. **Log interactions** - Quick actions help improve detection over time
4. **Show mode status** - Display current mode in UI for transparency
5. **Smooth transitions** - Acknowledge mode switches in responses

## Rollback Instructions

If issues arise, rollback to original chat service:

```bash
# Restore original chat service
cp server/services/chatService-backup.js server/services/chatService.js

# Remove mode services (optional)
rm -rf server/services/modes/
```

## Next Steps

1. Update frontend to show mode selector
2. Add mode-specific UI components
3. Implement marketing tool integrations
4. Add analytics for mode usage patterns