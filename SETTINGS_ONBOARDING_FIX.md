# Settings Onboarding Section Fix

## Issue
User reported: "restarting onboarding is not showing up in settings"

## Investigation
The "Onboarding & Preferences" section is properly coded in Settings.tsx but may not be visible due to:
1. **Scrolling**: It's the 4th GlassCard in Profile settings - user needs to scroll down
2. **Visual prominence**: Section wasn't standing out enough

## Changes Made

### 1. **Enhanced Visual Prominence**
- Added border highlight: `border-2 border-primary/20`
- Added Settings icon to heading
- Changed "Retake Onboarding" button to primary variant (more visible)
- Added emojis to buttons for better visibility
- Added `animate-pulse` to status indicator
- Added `flex-wrap` to button container for mobile responsiveness

### 2. **How to Find the Section**
1. Go to Settings page
2. Make sure "Profile" is selected in the sidebar (it's the default)
3. Scroll down past:
   - Personal Information
   - Contact Information
   - Agency Logo
4. **"Onboarding & Preferences"** section will be visible with:
   - Primary-colored border
   - Settings icon
   - Blue "Retake Onboarding" button
   - Ghost "Update Marketing Expertise" button

## Testing Instructions
1. Navigate to Settings
2. The section should now be more visible with:
   - Highlighted border
   - Primary button for retaking onboarding
   - Icons and emojis for visual emphasis

## Technical Notes
- Section exists in `ProfileSettings` component
- Located at lines 322-369 in Settings.tsx
- Uses localStorage to track onboarding completion
- Confirmation dialog prevents accidental resets
- Page reload triggers fresh onboarding flow