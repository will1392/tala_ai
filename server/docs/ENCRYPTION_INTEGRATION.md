# End-to-End Encryption Integration Guide

This guide explains how to integrate and use the end-to-end encryption system implemented for Tala AI.

## Overview

The encryption system provides:
- **RSA-4096** asymmetric encryption for key exchange
- **AES-256-GCM** symmetric encryption for document content
- **Argon2id** for password-based key derivation
- **Hybrid encryption** for scalable document encryption
- **Per-user key management** with secure storage
- **Automatic middleware** for transparent operations
- **Client-side utilities** for frontend integration

## Architecture Components

### Server-Side Components

1. **EncryptionService** (`/server/security/EncryptionService.js`)
   - Document encryption/decryption
   - Key pair generation
   - Document sharing and access control

2. **KeyManager** (`/server/security/KeyManager.js`)
   - User key storage and retrieval
   - Key rotation and backup
   - Password verification

3. **EncryptedDocumentService** (`/server/services/db/encryptedDocumentService.js`)
   - High-level document operations
   - Transparent encryption/decryption
   - Access control and sharing

4. **Encryption Middleware** (`/server/middleware/encryption.js`)
   - Automatic encryption for marked documents
   - Request/response interception
   - Group document handling

5. **API Routes** (`/server/routes/encryption.js`)
   - REST endpoints for all operations
   - Authentication and validation
   - Error handling

6. **Database Schema** (`/server/migrations/create-encryption-tables.sql`)
   - User encryption keys storage
   - Document encryption metadata
   - Key sharing and audit logs

### Client-Side Components

1. **EncryptionClient** (`/server/public/js/encryption-client.js`)
   - JavaScript utilities for frontend
   - Password management UI
   - API integration helpers

## Quick Start

### 1. Database Setup

Run the encryption tables migration:

```sql
-- Execute the migration script
\i /server/migrations/create-encryption-tables.sql
```

### 2. Server Integration

Add encryption routes to your Express app:

```javascript
import encryptionRoutes from './routes/encryption.js';
import encryptionMiddleware from './middleware/encryption.js';

// Initialize encryption middleware
await encryptionMiddleware.initialize({
  autoEncryptPaths: ['/api/documents'],
  requireUserPassword: true,
  maxDocumentSize: 50 * 1024 * 1024
});

// Add encryption routes
app.use('/api/encryption', encryptionRoutes);

// Add encryption middleware to document routes
app.use('/api/documents', 
  encryptionMiddleware.createDocumentEncryptionMiddleware()
);

app.use('/api/documents/:id/share', 
  encryptionMiddleware.createDocumentSharingMiddleware()
);
```

### 3. Client-Side Usage

Include the encryption client and initialize:

```html
<script src="/js/encryption-client.js"></script>
<script>
  const encryptionClient = new EncryptionClient();
  
  async function initializeEncryption() {
    try {
      // Prompt user for password
      const password = await encryptionClient.promptForPassword();
      
      // Initialize client
      const result = await encryptionClient.initialize(password);
      
      if (result.success) {
        console.log('Encryption client ready');
      }
    } catch (error) {
      console.error('Encryption initialization failed:', error);
    }
  }
</script>
```

## API Usage Examples

### User Key Management

#### Generate Encryption Keys

```javascript
// Server-side (Express route)
app.post('/setup-encryption', async (req, res) => {
  const { userId, password } = req.body;
  
  const keyPair = await encryptionService.generateKeyPair(userId, password);
  const result = await keyManager.storeUserKeyPair(
    userId, 
    keyPair.publicKey, 
    keyPair.encryptedPrivateKey, 
    password
  );
  
  res.json({ success: true, fingerprint: result.fingerprint });
});

// Client-side
const result = await encryptionClient.generateKeys({
  keySize: 4096,
  backupKey: true
});
```

#### Verify User Password

```javascript
// Client-side
const verification = await encryptionClient.verifyPassword();
if (verification.data.valid) {
  console.log('Password verified');
}
```

### Document Operations

#### Create Encrypted Document

```javascript
// Using middleware (automatic encryption)
app.post('/api/documents', (req, res, next) => {
  // Set encryption header
  req.headers['x-encryption-required'] = 'true';
  req.headers['x-user-password'] = userPassword;
  
  // Document will be automatically encrypted
  next();
});

// Direct API usage
const document = await encryptionClient.createEncryptedDocument({
  title: 'Confidential Report',
  content: 'This is sensitive information...',
  shareWith: ['user2@example.com', 'user3@example.com'],
  tags: ['confidential', 'report']
});
```

#### Retrieve and Decrypt Document

```javascript
// Client-side
const document = await encryptionClient.getEncryptedDocument('doc-id', {
  includeContent: true
});

if (document.success) {
  console.log('Decrypted content:', document.data.content);
}
```

