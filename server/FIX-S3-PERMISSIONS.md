# Fix S3 Permissions for Tala AI

Your AWS credentials are valid but the IAM user `sdk-tala` doesn't have the necessary permissions for the S3 bucket.

## Required IAM Policy

The user needs the following permissions on the `tala-ai` bucket. Add this policy to the IAM user:

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
            "Resource": "arn:aws:s3:::tala-ai/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::tala-ai"
        }
    ]
}
```

## Steps to Fix:

1. **Go to AWS IAM Console**
   - https://console.aws.amazon.com/iam/

2. **Find the user `sdk-tala`**
   - Click on Users
   - Search for `sdk-tala`

3. **Add Inline Policy**
   - Click on the user
   - Go to "Permissions" tab
   - Click "Add inline policy"
   - Choose "JSON" tab
   - Paste the policy above
   - Name it: `tala-ai-s3-access`

4. **Alternative: Attach S3 Full Access (Less Secure)**
   - Instead of inline policy, you can attach `AmazonS3FullAccess`
   - But this gives access to ALL buckets, not recommended

## Check Bucket Region

Your bucket might not be in `us-east-1`. To check:

1. Go to S3 Console: https://s3.console.aws.amazon.com/
2. Find `tala-ai` bucket
3. Check the region (shown in the bucket list)
4. Update `.env` with correct region:
   ```
   AWS_REGION=your-actual-region
   ```

## Test After Fixing

Once permissions are fixed:

1. Change `.env` back to:
   ```
   STORAGE_TYPE=s3
   ```

2. Test with:
   ```bash
   cd server
   node test-tala-bucket.js
   ```

3. If successful, restart your server and PDFs will upload to S3!

## Current Status

✅ AWS Credentials are valid
✅ Code is ready for S3
❌ IAM permissions need to be added
❓ Bucket region needs verification

The system is currently using local storage as a fallback until S3 permissions are fixed.