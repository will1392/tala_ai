# Cloud Storage Setup Guide

This guide explains how to configure Tala AI to store PDFs in cloud storage (AWS S3 or Cloudinary) instead of locally.

## Benefits of Cloud Storage

- **Access from anywhere**: PDFs can be accessed from any computer or location
- **Scalability**: No local disk space limitations
- **Backup**: Cloud providers handle data redundancy
- **CDN support**: Faster loading through content delivery networks

## Configuration

### 1. AWS S3 Setup

#### Create S3 Bucket
1. Go to AWS S3 Console
2. Create a new bucket with a unique name
3. Choose your preferred region
4. Configure bucket settings:
   - Block all public access (recommended for security)
   - Enable versioning (optional)
   - Enable server-side encryption

#### Configure CORS (Important!)
Add this CORS configuration to your S3 bucket:
```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["http://localhost:5173", "https://your-domain.com"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

#### Create IAM User
1. Go to IAM Console
2. Create a new user with programmatic access
3. Attach the following policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:GetObjectAttributes"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name"
        }
    ]
}
```

### 2. Environment Variables

Add these to your `server/.env` file:

```env
# Storage Configuration
STORAGE_TYPE=s3  # Options: local, s3, cloudinary

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1  # or your preferred region
AWS_S3_BUCKET=your-bucket-name
```

### 3. Cloudinary Setup (Alternative)

If using Cloudinary instead of S3:
1. Create a Cloudinary account
2. Get your API credentials from the dashboard
3. Add to `.env`:
```env
STORAGE_TYPE=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Migration

To migrate existing PDFs from local storage to cloud:

```bash
cd server
node migrate-to-cloud-storage.js
```

This script will:
- Upload all existing PDFs to your configured cloud storage
- Update all document references in the database
- Preserve all metadata and relationships

## Testing

1. Upload a new PDF and verify it's stored in the cloud
2. View the PDF in the document viewer
3. Delete a document and verify it's removed from cloud storage

## Troubleshooting

### CORS Issues
If PDFs don't load in the viewer:
- Check S3 bucket CORS configuration
- Ensure your frontend URL is in AllowedOrigins
- Check browser console for CORS errors

### Access Denied
- Verify IAM user permissions
- Check AWS credentials in .env
- Ensure bucket name is correct

### Slow Uploads
- Consider using multipart uploads for large files
- Check your internet connection
- Use a region closer to your users

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use IAM roles** in production instead of access keys
3. **Enable S3 bucket encryption**
4. **Set up lifecycle policies** to manage old files
5. **Monitor AWS costs** with billing alerts

## Rollback

To switch back to local storage:
1. Set `STORAGE_TYPE=local` in .env
2. Restart the server
3. Existing cloud files will remain accessible