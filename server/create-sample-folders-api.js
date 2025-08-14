#!/usr/bin/env node

/**
 * Create sample folders using the API endpoints
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';

async function createSampleData() {
  try {
    console.log('🌱 Creating sample folders...');
    
    // Get primary folders
    const primaryResponse = await fetch(`${API_URL}/primary-folders?userId=admin-1&isAdmin=true`);
    if (!primaryResponse.ok) {
      throw new Error('Failed to fetch primary folders');
    }
    
    const primaryFolders = await primaryResponse.json();
    const destinations = primaryFolders.find(f => f.slug === 'destinations');
    const suppliers = primaryFolders.find(f => f.slug === 'suppliers');
    
    if (!destinations) {
      console.error('❌ Destinations primary folder not found!');
      return;
    }
    
    console.log('✅ Found Destinations folder:', destinations.id);
    
    // Create subfolders for destinations
    const destinationFolders = [
      { name: 'France', description: 'Travel guides and information about France' },
      { name: 'Italy', description: 'Travel guides and information about Italy' },
      { name: 'Spain', description: 'Travel guides and information about Spain' },
      { name: 'Japan', description: 'Travel guides and information about Japan' },
      { name: 'Australia', description: 'Travel guides and information about Australia' }
    ];
    
    for (const folderData of destinationFolders) {
      try {
        const response = await fetch(`${API_URL}/folders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...folderData,
            userId: 'admin-1',
            isAdmin: true,
            primaryFolderId: destinations.id
          })
        });
        
        if (response.ok) {
          console.log(`✅ Created folder: ${folderData.name}`);
        } else {
          const error = await response.json();
          console.error(`❌ Failed to create folder ${folderData.name}:`, error.error);
        }
      } catch (error) {
        console.error(`❌ Failed to create folder ${folderData.name}:`, error.message);
      }
    }
    
    // Also create folders for suppliers
    if (suppliers) {
      const supplierFolders = [
        { name: 'Airlines', description: 'Airline information and policies' },
        { name: 'Hotels', description: 'Hotel chains and accommodations' },
        { name: 'Car Rentals', description: 'Car rental companies and policies' }
      ];
      
      for (const folderData of supplierFolders) {
        try {
          const response = await fetch(`${API_URL}/folders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...folderData,
              userId: 'admin-1',
              isAdmin: true,
              primaryFolderId: suppliers.id
            })
          });
          
          if (response.ok) {
            console.log(`✅ Created folder: ${folderData.name}`);
          } else {
            const error = await response.json();
            console.error(`❌ Failed to create folder ${folderData.name}:`, error.error);
          }
        } catch (error) {
          console.error(`❌ Failed to create folder ${folderData.name}:`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Sample data creation complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Check if server is running
fetch(`${API_URL}/health`)
  .then(() => {
    console.log('✅ Server is running');
    createSampleData();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start the server first.');
    process.exit(1);
  });