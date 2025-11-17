# Google Drive Integration Setup

This guide will help you set up Google Drive integration for the Knowledge Base feature.

## Prerequisites

- A Google Cloud Platform account
- Access to Google Cloud Console

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Tala AI Drive Integration")
4. Click "Create"

### 2. Enable Required APIs

1. In your project, go to **APIs & Services** → **Library**
2. Search for and enable the following APIs:
   - **Google Drive API**
   - **Google Picker API**

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: External (or Internal if using Google Workspace)
   - App name: "Tala AI"
   - User support email: Your email
   - Developer contact email: Your email
   - Add scopes: `https://www.googleapis.com/auth/drive.readonly` and `https://www.googleapis.com/auth/drive.file`
4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Tala AI Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - Add your production domain when deploying
   - Authorized redirect URIs: (leave empty for this integration)
5. Click **Create**
6. Copy the **Client ID** (it will look like: `xxxxx.apps.googleusercontent.com`)

### 4. Create an API Key

1. In **Credentials**, click **+ CREATE CREDENTIALS** → **API key**
2. Copy the API key
3. (Recommended) Click **Restrict Key**:
   - API restrictions → Restrict key
   - Select: **Google Drive API** and **Google Picker API**
   - HTTP referrers (optional): Add `localhost:5173/*` for development
4. Click **Save**

### 5. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your Google credentials to `.env.local`:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=your-api-key
   ```

3. Restart your development server

### 6. Test the Integration

1. Navigate to the Knowledge Base
2. Click "Upload" to open the upload modal
3. Select a folder
4. You should see an "Import from Google Drive" button
5. Click it and authenticate with Google
6. Select files from your Google Drive
7. Files will be imported into your Knowledge Base

## Security Notes

- **Never commit** your `.env.local` file to version control
- API keys should be restricted to specific APIs and domains
- For production, use environment-specific credentials
- Consider implementing additional security measures like:
  - Domain whitelisting
  - User authentication verification
  - File size limits
  - File type restrictions

## Troubleshooting

### "Failed to open Google Drive picker"
- Check that both APIs are enabled in Google Cloud Console
- Verify your Client ID and API Key are correct
- Check browser console for specific error messages

### "Authentication failed"
- Ensure OAuth consent screen is properly configured
- Verify authorized JavaScript origins include your domain
- Check that required scopes are added to the OAuth consent screen

### Files not importing
- Check browser console for errors
- Verify the file type is supported
- Ensure the user has permission to access the file in Google Drive
- Check network tab for failed API requests

## Supported File Types

The integration automatically handles:
- Google Docs (exported as PDF)
- Google Sheets (exported as Excel)
- Google Slides (exported as PowerPoint)
- PDFs
- Word documents
- Images
- And other standard file formats

## API Limits

Google Drive API has usage limits:
- Queries per day: 1,000,000,000
- Queries per 100 seconds per user: 1,000

For most applications, these limits should be sufficient. Monitor your usage in the Google Cloud Console.
