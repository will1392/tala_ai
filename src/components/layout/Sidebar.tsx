import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  Mail,
  Settings,
  Sparkles,
  Target,
  CreditCard
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';
import { useCredits } from '../../hooks/useCredits';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', feature: 'DASHBOARD' },
  { path: '/knowledge', icon: BookOpen, label: 'Knowledge Base', feature: 'KNOWLEDGE' },
  { path: '/chat', icon: MessageSquare, label: 'Chat', feature: 'CHAT' },
  { path: '/email', icon: Mail, label: 'Email', feature: 'EMAIL' },
  { path: '/cmo', icon: Target, label: 'CMO Mode', feature: 'CMO' },
  { path: '/settings', icon: Settings, label: 'Settings', feature: 'SETTINGS' },
].filter(item => {
  // In production, only show enabled features
  if (import.meta.env.VITE_ENV === 'production') {
    const featureKey = `VITE_FEATURE_${item.feature}` as keyof ImportMetaEnv;
    const featureValue = import.meta.env[featureKey];
    // Check for both string 'true' and boolean true
    return featureValue === 'true' || featureValue === true;
  }
  // In development, show everything
  return true;
});

export const Sidebar = () => {
  const { resolvedTheme } = useTheme();
  const { creditInfo, loading: creditsLoading } = useCredits();
  const [userRole, setUserRole] = useState<string>('agent');

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem('userRole') || 'agent';
    setUserRole(role);
  }, []);

  const formatCredits = (credits: number): string => {
    if (credits >= 10000) {
      // For 10k+, show one decimal
      return `${(credits / 1000).toFixed(1)}k`;
    } else if (credits >= 1000) {
      // For 1k-9.9k, show two decimals to avoid rounding issues
      const value = credits / 1000;
      return `${value.toFixed(2)}k`;
    }
    return credits.toString();
  };

  const getPlanLabel = () => {
    if (!creditInfo) return 'Loading...';
    
    // Only show "Agency" for agency owners/admins
    if (creditInfo.plan_type === 'agency' && (userRole === 'admin' || userRole === 'owner')) {
      return 'Agency';
    }
    
    return 'Agent';
  };
  
  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-full w-64 glass-dark border-r border-white/10"
      role="complementary"
      aria-label="Main sidebar"
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img 
            src="/assets/tala-logo-sidebar.svg"
            alt="Tala AI"
            className="h-10 w-auto dark:block hidden"
          />
          <img 
            src="/assets/tala-logo-light.svg"
            alt="Tala AI"
            className="h-10 w-auto dark:hidden block"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
                'hover:bg-white/10 group',
                isActive && 'bg-primary/20 text-primary'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={20} 
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-primary' : 'text-white/70 group-hover:text-white'
                  )} 
                  aria-hidden="true"
                />
                <span className={cn(
                  'font-medium',
                  isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                )}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
        {/* Credit Display */}
        <NavLink
          to="/credits"
          className="glass rounded-xl p-3 flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group"
          role="region"
          aria-label="Credit balance"
        >
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-cyan-400" />
              <span className="text-sm font-medium">Credits</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-cyan-400">
                {creditsLoading ? '...' : formatCredits(creditInfo?.available_credits || 0)}
              </span>
              {creditInfo?.is_organization_pool && (
                <span className="text-xs text-white/40">(shared)</span>
              )}
            </div>
          </NavLink>

        {/* User Info */}
        <div className="glass rounded-xl p-4" role="region" aria-label="User profile">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full" aria-hidden="true" />
            <div>
              <p className="font-medium">Agency Name</p>
              <p className="text-sm text-white/60">{getPlanLabel()} Plan</p>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};