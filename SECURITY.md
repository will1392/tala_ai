# Security Guidelines

## 🔐 API Key Security

### CRITICAL: Never commit API keys to Git!

This project uses environment variables to manage sensitive API keys and credentials. 

### Setup Instructions:

1. **Backend Configuration** (`/server/.env`):
   - Copy `server/.env.example` to `server/.env`
   - Fill in your actual API keys
   - This file is automatically ignored by git

2. **Frontend Configuration** (`/.env`):
   - Copy `.env.example` to `.env`
   - Fill in your actual API keys (if needed)
   - This file is automatically ignored by git

### Security Checklist:

✅ **DO:**
- Keep `.env` files local only
- Use `.env.example` files to share configuration structure
- Regularly rotate API keys
- Use different keys for development and production
- Store production keys in secure environment variables

❌ **DON'T:**
- Commit `.env` files to git
- Share API keys in code comments
- Log API keys to console
- Include keys in error messages
- Share keys via email or chat

### Git Configuration:

The following patterns are already in `.gitignore`:
- `.env*` (except `.env.example` and `.env.test`)
- `*api_key*`
- `*secret*`
- `credentials*.json`
- `service-account*.json`

### If You Accidentally Commit Keys:

1. Immediately rotate all affected keys
2. Remove the commit from history using `git filter-branch` or BFG Repo-Cleaner
3. Force push the cleaned history
4. Notify your team

### Environment Variables Required:

See `.env.example` files for the complete list of required environment variables.

## 🛡️ Additional Security Measures

- All API endpoints require authentication
- Rate limiting is enabled on all routes
- CORS is configured for specific origins only
- SQL injection protection via parameterized queries
- XSS protection via content sanitization
- HTTPS required in production

## 📧 Security Contact

If you discover a security vulnerability, please email security@[your-domain].com