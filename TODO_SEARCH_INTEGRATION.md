# TODO: Connect Global Search to Knowledge Base

## Current State
- GlobalSearch component (`/src/components/layout/GlobalSearch.tsx`) currently uses mock data
- Search results are hardcoded in the `mockSearchResults` array
- Knowledge base exists and has documents stored in cloud storage

## Implementation Tasks
1. **Backend API Endpoint**
   - Create `/api/search` endpoint in Express server
   - Implement search across knowledge base documents
   - Include document metadata (title, category, type, excerpt)
   - Consider implementing search with Qdrant vector similarity for better results

2. **Frontend Integration**
   - Replace mock data in GlobalSearch component
   - Connect to actual API endpoint
   - Handle loading states and errors properly
   - Implement debouncing for search input

3. **Search Features to Add**
   - Full-text search across document content
   - Filter by category (Destinations, Marketing, Suppliers, etc.)
   - Search history/recent searches per user
   - Keyboard navigation for search results
   - Click to navigate directly to document in Knowledge base

4. **Data Sources to Search**
   - Knowledge base documents (S3/cloud storage)
   - Travel guides and destination information
   - Marketing templates and resources
   - Supplier information and policies
   - User-generated content/notes

## Notes
- Search UI is complete and styled with teal theme
- Consider using the existing Qdrant vector database for semantic search
- May want to index documents for faster searching
- Add search analytics to track what users are looking for

Created: 2025-08-07
Status: Pending