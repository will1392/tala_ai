# ES Module Import Fix

## 🐛 Issue Fixed

**Error**: `ReferenceError: Cannot access 'SupabaseDatabaseService' before initialization`

This error occurred when starting the server due to mixing CommonJS and ES module syntax.

## 🔧 Root Cause

1. **ExpertiseLearning.js** was using CommonJS `require()` to import an ES module
2. **expertise.js** route file was entirely written in CommonJS but importing ES modules

## ✅ Solution Applied

### 1. Fixed ExpertiseLearning.js
Changed from:
```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { SupabaseDatabaseService } = require('../db/SupabaseDatabaseService');
```

To:
```javascript
import { SupabaseDatabaseService } from '../db/SupabaseDatabaseService.js';
```

### 2. Converted expertise.js to ES Modules
- Changed all `require()` statements to `import`
- Changed `module.exports` to `export default`
- Updated middleware references from `req.user.id` to `req.userId`
- Added `.js` extensions to all local imports
- Fixed `authenticateToken` to `authenticate` for consistency

## 📋 Files Modified

1. `/server/services/expertise/ExpertiseLearning.js` - Fixed import syntax
2. `/server/routes/expertise.js` - Converted entire file to ES modules

## 🎯 Result

The server should now start without the initialization error. All expertise-related routes and services now use consistent ES module syntax, eliminating the CommonJS/ES module incompatibility issues.

## 🔍 Additional Notes

- ExpertiseAssessment.js and CommunicationAdapter.js were already using ES modules
- The SupabaseDatabaseService now properly initializes before being used
- All database operations in the expertise routes now properly initialize the database connection