# Knowledge Base Upload Guide

Complete guide for uploading documents to the Tala AI Knowledge Base at any scale.

---

## 📊 Which Upload Method Should I Use?

### 🖱️ Use the Web UI if you have:
- ✅ **< 200 files** that you can drag and drop
- ✅ **Mixed file types** that need visual verification
- ✅ **Files already organized** on your local machine
- ✅ **No scripting/automation** needs
- ✅ Want to **preview and verify** before uploading

**Best for:** Quick uploads, one-time document additions, testing new content

---

### 🔧 Use Ingestion Scripts if you have:
- ✅ **200+ files** in organized folders
- ✅ **Consistent folder structures** (e.g., Direct Mail, Visa, Airline)
- ✅ Need to **preserve folder hierarchy** in Knowledge Base
- ✅ Want **batch naming conventions** applied automatically
- ✅ Need **validation and deduplication** before upload
- ✅ Want **progress tracking** for long-running uploads

**Best for:** Initial knowledge base setup, bulk migrations, structured content imports

---

### 🚀 Use the API if you have:
- ✅ **Files from another system** (CMS, Dropbox, SharePoint, etc.)
- ✅ **CI/CD pipeline integration** needs
- ✅ **Automation tools** triggering uploads
- ✅ **Programmatic error handling** requirements
- ✅ **Webhook-based uploads** from external services
- ✅ Need to **track upload metadata** programmatically

**Best for:** System integrations, automated workflows, third-party connectors

---

## 🖱️ Method 1: Web UI Upload (Recommended for < 200 files)

### Quick Start

1. Navigate to **Knowledge** page in Tala AI
2. Click the **Upload** button or drag files directly into the upload zone
3. Select target **category** and **folder** (optional)
4. Monitor progress as files upload
5. Wait for processing to complete (embeddings generation)

### Features

- **Drag-and-drop** support for single or multiple files
- **Up to 500 MB** per file
- **3 concurrent uploads** at a time (configurable)
- **Per-file progress** tracking with pause/resume
- **Automatic retry** on transient failures
- **Visual feedback** for each upload stage:
  - ⬆️ Uploading
  - ⚙️ Processing (extracting text, generating embeddings)
  - ✅ Complete
  - ❌ Failed (with retry option)

### Supported File Types

| Format | Extension | Max Size | Notes |
|--------|-----------|----------|-------|
| PDF | `.pdf` | 500 MB | Searchable and image PDFs |
| Word | `.doc`, `.docx` | 500 MB | Full text extraction |
| Text | `.txt`, `.md` | 100 MB | Plain text and markdown |
| Excel | `.xls`, `.xlsx` | 100 MB | Converted to structured text |
| PowerPoint | `.ppt`, `.pptx` | 200 MB | Slide content extraction |
| Images | `.jpg`, `.png` | 50 MB | OCR for text extraction |

### Best Practices

1. **Organize locally first** - Group files by category before uploading
2. **Use descriptive filenames** - Helps with search and retrieval
3. **Verify file quality** - Ensure PDFs are searchable, not just images
4. **Upload in batches** - Don't drop 500 files at once; do 50-100 at a time
5. **Monitor completion** - Wait for processing to finish before uploading more

---

## 🔧 Method 2: Ingestion Scripts (Recommended for 200+ files)

### Prerequisites

```bash
# Navigate to server directory
cd server

# Ensure dependencies are installed
npm install

# Verify environment variables
cat .env | grep -E "QDRANT|OPENAI|DATABASE"
```

### Step 1: Organize Your Files

Create folder structure under `server/knowledge/`:

```
server/knowledge/
├── direct-mail/
│   ├── postcards/
│   │   ├── design-guide.pdf
│   │   ├── usps-specs-2024.pdf
│   │   └── postcard-templates.docx
│   ├── mailers/
│   └── case-studies/
├── visa/
│   ├── schengen/
│   │   ├── france-requirements.pdf
│   │   └── germany-requirements.pdf
│   ├── us-visa/
│   └── uk-visa/
├── airline/
│   ├── baggage-policies/
│   ├── booking-procedures/
│   └── refund-policies/
└── destination/
    ├── europe/
    ├── asia/
    └── americas/
```

### Step 2: Validate Files Before Upload

Run the validation script to catch issues early:

```bash
npm run validate:knowledge

# Or with specific path
node scripts/validate-knowledge.js ./knowledge/direct-mail
```

**What it checks:**
- ✅ File size limits
- ✅ Supported file types
- ✅ Duplicate content (by hash)
- ✅ Empty or corrupted files
- ✅ Naming convention compliance
- ✅ Folder structure validity

