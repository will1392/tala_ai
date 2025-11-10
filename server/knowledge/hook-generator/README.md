# Hook Generator Knowledge Base

This directory contains documentation that trains the AI hook generator. All markdown files in this directory will be ingested into the `kb_hook_generator` Qdrant collection.

## How to Add Documentation

1. **Create markdown files** in this directory
2. **Run the ingestion script**:
   ```bash
   node server/scripts/ingest-hook-knowledge.js
   ```
3. **The hook generator will automatically use this knowledge**

## Recommended Documentation Structure

### Core Files (Start Here)

1. **`hook-principles.md`** - Fundamental copywriting principles
   - What makes a hook effective
   - The 5-second test
   - Pattern interrupts
   - Value propositions

2. **`awareness-levels.md`** - Eugene Schwartz's 5 awareness stages
   - Most Aware (70% core)
   - Product Aware
   - Solution Aware  
   - Problem Aware
   - Unaware (10% experimental)

3. **`hook-examples.md`** - Proven hooks that convert
   - Categorized by awareness level
   - Categorized by style (curiosity, benefit, fear, social proof, question, story)
   - Include performance metrics if available

4. **`style-guide.md`** - Brand voice and formatting
   - Tone guidelines (professional, casual, urgent, etc.)
   - Banned phrases and CTAs
   - Word count targets (5-20 words ideal)
   - Punctuation rules

5. **`channel-specific.md`** - Platform-specific guidance
   - Email subject lines (45-50 characters)
   - Paid ads (attention-grabbing, front-loaded value)
   - Organic social (pattern interrupt, visual pairing)
   - Landing page headlines (benefit-driven)

### Optional Advanced Files

6. **`niche-examples/luxury-travel-hooks.md`** - Industry-specific examples
7. **`formulas-frameworks.md`** - Hook formulas (AIDA, PAS, Before-After-Bridge)
8. **`testing-insights.md`** - A/B test results and learnings
9. **`competitor-analysis.md`** - What's working in your industry
10. **`seasonal-hooks.md`** - Time-sensitive hook examples

## Frontmatter (Optional)

Add metadata to the top of any markdown file:

\`\`\`yaml
---
awareness_level: solution_aware
hook_style: curiosity
channel: email
niche: luxury_travel
last_updated: 2025-01-23
---
\`\`\`

## Metadata Auto-Detection

The ingestion script automatically detects:
- **Awareness levels**: most aware, product aware, solution aware, problem aware, unaware
- **Hook styles**: curiosity, benefit, fear/urgency, social proof, question, story
- **Channels**: email, paid ads, organic social, landing page
- **Content types**: examples, principles, frameworks
- **Niches**: luxury travel, ecommerce, SaaS, coaching

## Example Hook Documentation Format

\`\`\`markdown
## Solution Aware - Curiosity Hooks

**Context**: Audience knows they need a solution but hasn't chosen yours yet.

### Example 1: The Gap
"What 87% of luxury travelers wish they knew before booking"

**Why it works**: Creates knowledge gap, uses social proof number, targets specific niche

**Channel**: Email subject line, paid ads
**Performance**: 4.2% CTR (vs. 2.1% baseline)

### Example 2: The Secret
"The one question that reveals if your travel advisor is worth $500/hour"

**Why it works**: Positions expertise, uses specificity, creates urgency to learn

**Channel**: Organic social, blog headline
\`\`\`

## Best Practices

### ✅ DO:
- Include specific examples with context
- Explain WHY a hook works
- Categorize by awareness level
- Note which channels work best
- Include performance data if available
- Use clear headings and structure
- Keep examples concise

### ❌ DON'T:
- Include generic marketing fluff
- Mix multiple concepts in one file
- Use jargon without explanation
- Skip the reasoning behind examples
- Include outdated tactics
- Copy/paste without context

## Testing Your Knowledge Base

After ingestion, test with:

\`\`\`bash
# Check collection status
node server/diagnostics/checkQdrantCollection.js

# Generate hooks using your new knowledge
# (via the UI or API endpoint)
\`\`\`

## Updating Documentation

1. Edit or add markdown files
2. Re-run ingestion script (it will upsert/update)
3. Test hook generation to verify improvements

## Advanced: Search Your Knowledge

\`\`\`javascript
const results = await qdrant.search('kb_hook_generator', {
  vector: embedding.data[0].embedding,
  limit: 5,
  filter: {
    must: [
      { key: 'metadata.awareness_level', match: { value: 'solution_aware' } },
      { key: 'metadata.hook_style', match: { value: 'curiosity' } }
    ]
  }
});
\`\`\`

## Need Help?

- See `ingest-hook-knowledge.js` for technical details
- Check `hookGenerationService.js` for how knowledge is used
- Review `ingest-direct-mail-knowledge.js` for a similar example
