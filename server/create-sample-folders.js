#!/usr/bin/env node

/**
 * Create sample folders and documents for Knowledge Base
 */

import { FolderService } from './services/db/folderService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load primary folders from storage
const primaryFoldersPath = path.join(__dirname, 'primaryFolders.json');
const primaryFoldersData = JSON.parse(fs.readFileSync(primaryFoldersPath, 'utf8'));

const folderService = new FolderService();

async function createSampleData() {
  try {
    console.log('🌱 Creating sample folders...');
    
    // Get primary folders from local storage
    const primaryFolders = primaryFoldersData;
    const destinations = primaryFolders.find(f => f.slug === 'destinations');
    
    if (!destinations) {
      console.error('❌ Destinations primary folder not found!');
      return;
    }
    
    console.log('✅ Found Destinations folder:', destinations.id);
    
    // Create subfolders for destinations
    const foldersToCreate = [
      { name: 'France', description: 'Travel guides and information about France' },
      { name: 'Italy', description: 'Travel guides and information about Italy' },
      { name: 'Spain', description: 'Travel guides and information about Spain' },
      { name: 'Japan', description: 'Travel guides and information about Japan' },
      { name: 'Australia', description: 'Travel guides and information about Australia' }
    ];
    
    for (const folderData of foldersToCreate) {
      try {
        const result = await folderService.createFolder({
          ...folderData,
          userId: 'admin-1',
          isAdmin: true,
          primaryFolderId: destinations.id
        });
        console.log(`✅ Created folder: ${folderData.name}`);
      } catch (error) {
        console.error(`❌ Failed to create folder ${folderData.name}:`, error.message);
      }
    }
    
    // Also create folders for other categories
    const suppliers = primaryFolders.find(f => f.slug === 'suppliers');
    if (suppliers) {
      const supplierFolders = [
        { name: 'Airlines', description: 'Airline information and policies' },
        { name: 'Hotels', description: 'Hotel chains and accommodations' },
        { name: 'Car Rentals', description: 'Car rental companies and policies' }
      ];
      
      for (const folderData of supplierFolders) {
        try {
          await folderService.createFolder({
            ...folderData,
            userId: 'admin-1',
            isAdmin: true,
            primaryFolderId: suppliers.id
          });
          console.log(`✅ Created folder: ${folderData.name}`);
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

createSampleData();