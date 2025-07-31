# Frontend Mode Implementation Guide

This guide explains how to implement the mode selector UI for Tala AI.

## Files Created/Updated

### 1. New Components
- **`hooks/useMode.ts`** - Mode state management hook
- **`components/chat/ModeSelector.tsx`** - Visual mode selector component
- **`pages/Chat-updated.tsx`** - Enhanced chat page with mode support
- **`components/chat/ChatMessage-updated.tsx`** - Theme-aware message component

## Key Features

### Mode Selector Component
- **Visual Toggle**: Clean switch between Travel 🧳 and Marketing 🎯 modes
- **Animated Transitions**: Smooth mode switching with spring animations
- **Sub-mode Dropdown**: Marketing sub-modes (SEO, Email, Social, etc.)
- **Responsive Design**: Compact version for mobile

### useMode Hook
- **State Management**: Tracks current mode and sub-mode
- **Persistence**: Saves user preferences to localStorage and backend
- **Theme System**: Dynamic theming based on active mode
- **Event System**: Dispatches mode change events for other components

### Theme System
```typescript
// Travel Mode Theme
{
  primary: '#0fc6c6',      // Teal
  secondary: '#0a9999',
  background: '#f0fffe',
  // ... etc
}

// CMO Mode Theme  
{
  primary: '#ff6b6b',      // Red/Orange
  secondary: '#ee5a5a',
  background: '#fff5f5',
  // ... etc
}
```

## Implementation Steps

### 1. Install Dependencies
Ensure you have the required dependencies:
```bash
npm install framer-motion lucide-react
```

### 2. Update the Main Chat Page

Replace the existing Chat page with the updated version:
```bash
# Backup current chat page
cp src/pages/Chat.tsx src/pages/Chat-backup.tsx

# Use the updated version
cp src/pages/Chat-updated.tsx src/pages/Chat.tsx
```

### 3. Update ChatMessage Component

Replace the ChatMessage component:
```bash
# Backup current component
cp src/components/chat/ChatMessage.tsx src/components/chat/ChatMessage-backup.tsx

# Use the updated version
cp src/components/chat/ChatMessage-updated.tsx src/components/chat/ChatMessage.tsx
```

### 4. Add API Endpoints

Add these endpoints to your backend:

```javascript
// Get user mode preferences
app.get('/api/users/mode-preferences', async (req, res) => {
  const userId = req.headers['x-user-id'];
  // Fetch from database
  const preferences = await getUserPreferences(userId);
  res.json({ user_preferences: preferences });
});

// Update user mode preferences
app.put('/api/users/mode-preferences', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { defaultMode, modeSettings } = req.body;
  // Save to database
  await updateUserPreferences(userId, { defaultMode, modeSettings });
  res.json({ success: true });
});
```

### 5. Update Chat Endpoint

Modify your chat endpoint to accept mode parameters:
```javascript
app.post('/api/chat/v2', async (req, res) => {
  const { message, conversationId, mode, subMode } = req.body;
  
  // Pass mode info to chat service
  const response = await chatService.generateResponse({
    message,
    conversationId,
    mode,      // 'travel' or 'cmo'
    subMode,   // e.g., 'seo', 'email'
    // ... other params
  });
  
  res.json(response);
});
```

## Usage

### Basic Mode Selector
```tsx
import { ModeSelector } from './components/chat/ModeSelector';

function MyComponent() {
  return (
    <div>
      <ModeSelector />
    </div>
  );
}
```

### Compact Mode (Mobile)
```tsx
<ModeSelector compact />
```

### Using the Mode Hook
```tsx
import { useMode } from './hooks/useMode';

function MyComponent() {
  const { mode, subMode, switchMode, getModeTheme } = useMode();
  const theme = getModeTheme();
  
  return (
    <div style={{ backgroundColor: theme.background }}>
      Current mode: {mode}
      {mode === 'cmo' && ` (${subMode})`}
    </div>
  );
}
```

### With Mode Provider (Optional)
```tsx
import { ModeProvider } from './hooks/useMode';

function App() {
  return (
    <ModeProvider>
      <YourComponents />
    </ModeProvider>
  );
}
```

## Styling Customization

### Custom Theme Colors
Modify the theme objects in `useMode.ts`:
```typescript
const modeThemes = {
  travel: {
    primary: '#your-color',
    // ... other colors
  },
  cmo: {
    primary: '#your-color',
    // ... other colors
  }
};
```

### Animation Settings
Adjust animations in `ModeSelector.tsx`:
```typescript
transition={{ 
  type: "spring", 
  bounce: 0.2,    // Adjust bounce
  duration: 0.6   // Adjust duration
}}
```

## Mode-Specific Features

### Quick Actions
The chat interface can show mode-specific quick actions:
- **Travel**: Search Flights, Find Hotels, Plan Itinerary
- **CMO/SEO**: Keyword Research, Optimize Page, Check Rankings
- **CMO/Email**: Write Campaign, Test Subject Line, Check Deliverability

### Welcome Messages
Different welcome messages based on mode:
- **Travel**: "How can I help you plan your next journey?"
- **CMO**: "What marketing challenge can I help you solve?"

## Testing

### Test Mode Detection
```bash
# Run the mode detection test
cd server
node test-mode-detection.js
```

### Test UI Components
1. Switch between modes and verify theme changes
2. Test sub-mode dropdown in CMO mode
3. Verify persistence after page reload
4. Check responsive behavior on mobile

## Troubleshooting

### Mode Not Persisting
- Check localStorage: `mode_preferences_{userId}`
- Verify API endpoints are working
- Check browser console for errors

### Theme Not Applying
- Ensure `theme` prop is passed to components
- Check that `getModeTheme()` is being called
- Verify CSS-in-JS styles are applied correctly

### Animation Issues
- Check framer-motion is installed
- Verify `layoutId` props are unique
- Check for CSS conflicts

## Next Steps

1. **Add Mode-Specific Tools**
   - SEO keyword density checker
   - Email subject line tester
   - Social media preview

2. **Enhance Context**
   - Show mode-specific context in UI
   - Add quick templates per mode

3. **Analytics**
   - Track mode usage
   - Monitor mode switching patterns
   - Analyze sub-mode preferences