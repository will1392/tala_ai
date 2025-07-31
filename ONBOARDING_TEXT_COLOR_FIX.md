# Onboarding Text Color Fix

## Issue
Users were unable to see the text they typed in the onboarding flow because the input fields had white text on a white background.

## Root Cause
1. The global CSS file (`src/styles/globals.css`) sets the body text color to white: `@apply bg-secondary-900 text-white;`
2. The input fields in the onboarding components were not explicitly setting text colors, so they inherited the white text color from the body
3. The inputs had white/light backgrounds in light mode, making the white text invisible

## Files Fixed

### 1. `/src/components/cmo/CMOOnboarding.tsx`
Fixed 4 input/select elements by adding proper text color classes:
- Name input field (line 315)
- Role select field (line 325) 
- Industry select field (line 359)
- Team Size select field (line 373)

### 2. `/src/components/cmo/OnboardingFlowEnhanced.tsx`
Fixed 2 input/select elements by adding proper text color classes:
- Name input field (line 287)
- Role select field (line 298)

## Solution Applied
Added the following classes to all input and select elements:
```
bg-white dark:bg-gray-700 text-gray-900 dark:text-white
```

This ensures:
- Light mode: White background with dark gray text
- Dark mode: Dark gray background with white text

## Testing Instructions
1. Navigate to the CMO onboarding flow
2. Try typing in the name input field - text should be visible (dark gray on white in light mode)
3. Select options from dropdowns - text should be visible
4. Test in both light and dark modes to ensure proper contrast

## Additional Notes
- The fix maintains consistency with the app's dark mode support
- No changes were needed to placeholder text as it already has proper styling
- The solution is applied consistently across both onboarding components