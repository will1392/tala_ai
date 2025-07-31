# CMO Mode Integration Guide

## Overview
CMO Mode now includes a comprehensive set of user experience features:
- **Onboarding Flow**: 7-step interactive onboarding for new users
- **Guided Tours**: Context-aware tours for dashboard, tools, and workflows
- **Help System**: Multi-modal help with FAQ, videos, articles, and chat
- **Achievement System**: Gamification to track progress and milestones

## Component Structure

### Main Entry Point
- `CMODashboardWithTour.tsx` - Wraps the dashboard with all features
- `CMOModeFull.tsx` - Page component that renders the full experience

### Feature Components

#### 1. Onboarding Flow (`OnboardingFlowEnhanced.tsx`)
- **First Visit**: Automatically shows on first visit
- **7 Steps**: Welcome, Mode Overview, Channels, Tools, Workflow, Customization, Next Steps
- **Personalization**: Adapts based on user role and preferences
- **Access**: Can be re-accessed via the sparkles button

#### 2. Guided Tours (`GuidedTour.tsx`)
- **Dashboard Tour**: Highlights key dashboard features
- **Tools Tour**: Shows how to access and use marketing tools
- **Workflow Tour**: Demonstrates the CMO workflow
- **Access**: Play button in bottom-right corner

#### 3. Help System (`HelpSystem.tsx`)
- **FAQ Section**: Common questions organized by category
- **Video Tutorials**: Placeholder for video content
- **Articles**: Marketing guides and best practices
- **Support Chat**: Direct chat interface
- **Access**: Help button (?) in bottom-right corner

#### 4. Achievement System (`AchievementSystem.ts` & `AchievementDisplay.tsx`)
- **Categories**: Campaigns, Tools, Channels, Results, Special
- **Tiers**: Bronze, Silver, Gold, Platinum
- **Progress Tracking**: Real-time progress updates
- **Notifications**: Shows when achievements are unlocked
- **Access**: Trophy button in bottom-right corner

## User Flow

### First-Time User
1. **Onboarding Flow** appears automatically
2. User completes 7-step onboarding
3. **Tour Prompt** suggests guided tour
4. User can explore with guided tour or skip

### Returning User
1. Dashboard loads with all features available
2. Control panel in bottom-right shows:
   - Trophy (Achievements)
   - Help (Help System)
   - Play (Guided Tours)
   - Sparkles (Re-access Onboarding)

### Quick Actions Panel (Bottom-Left)
- Quick access to all three tours
- Option to restart onboarding
- Shows completion status

## Integration Points

### Achievement Tracking
The system tracks user actions automatically:
```typescript
// In CMODashboardEnhanced.tsx
trackAction({
  type: 'dashboard_visit',
  data: { timestamp: new Date() }
});
```

### Help Context
Help system adapts based on current context:
```typescript
<HelpButton context="CMO Dashboard" />
```

### Tour Management
Tours can be programmatically triggered:
```typescript
const { startTour } = useTourManager();
startTour(CMO_TOURS.dashboard);
```

## Customization

### Adding New Achievements
Edit `AchievementSystem.ts` to add new achievements:
```typescript
{
  id: 'new-achievement',
  name: 'Achievement Name',
  description: 'What the user accomplished',
  category: 'campaign',
  tier: 'gold',
  points: 100,
  icon: '🏆',
  criteria: { type: 'count', target: 10 }
}
```

### Adding Tour Steps
Edit `GuidedTour.tsx` to modify tour steps:
```typescript
CMO_TOURS.dashboard.steps.push({
  id: 'new-step',
  title: 'New Feature',
  content: 'Description of the feature',
  target: '.css-selector',
  placement: 'bottom',
  highlight: true
});
```

### Extending Help Content
Add FAQs, videos, or articles in `HelpSystem.tsx`.

## Best Practices

1. **Progressive Disclosure**: Don't overwhelm users - onboarding → tour → exploration
2. **Context Awareness**: Help and tours adapt to current view
3. **Achievement Balance**: Make achievements attainable but meaningful
4. **Accessibility**: All features accessible via keyboard and screen readers
5. **Performance**: Components lazy-loaded to minimize initial bundle size

## Testing

1. **First Visit**: Clear localStorage and cookies to test onboarding
2. **Tours**: Check all tour steps target correct elements
3. **Achievements**: Verify tracking and unlock conditions
4. **Help System**: Ensure all content is searchable and accessible

## Future Enhancements

1. **Analytics Integration**: Track feature usage and completion rates
2. **Personalized Tours**: Adapt tours based on user behavior
3. **Video Content**: Add actual video tutorials
4. **Achievement Sync**: Store achievements in backend
5. **Multi-language Support**: Localize all content