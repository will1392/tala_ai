# Hook Generator Knowledge Base Setup

## ✅ What's Been Created

### 1. **Ingestion Script** (`server/scripts/ingest-hook-knowledge.js`)
- Automatically processes markdown files into vector embeddings
- Detects metadata (awareness levels, hook styles, channels)
- Stores in Qdrant collection `kb_hook_generator`
- Similar to the `ingest-direct-mail-knowledge.js` pattern

### 2. **Knowledge Directory** (`server/knowledge/hook-generator/`)
Contains starter documentation:
- **README.md** - Complete setup guide
- **01-hook-principles.md** - Core copywriting principles (specificity, value, curiosity gaps)
- **02-awareness-levels.md** - Eugene Schwartz's 5 awareness stages framework
- **03-luxury-travel-examples.md** - 50+ proven hooks with performance data

### 3. **Automatic Metadata Detection**
The ingestion script automatically tags content with:

**Awareness Levels:**
- `most_aware` - Hot leads, ready to buy
- `product_aware` - Comparing you to alternatives
- `solution_aware` - Know they need a solution
- `problem_aware` - Feel the pain, don't know solutions exist
- `unaware` - Don't know they have a problem

**Hook Styles:**
- `curiosity` - Creates knowledge gaps
- `benefit` - Value propositions
- `fear_urgency` - Scarcity and time pressure
- `social_proof` - Testimonials and results
- `question` - Thought-provoking questions
- `story` - Narrative-based hooks

**Channels:**
- `email` - Subject lines (45-50 chars)
- `paid_ads` - Front-loaded value
- `organic_social` - Pattern interrupts
- `landing_page` - Benefit-driven headlines

**Content Types:**
- `examples` - Specific hook examples with performance data
- `principles` - Foundational rules and best practices
- `frameworks` - Formulas (AIDA, PAS, Before-After-Bridge)

---

## 🚀 How to Use

### Step 1: Add Your Documentation

Create markdown files in `server/knowledge/hook-generator/` with your hook writing knowledge:

```bash
cd server/knowledge/hook-generator/
```

**Recommended files to add:**
1. `style-guide.md` - Your brand voice, tone, banned phrases
2. `testing-insights.md` - A/B test results from your campaigns
3. `channel-specific.md` - Platform-specific best practices
4. `formulas-frameworks.md` - Hook templates and formulas
5. `competitor-analysis.md` - What's working in your industry
6. `seasonal-hooks.md` - Time-sensitive examples

**Optional: Add frontmatter for explicit metadata:**
```yaml
---
awareness_level: solution_aware
hook_style: curiosity
channel: email
niche: luxury_travel
---
```

### Step 2: Run the Ingestion Script

```bash
cd server
node scripts/ingest-hook-knowledge.js
```

