import { Search, Bell, User, LogOut, Shield } from 'lucide-react';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useAuthStore } from '../../store/authStore';
import { motion } from 'framer-motion';

export const Navbar = () => {
  const { user, logout } = useAuthStore();

  return (
    <nav className="glass-dark border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={20} />
            <Input
              type="search"
              placeholder="Search knowledge base..."
              className="pl-10 w-full"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="relative p-2">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />
          </Button>
          
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{user?.name}</p>
                {user?.role === 'admin' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    title="Admin User"
                  >
                    <Shield size={16} className="text-primary" />
                  </motion.div>
                )}
              </div>
              <p className="text-xs text-white/60 capitalize">{user?.role}</p>
            </div>
            
            <Button variant="ghost" size="sm" className="p-2">
              <User size={20} />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="p-2"
              onClick={logout}
              title="Logout"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};