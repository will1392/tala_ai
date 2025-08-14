# CRITICAL FINDING: Chat API Using Wrong Embedding Model

## The Smoking Gun

### Direct Qdrant Search (CORRECT):
- Greece query → "Kensington Greece Guide.pdf" (score: 0.575) ✅
- Iceland query → "Northern Lights Iceland.pdf" (score: 0.500) ✅
- Spain query → "Kensington Spain Guide.pdf" (score: 0.388) ✅
- France query → "Kensington France Guide.pdf" (score: 0.360) ✅

### Chat API Results (WRONG):
- ALL queries → "July 22 London Cleveland Flights.pdf" as #1 result ❌
- Greece Guide: NOT in top 5 results
- Iceland Guide: NOT in top 5 results
- Spain/France guides: Appear with NEGATIVE scores

## What This Means

1. **Documents are fine**: Greece and Iceland docs exist and can be found
2. **Direct search works**: Using text-embedding-3-small finds everything
3. **Chat API is broken**: Using different embedding model, returning flight PDFs for all travel queries

## The Pattern

The Chat API appears to be using `text-embedding-ada-002` (old model) somewhere in its flow:
- Documents uploaded with `text-embedding-3-small`
- Direct search uses `text-embedding-3-small` ✅
- Chat API search uses `text-embedding-ada-002` ❌
- Result: Complete mismatch in search results

## Why Spain/France "Work"

They don't really work - they just happen to appear in results with negative scores. The Chat API is still returning wrong results, but the intelligence system manages to extract some information from whatever documents it gets.

## Next Step

Find where in the chat flow the wrong embedding model is being used. Check:
1. ContextAwareSearch.js
2. Intelligence system components
3. Any service that generates embeddings