This will:
1. ✅ Create the `kb_hook_generator` Qdrant collection (if doesn't exist)
2. ✅ Process all markdown files
3. ✅ Generate embeddings with OpenAI
4. ✅ Upload to Qdrant with metadata
5. ✅ Create searchable indices

**Expected output:**
```
🚀 Hook Generator Knowledge Ingestion

📦 Creating collection "kb_hook_generator"...
✅ Collection created with indices

📚 Found 3 markdown files

  📄 Processing: 01-hook-principles.md
     Split into 8 chunks
  📄 Processing: 02-awareness-levels.md
     Split into 12 chunks
  📄 Processing: 03-luxury-travel-examples.md
     Split into 15 chunks

📊 Total vectors to upload: 35
☁️  Uploading to Qdrant...
   Uploaded 35/35 vectors

✅ Ingestion complete!
   Collection: kb_hook_generator
   Total points: 35
   Vector size: 1536
```

### Step 3: Update Hook Service (TODO)

Update `server/services/hookGenerationService.js` to query the knowledge base:

```javascript
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getRelevantHookKnowledge(request) {
  // Generate embedding for the request
  const queryText = `
    Target audience: ${request.targetAudience}
    Offering: ${request.offering}
    Awareness level: ${request.awarenessLevel || 'solution_aware'}
    Channel: ${request.marketingChannels?.[0] || 'email'}
  `;
  
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: queryText
  });
  
  // Search hook knowledge base
  const results = await qdrant.search('kb_hook_generator', {
    vector: embedding.data[0].embedding,
    limit: 10,
    score_threshold: 0.25, // Same threshold as travel KB
    filter: {
      must: [
        { 
          key: 'metadata.awareness_level', 
          match: { value: request.awarenessLevel || 'solution_aware' }
        }
      ]
    }
  });
  
  // Extract relevant examples and principles
  return results.map(r => r.payload.content).join('\n\n');
}

// Use in generateHooks method:
async generateHooks(request) {
  const relevantKnowledge = await this.getRelevantHookKnowledge(request);
  
  // Pass to LLM with knowledge context
  const result = await runHookAgent({
    avatar: this.buildAvatar(request),
    topic: this.buildTopic(request),
    total: this.requestedTotal(request),
    knowledge: relevantKnowledge // <-- Add this
  });
  
  // ... rest of the method
}
```

---

## 📊 Testing Your Knowledge Base

### Check Collection Status
```bash
cd server
node diagnostics/checkQdrantCollection.js
```

### Test Semantic Search
```bash
# Create a test script
node -e "
const { QdrantClient } = require('@qdrant/js-client-rest');
const OpenAI = require('openai');

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

(async () => {
  const query = 'Write a curiosity hook for solution aware luxury travelers';
  
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query
  });
  
  const results = await qdrant.search('kb_hook_generator', {
    vector: embedding.data[0].embedding,
    limit: 3
  });
  
  console.log('Top 3 results:');
  results.forEach((r, i) => {
    console.log(\`\n\${i+1}. Score: \${r.score.toFixed(3)}\`);
    console.log(r.payload.content.substring(0, 200) + '...');
  });
})();
"
```

---

## 🎯 What Makes This Powerful

### 1. **Context-Aware Hook Generation**
The AI can now search your documentation and retrieve:
- Relevant examples for the specific awareness level
- Style guidelines that match the channel
- Niche-specific best practices
- Proven formulas that work

### 2. **Filtered Search**
Query with filters to get exact matches:

```javascript
// Get only curiosity hooks for email campaigns
const results = await qdrant.search('kb_hook_generator', {
  vector: embedding.data[0].embedding,
  limit: 5,
  filter: {
    must: [
      { key: 'metadata.hook_style', match: { value: 'curiosity' } },
      { key: 'metadata.channel', match: { value: 'email' } }
    ]
  }
});
```

### 3. **Continuous Improvement**
As you add more documentation:
- Re-run the ingestion script
- New knowledge automatically available
- No code changes needed

---

## 📝 Documentation Best Practices

### ✅ DO:
- Include specific examples with performance metrics
- Explain WHY a hook works
- Categorize by awareness level
- Add channel-specific guidance
- Use clear markdown structure
- Keep chunks under 800 words

### ❌ DON'T:
- Copy generic marketing content
- Mix multiple concepts in one file
- Skip the reasoning behind examples
- Include outdated tactics
- Use jargon without explanation

---

## 🔄 Updating Your Knowledge

When you want to add new documentation:

1. Create/edit markdown files in `server/knowledge/hook-generator/`
2. Run ingestion: `node server/scripts/ingest-hook-knowledge.js`
3. Test hook generation to verify improvements

The script uses **upsert**, so it will:
- Add new documents
- Update existing documents
- Keep everything in sync

---

## 💡 Example Use Cases

### Use Case 1: Generate Email Subject Lines
**Documentation needed:**
- `email-best-practices.md` - 45-50 char limits, curiosity gaps
- `subject-line-examples.md` - A/B test winners with open rates

### Use Case 2: Platform-Specific Hooks
**Documentation needed:**
- `facebook-ads.md` - Front-load value, stop the scroll
- `instagram-captions.md` - Pattern interrupts, visual pairing
- `linkedin-posts.md` - Professional tone, thought leadership

### Use Case 3: Industry Adaptation
**Documentation needed:**
- `luxury-travel-hooks.md` (already created!)
- `ecommerce-hooks.md` - Product-focused, benefit-driven
- `saas-hooks.md` - Problem-solution, feature-benefit

---

## 🐛 Troubleshooting

**Q: Ingestion fails with "Collection already exists"**
A: The script will upsert into existing collection. Delete collection if you want fresh start:
```javascript
await qdrant.deleteCollection('kb_hook_generator');
```

**Q: Getting 0 results when searching**
A: Check score threshold (should be 0.25 or lower, same as travel KB)

**Q: Want to see what's in my collection?**
A: Use the diagnostic script from earlier:
```bash
node server/diagnostics/checkQdrantCollection.js
# Update it to check 'kb_hook_generator' instead of 'tala_admin_knowledge'
```

**Q: How do I know if my documentation is being used?**
A: Add logging to hookGenerationService when it retrieves knowledge:
```javascript
console.log('📚 Retrieved knowledge snippets:', results.length);
```

---

## 📚 Recommended Reading

To build better documentation:
- **Breakthrough Advertising** by Eugene Schwartz (awareness levels)
- **The Boron Letters** by Gary Halbert (direct response principles)
- **Cashvertising** by Drew Eric Whitman (psychological triggers)
- **Made to Stick** by Chip & Dan Heath (memorable messaging)

---

## Next Steps

1. ✅ **Run the ingestion script** to populate your knowledge base
2. ⏳ **Update hookGenerationService.js** to query kb_hook_generator
3. ⏳ **Add more documentation** based on your campaigns
4. ⏳ **Test hook generation** and measure improvement
5. ⏳ **Iterate** - Add learnings from A/B tests

---

## Questions?

Check these files for reference:
- `server/scripts/ingest-hook-knowledge.js` - Technical implementation
- `server/knowledge/hook-generator/README.md` - Detailed guide
- `server/scripts/ingest-direct-mail-knowledge.js` - Similar working example
