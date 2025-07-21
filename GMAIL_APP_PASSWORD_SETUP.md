# Alternative: Gmail App Password Setup (Simpler)

If OAuth is giving you trouble, use Gmail App Passwords for testing:

## Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification if not already enabled

## Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" from dropdown
3. Click "Generate"
4. Copy the 16-character password

## Step 3: Update Backend
Add to your `.env` file:
```env
# Gmail App Password (simpler than OAuth)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-password
EMAIL_AUTH_TYPE=app_password
```

## Step 4: Update Frontend
I'll create a simple email connection that uses app passwords instead of OAuth.

This bypasses the OAuth consent screen issues and gets you testing immediately.