#### Share Encrypted Document

```javascript
// Client-side
const shareResult = await encryptionClient.shareEncryptedDocument(
  'document-id',
  ['user4@example.com', 'user5@example.com'],
  {
    permissions: ['read', 'comment'],
    notifyRecipients: true
  }
);
```

### Advanced Usage

#### Group Document Encryption

```javascript
// Create document for a team
const groupDoc = await encryptionClient.createEncryptedDocument({
  title: 'Team Planning Document',
  content: 'Team strategy and plans...',
  type: 'group',
  groupMembers: ['user1', 'user2', 'user3', 'user4'],
  groupName: 'Product Team',
  shareWith: [], // Will be set to groupMembers automatically
});
```

#### Key Rotation

```javascript
// Rotate user's encryption keys
const rotationResult = await encryptionClient.rotateKeys({
  keySize: 4096,
  backupOldKey: true
});

if (rotationResult.success) {
  console.log('Keys rotated successfully');
  console.log('New fingerprint:', rotationResult.data.newFingerprint);
}
```

## Security Best Practices

### Password Requirements

- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, and symbols
- Not based on dictionary words or personal information
- Regularly updated (every 90 days recommended)

### Key Management

- **Never store user passwords** in plain text
- **Always use secure channels** for password transmission
- **Implement key rotation** on a regular schedule
- **Create encrypted backups** of important keys
- **Audit all encryption operations** for compliance

### Data Handling

- **Clear sensitive data** from memory after use
- **Use secure random number generation** for all keys
- **Validate all inputs** before encryption operations
- **Implement proper error handling** without exposing sensitive information

### Network Security

- **Always use HTTPS** for all encryption API calls
- **Implement proper authentication** before encryption operations
- **Use secure headers** to prevent attacks
- **Rate limit encryption operations** to prevent abuse

## Error Handling

### Common Error Codes

- `USER_PASSWORD_REQUIRED`: User password needed for operation
- `NO_ENCRYPTION_KEYS`: User must generate keys first
- `ACCESS_DENIED`: User doesn't have access to encrypted document
- `DECRYPTION_FAILED`: Failed to decrypt document (wrong password/corrupted data)
- `KEY_GENERATION_FAILED`: Error during key generation
- `ENCRYPTION_FAILED`: Error during document encryption

### Error Response Format

```javascript
{
  "success": false,
  "error": {
    "code": "ACCESS_DENIED",
    "message": "User does not have access to this encrypted document"
  }
}
```

## Performance Considerations

### Caching

- Public keys are cached for 10 minutes
- Document metadata is cached for performance
- Clear caches on key rotation or permission changes

### Optimization

- Use compression for large documents before encryption
- Implement pagination for large document lists
- Consider async operations for bulk encryptions
- Monitor memory usage during encryption operations

### Scaling

- Database indexes are optimized for common queries
- Consider read replicas for high-traffic applications
- Implement connection pooling for database operations
- Use CDN for client-side encryption libraries

## Monitoring and Compliance

### Audit Logging

All encryption operations are logged with:
- Event type and timestamp
- User identification
- Success/failure status
- IP address and user agent
- Relevant metadata

### Health Monitoring

Check encryption service health:

```javascript
const health = await encryptionClient.checkHealth();
console.log('Encryption service status:', health.data.status);
```

### Compliance Features

- **GDPR compliance**: User data deletion capabilities
- **Audit trails**: Complete operation logging
- **Access controls**: Granular permission management
- **Data retention**: Configurable retention policies

## Troubleshooting

### Common Issues

1. **"User password required"**
   - Ensure password is included in request headers or body
   - Verify middleware configuration

2. **"No encryption keys found"**
   - User must generate keys first using `/api/encryption/keys`
   - Check database connectivity

3. **"Decryption failed"**
   - Verify user password is correct
   - Check if user has access to the document
   - Ensure document isn't corrupted

4. **"Key generation failed"**
   - Check system entropy
   - Verify sufficient system resources
   - Review server logs for specific errors

### Debug Mode

Enable detailed logging:

```javascript
// Set debug environment variable
process.env.ENCRYPTION_DEBUG = 'true';

// Or configure logging level
encryptionService.setLogLevel('debug');
```

## Migration Guide

### From Unencrypted to Encrypted

1. **Generate keys** for all existing users
2. **Run migration script** to encrypt existing documents
3. **Update client applications** to use encryption APIs
4. **Test thoroughly** with sample data
5. **Deploy incrementally** with feature flags

### Version Updates

1. **Backup encryption keys** before updates
2. **Test compatibility** with existing encrypted data
3. **Update client libraries** to match server versions
4. **Monitor for errors** during and after deployment

This completes the end-to-end encryption implementation for Tala AI. The system provides robust security while maintaining usability and performance.