**Example output:**
```
🔍 Validating 247 files in ./knowledge/direct-mail...

✅ File types: All supported
✅ File sizes: All within limits
⚠️  Duplicates: 3 found
   - postcard-guide.pdf (duplicate of design-guide.pdf)
   - usps-specs.pdf (duplicate of usps-specs-2024.pdf)
   - template-1.docx (duplicate of postcard-templates.docx)
❌ Invalid files: 2 found
   - corrupted.pdf: File is corrupted or empty
   - image.bmp: Unsupported file type

📊 Summary:
   Total files: 247
   Valid: 242
   Duplicates: 3
   Invalid: 2
   Ready to upload: 242 files

💡 Recommendation: Remove duplicates and fix invalid files before proceeding
```

### Step 3: Run Ingestion Script

```bash
# Ingest all direct mail documents
npm run ingest:direct-mail

# Or specify custom path
node scripts/upload-knowledge.js --path ./knowledge/visa --category visa

# With options
node scripts/upload-knowledge.js \
  --path ./knowledge/direct-mail \
  --category direct-mail \
  --batch-size 10 \
  --concurrent 3 \
  --skip-duplicates
```

**Available options:**
- `--path` - Path to documents (default: `./knowledge`)
- `--category` - Category for all documents (default: inferred from folder)
- `--batch-size` - Documents per batch (default: 10)
- `--concurrent` - Concurrent uploads (default: 3)
- `--skip-duplicates` - Skip files with duplicate content
- `--dry-run` - Validate without uploading
- `--verbose` - Show detailed logs

**Example output:**
```
📦 Starting bulk knowledge ingestion...
📁 Source: ./knowledge/direct-mail
📊 Found 242 valid documents

🔍 Phase 1: Validation (30s)
   ✅ File types validated
   ✅ Duplicate check complete
   ✅ Ready to upload: 242 files

⬆️  Phase 2: Upload (5m 30s)
   [████████████████████████████████] 242/242 files
   ✅ Uploaded: 242
   ❌ Failed: 0
   ⏭️  Skipped: 0

⚙️  Phase 3: Processing (12m 15s)
   [████████████████████████████████] 242/242 documents
   ✅ Text extracted: 242
   ✅ Embeddings generated: 242
   ✅ Qdrant indexed: 242
   ❌ Failed: 0

✨ Ingestion complete!
   📊 Total time: 18m 15s
   📄 Documents added: 242
   🏷️  Categories: 1 (direct-mail)
   📁 Folders: 8
   💾 Storage used: 1.2 GB
   🔖 Batch ID: batch_2024_01_15_1547

💡 Next steps:
   - Verify documents in Knowledge Base UI
   - Run search tests: npm run test:search
   - Monitor Qdrant: npm run qdrant:stats
```

### Step 4: Monitor Progress

In a separate terminal, monitor real-time progress:

```bash
# Watch upload progress
npm run watch:upload -- batch_2024_01_15_1547

# Check Qdrant indexing status
npm run qdrant:stats

# View detailed logs
tail -f logs/knowledge-ingestion.log
```

### Step 5: Verify Upload

```bash
# Check batch status
npm run check:batch -- batch_2024_01_15_1547

# Search test
npm run test:search -- "postcard design guide"

# List recent uploads
npm run list:batches -- --limit 10
```

---

## 🚀 Method 3: API Upload (For Integrations)

### Single File Upload

```javascript
const uploadDocument = async (filePath, category, folder) => {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));
  formData.append('category', category);
  formData.append('folderId', folder);
  formData.append('visibility', 'organization');
  
  const response = await fetch('https://your-api.com/api/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'x-user-id': userId
    },
    body: formData
  });
  
  const { documentId, status } = await response.json();
  console.log(`Uploaded: ${documentId}`);
  return documentId;
};
```

### Bulk Upload with Processing

