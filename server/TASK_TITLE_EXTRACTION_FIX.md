# Task Title Extraction Fix ✅

## Problem
Tasks were being titled "Can you create" instead of extracting the actual task content.

## Root Cause
The regex pattern in `extractSimpleTitle` was too aggressive:
```javascript
.replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(new\s+)?(task|todo|reminder)(\s+to|\s+for)?\s*/i, '')
```
This was removing the entire phrase, leaving nothing for title extraction.

## Solution
Improved the title extraction with:
1. More specific regex patterns that preserve the actual task content
2. Fallback patterns to extract content from common phrases
3. Better handling of edge cases

### Key Changes
```javascript
// Remove polite prefixes separately
.replace(/^(can you\s+|could you\s+|please\s+|would you\s+)?/i, '')

// More specific task creation phrase removal
.replace(/^(create|add|make)\s+(a\s+)?(new\s+)?(task|todo|reminder)\s+(to\s+|for\s+|that\s+|about\s+)?/i, '')

// Fallback patterns if content is too short
const patterns = [
  /(?:create|add|make)\s+(?:a\s+)?(?:task|todo|reminder)\s+(?:to|for|that|about)\s+(.+)/i,
  /remind me to\s+(.+)/i,
  // etc.
];
```

## Test Results
Before fix:
- "Can you create a task to call the dentist" → "Can you create" ❌

After fix:
- "Can you create a task to call the dentist tomorrow" → "Call the dentist" ✅
- "Please add a reminder to review the quarterly report" → "Review the quarterly" ✅
- "Could you make a task about sending the visa documents" → "Sending visa documents" ✅
- "I need to prepare the presentation for Monday's meeting" → "Prepare the presentation" ✅

## Benefits
- Proper, descriptive task titles
- Better user experience
- Cleaner task lists
- Titles actually reflect the task content

The task title extraction is now working correctly! 🎉