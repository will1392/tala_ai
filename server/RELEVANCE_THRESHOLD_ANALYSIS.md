# Source Selection Strategy: Quality vs Quantity

## The Problem

With limited knowledge base content, forcing multiple sources can:
- Include flight PDFs when asking about Greece hotels
- Mix Spain info into Greece queries
- Create confusing, contradictory responses
- Dilute high-quality information with barely relevant content

## Current Behavior

```javascript
MIN_RELEVANCE_SCORE = 0.35  // Too permissive?
Uses top 3 documents regardless of actual relevance
```

## Proposed Solution: Adaptive Source Selection

### 1. **Tiered Relevance Thresholds**
```
EXCELLENT_MATCH: > 0.70  // Use even if only one source
GOOD_MATCH: > 0.50      // Combine if multiple good matches
FAIR_MATCH: > 0.35      // Only use if no better options
POOR_MATCH: < 0.35      // Never use
```

### 2. **Dynamic Source Rules**

**Single Source is OK when:**
- One document scores > 0.70
- Other documents score < 0.40
- Query is specific to one destination

**Multiple Sources are Good when:**
- 2+ documents score > 0.50
- Documents cover different aspects (hotels vs activities)
- Query spans multiple topics

**Reject Sources when:**
- Score < 0.35
- Different destination than query
- Document type mismatch (flight info for hotel query)

### 3. **Content Relevance Checking**

Before including a source:
- Check if destination matches
- Verify topic alignment
- Ensure no contradictions

## Example Scenarios

### Query: "Hotels in Greece"
- Greece Guide (0.75) ✅ - Use this
- Spain Guide (0.25) ❌ - Reject (wrong destination)
- Flight PDF (0.30) ❌ - Reject (wrong topic)
**Result**: Single source response

### Query: "Travel to Iceland for Northern Lights"
- Iceland Guide (0.72) ✅
- Northern Lights Doc (0.68) ✅
- Spain Guide (0.20) ❌
**Result**: Two source synthesis

### Query: "European destinations"
- Greece Guide (0.55) ✅
- Spain Guide (0.53) ✅
- France Guide (0.52) ✅
**Result**: Multi-source overview

## Implementation Strategy

1. Add relevance validation to EnhancedResponseGenerator
2. Implement destination/topic matching
3. Create adaptive thresholds
4. Add source quality metrics to response