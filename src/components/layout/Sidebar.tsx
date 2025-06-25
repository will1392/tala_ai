import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  MessageSquare, 
  Settings,
  Sparkles
} from 'lucide-react';
import { cn } from '../../utils/cn';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export const Sidebar = () => {
  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-full w-64 glass-dark border-r border-white/10"
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center glow">
            <Sparkles className="text-secondary-900" size={20} />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
            Tala AI
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
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
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full" />
            <div>
              <p className="font-medium">Agency Name</p>
              <p className="text-sm text-white/60">Pro Plan</p>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};