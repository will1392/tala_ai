#!/usr/bin/env node

/**
 * Test script to verify folder-based document search filtering
 * 
 * This script tests the search functionality to ensure documents
 * are properly filtered by folder when searching.
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';

async function testFolderSearch() {
  console.log('🔍 Testing folder-based document search filtering...\n');

  // Test data
  const userId = 'test-user-123';
  const searchQuery = 'Iceland';
  
  // Test cases
  const testCases = [
    {
      name: 'Search without folder filter',
      params: {
        query: searchQuery,
        userId: userId,
        isAdmin: false,
        limit: 10
      }
    },
    {
      name: 'Search with specific folder',
      params: {
        query: searchQuery,
        userId: userId,
        isAdmin: false,
        limit: 10,
        folderId: 'europe-travel'
      }
    },
    {
      name: 'Search with "all" folder',
      params: {
        query: searchQuery,
        userId: userId,
        isAdmin: false,
        limit: 10,
        folderId: 'all'
      }
    },
    {
      name: 'Search with primary folder',
      params: {
        query: searchQuery,
        userId: userId,
        isAdmin: false,
        limit: 10,
        primaryFolderId: 'travel-docs'
      }
    },
    {
      name: 'Search with both folder and primary folder',
      params: {
        query: searchQuery,
        userId: userId,
        isAdmin: false,
        limit: 10,
        folderId: 'europe-travel',
        primaryFolderId: 'travel-docs'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('Parameters:', JSON.stringify(testCase.params, null, 2));
    
    try {
      const response = await fetch(`${API_URL}/documents/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testCase.params)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Search failed:', error);
        continue;
      }

      const result = await response.json();
      console.log(`✅ Search completed in ${result.processingTime}ms`);
      console.log(`📊 Found ${result.totalResults} results`);
      
      // Display folder information for each result
      if (result.results && result.results.length > 0) {
        console.log('\n🗂️ Results by folder:');
        const folderGroups = {};
        
        result.results.forEach(doc => {
          const folderKey = `${doc.primaryFolderId || 'none'}/${doc.folderId || 'none'}`;
          if (!folderGroups[folderKey]) {
            folderGroups[folderKey] = [];
          }
          folderGroups[folderKey].push({
            title: doc.documentTitle,
            score: doc.score.toFixed(3),
            preview: doc.contentPreview.substring(0, 50) + '...'
          });
        });
        
        Object.entries(folderGroups).forEach(([folder, docs]) => {
          console.log(`  📁 ${folder}: ${docs.length} documents`);
          docs.slice(0, 3).forEach(doc => {
            console.log(`     - ${doc.title} (score: ${doc.score})`);
            console.log(`       "${doc.preview}"`);
          });
          if (docs.length > 3) {
            console.log(`     ... and ${docs.length - 3} more`);
          }
        });
      } else {
        console.log('  No results found');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
  
  console.log('\n\n✅ Folder search tests completed');
}

// Run the test
testFolderSearch().catch(console.error);