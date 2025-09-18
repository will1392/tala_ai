# Quick Integration Guide for Credit System

## 1. Add Credit Routes to server.js

```javascript
// Add near other route imports (around line 880)
import creditRoutes from './routes/credits.js';
import { requireCredits } from './services/creditSystem.js';

// Add after other routes (around line 890)
app.use('/api/credits', creditRoutes);
```

## 2. Update Key Endpoints to Use Credits

### Chat Endpoint (line ~1420)
```javascript
// Change from:
app.post('/api/chat', async (req, res) => {

// To:
app.post('/api/chat', requireCredits('chat_message'), async (req, res) => {
  // After successful response, consume credits
  const { consumeCreditsAfterSuccess } = await import('./services/creditSystem.js');
  await consumeCreditsAfterSuccess(req, req.headers['x-user-id'] || 'test_user_123');
```

### Document Upload (line ~1891)
```javascript
// Already has requireCredits! Just need to import it at top
```

### Document Search (line ~2240)
```javascript
// Change from:
app.post('/api/documents/search', async (req, res) => {

// To:
app.post('/api/documents/search', requireCredits('document_search'), async (req, res) => {
```

### Voice Storage (line ~1632)
```javascript
// Change from:
app.post('/api/voice/store', async (req, res) => {

// To:
app.post('/api/voice/store', requireCredits('voice_to_document'), async (req, res) => {
```

## 3. Run Database Migration

```bash
cd server
npm run migrate
```

## 4. Add Credit Display to Frontend

In your main layout component, add a credit balance display:

```jsx
import { CreditCard } from 'lucide-react';

// Add credit balance display in header
const [credits, setCredits] = useState(null);

useEffect(() => {
  fetch('/api/credits/balance', {
    headers: { 'x-user-id': userId }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      setCredits(data.data.available_credits);
    }
  });
}, []);

// In the header
<div className="flex items-center gap-2 text-sm">
  <CreditCard className="w-4 h-4" />
  <span>{credits?.toLocaleString() || '---'} credits</span>
</div>
```

## 5. Add Credits Page to Sidebar

```jsx
// In Sidebar component
<Link to="/credits" className="sidebar-link">
  <CreditCard className="w-5 h-5" />
  <span>Credits</span>
</Link>
```

## That's It!

The credit system will now:
- Check credits before operations
- Show clear error messages when credits are insufficient
- Track all usage in the database
- Provide users visibility into their credit balance
- Allow credit purchases (payment integration pending)