# Marketing Health Dashboard Testing Guide

## How to View the Marketing Health Dashboard

### Prerequisites
1. Backend server running on port 3001
2. Frontend running on port 5174 (or 5173)

### Steps to Test

1. **Navigate to Chat**
   - Open http://localhost:5174 (or 5173)
   - Click on "Chat" in the navigation

2. **Switch to CMO Mode**
   - Look for the mode selector in the chat header
   - Select "CMO" mode

3. **Trigger the Dashboard** (3 ways):

   **Option A: Click the Button**
   - In CMO mode, you'll see a "Marketing Health" button in the header
   - Click it to toggle the dashboard display

   **Option B: Ask About Health**
   - Type any of these queries:
     - "Show my marketing health"
     - "Marketing performance overview"
     - "How is my marketing doing?"
     - "Channel performance assessment"
     - "Marketing status report"

   **Option C: Simulate Conversation First**
   - Have a conversation mentioning metrics:
     - "My email open rates are 22%"
     - "SEO traffic is up 15% this month"
     - "Social media engagement is struggling at 1.5%"
   - Then ask: "Show my marketing health"

### What You Should See

The dashboard displays:

1. **Overall Health Summary**
   - Score (0-100)
   - Status (Excellent/Good/Fair/Poor)
   - Active channels count
   - Coverage percentage

2. **Channel Health Cards** (5 cards)
   - SEO
   - Email  
   - Social Media
   - Direct Mail
   - Paid Ads
   - Each shows score, status, and indicators

3. **Critical Gaps** (if any)
   - Red alert section
   - Lists high-priority issues
   - Includes recommendations

4. **Top Opportunities**
   - Seasonal opportunities
   - Cross-channel synergies
   - Priority levels

5. **Cross-Channel Insights**
   - How channels can work together
   - Integration recommendations

6. **Recommended Actions**
   - Immediate (this week)
   - Short-term (this month)
   - Long-term

### Interactive Features

- **Click a Channel Card**: Generates "Tell me more about my [channel] performance"
- **Click a Recommendation**: Generates "Help me with: [recommendation]"
- **Dashboard Updates**: As you discuss metrics, the dashboard reflects your data

### Troubleshooting

If dashboard doesn't appear:
1. Check browser console for errors
2. Ensure you're in CMO mode
3. Try refreshing the page
4. Check that backend API is responding:
   ```bash
   curl "http://localhost:3001/api/cmo/health?userId=test"
   ```

### Example Full Test Flow

1. Go to Chat
2. Switch to CMO mode
3. Say: "I run an online store selling organic skincare"
4. Say: "My email open rates are 18% but click rates are only 2%"
5. Say: "SEO traffic increased 25% this month"
6. Say: "I'm not doing any paid advertising yet"
7. Click "Marketing Health" button or say "Show my marketing health"
8. Dashboard appears with personalized assessment based on your conversation!

The dashboard is fully integrated and working - you just need to trigger it!