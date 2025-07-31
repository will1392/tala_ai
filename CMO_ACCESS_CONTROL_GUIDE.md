# CMO Mode Access Control Guide

## Current Status
Currently, CMO Mode is accessible to **all authenticated users** through:
1. **Chat Interface** - Users can switch between Travel and CMO modes
2. **Direct Route** - `/cmo` route in the sidebar (just added)

## No Role-Based Restrictions
The current implementation has:
- Basic authentication (user must be logged in)
- No role-based access control
- No admin-only restrictions
- No agent-specific permissions

## How to Add Role-Based Access

### 1. Update User Model
Add a role field to your user data:
```javascript
// In your user schema/model
{
  id: 'user-123',
  email: 'user@example.com',
  role: 'admin' | 'agent' | 'user', // Add role field
  permissions: ['cmo_access'] // Optional: granular permissions
}
```

### 2. Update Auth Middleware
Modify `server/middleware/auth.js`:
```javascript
export const requireCMOAccess = (req, res, next) => {
  // Check if user has CMO access
  const userRole = req.user?.role;
  const hasPermission = req.user?.permissions?.includes('cmo_access');
  
  if (userRole === 'admin' || userRole === 'agent' || hasPermission) {
    next();
  } else {
    res.status(403).json({ error: 'CMO Mode access required' });
  }
};
```

### 3. Protect Backend Routes
Add middleware to CMO-specific endpoints:
```javascript
// In your routes
router.post('/api/cmo/*', requireAuth, requireCMOAccess, (req, res) => {
  // CMO-specific functionality
});
```

### 4. Frontend Access Control
Create a permission hook:
```typescript
// hooks/usePermissions.ts
export const usePermissions = () => {
  const user = useAuthStore(state => state.user);
  
  const hasCMOAccess = () => {
    return ['admin', 'agent'].includes(user?.role) || 
           user?.permissions?.includes('cmo_access');
  };
  
  return { hasCMOAccess };
};
```

### 5. Conditionally Show CMO Features
Update the sidebar to check permissions:
```typescript
// In Sidebar.tsx
const { hasCMOAccess } = usePermissions();

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/email', icon: Mail, label: 'Email' },
  ...(hasCMOAccess() ? [
    { path: '/cmo', icon: Target, label: 'CMO Mode' }
  ] : []),
  { path: '/settings', icon: Settings, label: 'Settings' },
];
```

### 6. Protect Routes
Add route guards:
```typescript
// In App.tsx
import { ProtectedRoute } from './components/auth/ProtectedRoute';

<Route 
  path="cmo" 
  element={
    <ProtectedRoute requiredRole={['admin', 'agent']}>
      <CMOModeFull />
    </ProtectedRoute>
  } 
/>
```

## Quick Implementation Options

### Option 1: Admin Only
Make CMO Mode admin-only by checking in the frontend:
```typescript
// Quick check in CMODashboardWithTour.tsx
const isAdmin = localStorage.getItem('userRole') === 'admin';
if (!isAdmin) {
  return <div>Access Denied: Admin only</div>;
}
```

### Option 2: Feature Flags
Use feature flags for gradual rollout:
```typescript
// In your environment config
const FEATURES = {
  CMO_MODE: process.env.REACT_APP_CMO_ENABLED === 'true',
  CMO_ROLES: ['admin', 'agent'] // Allowed roles
};
```

### Option 3: User-Specific Access
Store CMO access in user preferences:
```typescript
// In user settings
{
  userId: 'user-123',
  features: {
    cmoAccess: true,
    cmoOnboardingCompleted: false
  }
}
```

## Current Access Points
1. **Mode Selector in Chat** - All users can switch modes
2. **CMO Dashboard Route** - `/cmo` accessible to all authenticated users
3. **API Endpoints** - Currently no CMO-specific protection

## Recommendations
1. **For Testing**: Keep it open to all users
2. **For Production**: Implement role-based access control
3. **For Gradual Rollout**: Use feature flags
4. **For Premium Feature**: Add to subscription tiers