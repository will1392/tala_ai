# Search Folder Isolation Fix

## Issue Description
Documents from different folders were appearing when searching for "Iceland" or other terms. The search was not properly filtering by the selected folder, causing documents from unrelated folders to appear in search results.

## Root Causes Identified

1. **Missing Search Endpoint**: The frontend (`ApiSearchService`) was making POST requests to `/api/documents/search`, but this endpoint didn't exist in the backend.

2. **Incorrect Search Implementation**: The GET `/api/documents` endpoint was treating the search parameter as a field filter instead of performing text search. When `search` was provided, it was being added to the filters object and passed to `documentService.getMany()`, which would look for documents where a field called "search" equals the search term (which doesn't exist).

3. **No Folder Filtering in Search**: Even if search was working, the folder filtering wasn't being properly applied during text search operations.

## Fixes Applied

### 1. Fixed GET /api/documents endpoint (server/routes/documents.js)
- Modified the endpoint to detect when a search term is provided
- When search is present, it now calls `documentService.searchDocuments()` instead of `documentService.getMany()`
- The `searchDocuments` method properly performs full-text search using the `search_vector` field
- Folder filtering is now correctly passed to the search method

### 2. Added POST /api/documents/search endpoint (server/routes/documents.js)
- Created the missing endpoint that the frontend expects
- Properly validates and sanitizes input parameters
- Correctly applies folder filtering when `folderId` is provided
- Transforms results to match the frontend's expected format
- Includes proper audit logging and error handling

## How the Fix Works

1. When a user searches with a folder selected:
   - Frontend sends: `POST /api/documents/search` with `{ query: "Iceland", folderId: "folder-123" }`
   - Backend receives the request and builds a filters object with `folder_id: "folder-123"`
   - Calls `documentService.searchDocuments()` with the query and filters
   - The search method performs text search AND applies the folder filter
   - Only documents matching both the search term AND belonging to the specified folder are returned

2. The `searchDocuments` method in `documentService.js`:
   - Uses Supabase's `textSearch` on the `search_vector` field
   - Applies additional filters including `folder_id` (line 349-353)
   - Ensures proper organization and user visibility filtering

## Testing the Fix

To verify the fix is working:

1. Select a specific folder in the Knowledge page
2. Search for a term like "Iceland"
3. Results should only show documents that:
   - Match the search term
   - Belong to the selected folder
   - Are visible to the current user

## Future Improvements

1. **Primary Folder Filtering**: The current implementation has a TODO for primary folder filtering. This would require adding a join or additional logic to filter by primary folder ID.

2. **Relevance Scoring**: Currently, all results get a score of 1.0. Implementing actual relevance scoring based on search match quality would improve result ordering.

3. **Search Vector Optimization**: The search vector currently combines title and content. Consider adding field-specific weights or using more advanced text search features.

4. **Performance**: For large datasets, consider adding search result caching or using dedicated search infrastructure like Elasticsearch.