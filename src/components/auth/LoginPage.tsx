import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, UserCheck } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const fillCredentials = (userType: 'admin' | 'agent') => {
    if (userType === 'admin') {
      setEmail('admin@tala.ai');
      setPassword('admin123');
    } else {
      setEmail('agent1@travel.com');
      setPassword('agent123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 glow"
          >
            <span className="text-3xl font-bold text-secondary-900">T</span>
          </motion.div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Tala AI</h1>
          <p className="text-white/70">Your AI-powered travel assistant</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-sm text-white/60 mb-3 text-center">Demo Credentials:</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fillCredentials('admin')}
                className="flex items-center gap-2 text-xs"
              >
                <UserCheck size={16} />
                Admin Login
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fillCredentials('agent')}
                className="flex items-center gap-2 text-xs"
              >
                <UserCheck size={16} />
                Agent Login
              </Button>
            </div>
            <div className="mt-3 text-xs text-white/40 space-y-1">
              <p><strong>Admin:</strong> admin@tala.ai / admin123</p>
              <p><strong>Agent:</strong> agent1@travel.com / agent123</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};