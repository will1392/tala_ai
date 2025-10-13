import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContextNew';
import { useNavigate } from 'react-router-dom';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (theme !== 'dark') {
      setTheme('dark');
    }
  }, [theme, setTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-transparent">
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
            className="flex items-center justify-center mx-auto mb-4"
          >
            <img 
              src="/assets/tala-logo-sidebar.svg"
              alt="Tala AI"
              className="h-16 w-auto dark:block hidden"
            />
            <img 
              src="/assets/tala-logo-light.svg"
              alt="Tala AI"
              className="h-16 w-auto dark:hidden block"
            />
          </motion.div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Welcome to Tala AI</h1>
          <p className="text-gray-600 dark:text-white/70">Your AI-powered travel assistant</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-white">Email</label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/50" />
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
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-white">Password</label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/50" />
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/50 hover:text-gray-600 dark:hover:text-white"
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
        </GlassCard>
      </motion.div>
    </div>
  );
};