```javascript
const bulkUpload = async (files) => {
  // Upload all files
  const documentIds = [];
  for (const file of files) {
    const id = await uploadDocument(file.path, file.category, file.folder);
    documentIds.push(id);
  }
  
  // Trigger bulk processing
  const response = await fetch('https://your-api.com/api/documents/bulk-process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ documentIds })
  });
  
  const { jobId } = await response.json();
  
  // Monitor progress
  const status = await monitorJob(jobId);
  return status;
};

const monitorJob = async (jobId) => {
  while (true) {
    const response = await fetch(`https://your-api.com/api/documents/jobs/${jobId}`);
    const { status, completed, total, errors } = await response.json();
    
    console.log(`Progress: ${completed}/${total} (${errors.length} errors)`);
    
    if (status === 'completed') {
      return { completed, total, errors };
    }
    
    if (status === 'failed') {
      throw new Error('Job failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};
```

### Webhook Integration

```javascript
// Express.js webhook endpoint
app.post('/webhook/document-uploaded', async (req, res) => {
  const { documentUrl, metadata } = req.body;
  
  // Download document
  const response = await fetch(documentUrl);
  const buffer = await response.buffer();
  
  // Upload to Tala
  const documentId = await uploadDocument(buffer, metadata.category);
  
  res.json({ success: true, documentId });
});
```

---

## 🛠️ Utilities & Maintenance

### Deduplication

Remove duplicate documents from the knowledge base:

```bash
# Find duplicates
npm run dedupe:find

# Remove duplicates (dry run)
npm run dedupe:remove -- --dry-run

# Remove duplicates (actually delete)
npm run dedupe:remove

# Keep newest versions
npm run dedupe:remove -- --keep newest
```

**Example output:**
```
🔍 Scanning for duplicates...

Found 12 duplicate sets:

1. "USPS Postcard Specifications" (3 duplicates)
   - doc_abc123 (2024-01-15) ✅ Keep (newest)
   - doc_def456 (2024-01-10) ❌ Remove
   - doc_ghi789 (2023-12-20) ❌ Remove

2. "France Visa Requirements" (2 duplicates)
   - doc_jkl012 (2024-01-12) ✅ Keep (newest)
   - doc_mno345 (2023-11-05) ❌ Remove

📊 Summary:
   Duplicate sets: 12
   Documents to remove: 18
   Storage to free: 245 MB

⚠️  This was a dry run. Use --confirm to actually remove duplicates.
```

### Rollback Failed Batches

If a batch fails or has issues:

```bash
# Rollback specific batch
npm run rollback:batch -- batch_2024_01_15_1547

# Rollback with confirmation
npm run rollback:batch -- batch_2024_01_15_1547 --confirm

# Rollback last N batches
npm run rollback:batch -- --last 3
```

**Example output:**
```
🔄 Rolling back batch: batch_2024_01_15_1547

📊 Batch details:
   Documents: 242
   Uploaded: 2024-01-15 15:47:32
   Status: partial_failure
   Errors: 15 documents failed processing

⚠️  This will:
   - Delete 227 successfully processed documents
   - Remove 227 vectors from Qdrant
   - Free up 1.1 GB storage
   - This action cannot be undone

Proceed? (y/N): y

🗑️  Removing from Qdrant... ████████████████ 227/227
🗑️  Removing from database... ████████████████ 227/227
🗑️  Deleting files from S3... ████████████████ 227/227

✅ Rollback complete!
   Removed: 227 documents
   Freed: 1.1 GB
   Time: 2m 34s
```

### System Health Check

Verify the knowledge base system is healthy:

```bash
npm run check:knowledge-system
```

**Example output:**
```
🏥 Knowledge Base System Health Check

Database Connection:
   ✅ Connected to PostgreSQL
   ✅ Documents table: 3,247 rows
   ✅ Folders table: 156 rows
   ✅ Batch tracking: 47 batches

Qdrant Vector Database:
   ✅ Connected to Qdrant at qdrant.example.com
   ✅ Collection: knowledge_base
   ✅ Vectors: 3,247
   ✅ Dimensions: 1536 (OpenAI ada-002)
   ⚠️  Orphaned vectors: 15 (not in database)

OpenAI API:
   ✅ API key valid
   ✅ Rate limit: 5000 RPM / 200000 TPM
   ✅ Current usage: 23% of quota

Storage (AWS S3):
   ✅ Connected to S3 bucket: tala-documents
   ✅ Total size: 12.4 GB
   ✅ Total documents: 3,247
   ⚠️  Orphaned files: 8 (not in database)

Processing Queue:
   ✅ Active jobs: 0
   ✅ Pending: 0
   ⚠️  Failed (last 24h): 3

📊 Overall Status: HEALTHY ✅
⚠️  Recommendations:
   - Clean up 15 orphaned Qdrant vectors
   - Remove 8 orphaned S3 files
   - Retry 3 failed processing jobs
```

---

## 📁 File Organization Best Practices

### Folder Structure

```
knowledge/
├── visa/                     # Top-level category
│   ├── schengen/            # Regional grouping
│   │   ├── france/          # Country-specific
│   │   │   ├── requirements.pdf
│   │   │   ├── application-process.pdf
│   │   │   └── faq.md
│   │   └── germany/
│   ├── us-visa/
│   └── uk-visa/
├── direct-mail/
│   ├── postcards/
│   ├── mailers/
│   └── catalogs/
└── airline/
    ├── booking/
    ├── baggage/
    └── refunds/
```

### Naming Conventions

**✅ Good:**
- `france-visa-requirements-2024.pdf`
- `usps-postcard-specifications-v3.pdf`
- `delta-baggage-policy-domestic.pdf`

**❌ Avoid:**
- `requirements.pdf` (too generic)
- `Visa Requirements France.pdf` (spaces, mixed case)
- `final_FINAL_v2_EDITED.docx` (confusing versioning)

### Version Control

For versioned documents, use date prefixes:

```
2024-01-15-france-visa-requirements.pdf  (latest)
2023-11-20-france-visa-requirements.pdf
2023-06-10-france-visa-requirements.pdf
```

Or use version numbers:

```
france-visa-requirements-v3.pdf  (latest)
france-visa-requirements-v2.pdf
france-visa-requirements-v1.pdf
```

---

## 🐛 Troubleshooting

### "Qdrant connection failed"

```bash
# Check Qdrant connection
curl $QDRANT_URL/health

# Verify environment variables
echo $QDRANT_URL
echo $QDRANT_API_KEY

# Test connection with script
npm run test:qdrant
```

### "OpenAI rate limit exceeded"

```bash
# Reduce batch size
node scripts/upload-knowledge.js --batch-size 5

# Add delays between batches
node scripts/upload-knowledge.js --delay 2000

# Check current usage
npm run check:openai-usage
```

### "Out of memory during processing"

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run ingest:direct-mail

# Process in smaller batches
node scripts/upload-knowledge.js --batch-size 5 --concurrent 1

# Split large PDFs first
npm run split:large-pdfs -- --max-size 50MB
```

### "Duplicate documents detected"

```bash
# Find and review duplicates
npm run dedupe:find

# Remove duplicates keeping newest
npm run dedupe:remove -- --keep newest --confirm
```

### "Processing stuck at 95%"

```bash
# Check processing queue
npm run check:queue

# View failed jobs
npm run list:failed-jobs

# Retry failed jobs
npm run retry:failed-jobs

# Clear stuck jobs
npm run clear:stuck-jobs
```

---

## 📈 Performance Optimization

### Batch Size Tuning

| Documents | Recommended Batch Size | Concurrent Uploads |
|-----------|----------------------|-------------------|
| < 100 | 10 | 3 |
| 100-500 | 20 | 5 |
| 500-1000 | 30 | 5 |
| 1000+ | 50 | 10 |

### Rate Limits

| Service | Limit | Throttling Strategy |
|---------|-------|-------------------|
| OpenAI Embeddings | 5000 RPM | 10 docs/batch, 2s delay |
| Qdrant Insert | No hard limit | 50 vectors/batch |
| S3 Upload | 3500 PUT/s | No throttling needed |
| Database Insert | Connection pool | 100 rows/batch |

### Memory Management

```bash
# For large document sets
NODE_OPTIONS="--max-old-space-size=8192" npm run ingest:large-batch

# Enable garbage collection logging
NODE_OPTIONS="--max-old-space-size=4096 --expose-gc" npm run ingest
```

---

## 🔐 Security Best Practices

1. **Never commit API keys** to the repository
2. **Use environment variables** for all credentials
3. **Verify file types** before processing (prevent malicious uploads)
4. **Scan for sensitive data** before uploading (PII, SSN, credit cards)
5. **Use signed S3 URLs** with expiration for downloads
6. **Enable virus scanning** on uploaded files
7. **Audit upload activity** with detailed logging
8. **Restrict API access** with proper authentication

---

## 📞 Support

- **Documentation**: [docs.tala.ai/knowledge-base](https://docs.tala.ai/knowledge-base)
- **Issues**: [github.com/tala/issues](https://github.com/tala/issues)
- **Email**: support@tala.ai
- **Slack**: #knowledge-base channel

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Upload via UI | Navigate to Knowledge → Upload |
| Validate files | `npm run validate:knowledge` |
| Bulk ingest | `npm run ingest:direct-mail` |
| Check duplicates | `npm run dedupe:find` |
| Rollback batch | `npm run rollback:batch -- <batch-id>` |
| Health check | `npm run check:knowledge-system` |
| Monitor progress | `npm run watch:upload -- <batch-id>` |
| Test search | `npm run test:search -- "query"` |

---

**Last Updated:** January 2024  
**Version:** 2.0
