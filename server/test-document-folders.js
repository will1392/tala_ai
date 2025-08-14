import fetch from 'node-fetch';

async function testDocumentFolders() {
  const baseUrl = 'http://localhost:3001/api';
  const userId = 'admin-1';
  
  try {
    // First, get all documents to see what exists
    console.log('\n📄 Fetching all documents...');
    const allDocsResponse = await fetch(`${baseUrl}/documents?userId=${userId}&isAdmin=true&limit=20`, {
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin'
      }
    });
    const allDocs = await allDocsResponse.json();
    
    console.log(`\nFound ${allDocs.totalDocuments} total documents:`);
    allDocs.documents.forEach(doc => {
      console.log(`- ${doc.title} (folder: ${doc.folderName || 'none'}, folderId: ${doc.folderId || 'none'})`);
    });
    
    // Get all folders to test each one
    console.log('\n📁 Fetching all folders...');
    const foldersResponse = await fetch(`${baseUrl}/folders?userId=${userId}&isAdmin=true`, {
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin'
      }
    });
    const folders = await foldersResponse.json();
    
    console.log(`\nFound ${folders.length} folders:`);
    
    // Test each folder
    for (const folder of folders) {
      if (folder.primaryFolderId === '37b2dff2-fa91-46c7-bd30-c28715178bf0') { // Destinations
        console.log(`\n📁 Testing folder: ${folder.name} (${folder.id})`);
        
        const folderDocsResponse = await fetch(`${baseUrl}/documents?userId=${userId}&isAdmin=true&folderId=${folder.id}&limit=10`, {
          headers: {
            'x-user-id': 'admin-1',
            'x-user-role': 'admin'
          }
        });
        const folderDocs = await folderDocsResponse.json();
        
        console.log(`  Found ${folderDocs.documents.length} documents:`);
        folderDocs.documents.forEach(doc => {
          console.log(`  - ${doc.title}`);
        });
        
        if (folderDocs.documents.length === 0) {
          // Check if there should be a document for this folder
          const expectedDocs = allDocs.documents.filter(doc => 
            doc.title.toLowerCase().includes(folder.name.toLowerCase())
          );
          if (expectedDocs.length > 0) {
            console.log(`  ⚠️  Expected to find: ${expectedDocs.map(d => d.title).join(', ')}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDocumentFolders();