import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContextNew';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

export const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (theme !== 'dark') {
      setTheme('dark');
    }
  }, [theme, setTheme]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setError('Invalid or expired invitation link. Please request a new invitation.');
          setIsCheckingSession(false);
          return;
        }

        if (!session) {
          setError('No active session found. Please use the invitation link from your email.');
          setIsCheckingSession(false);
          return;
        }

        console.log('Session found:', session.user.email);
        setIsCheckingSession(false);
      } catch (err) {
        console.error('Error checking session:', err);
        setError('Failed to verify invitation. Please try again.');
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      toast.success('Password set successfully! Redirecting to login...');
      
      // Sign out to force them to log in with new password
      await supabase.auth.signOut();
      
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      console.error('Error setting password:', err);
      setError(err instanceof Error ? err.message : 'Failed to set password');
      toast.error('Failed to set password');
    } finally {
      setIsLoading(false);
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
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Set Your Password</h1>
          <p className="text-gray-600 dark:text-white/70">Create a secure password for your Tala AI account</p>
        </div>

        <GlassCard>
          {isCheckingSession ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-white/70">Verifying invitation...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-white">New Password</label>
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

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-white">Confirm Password</label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/50" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-white/50 hover:text-gray-600 dark:hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-white/70">
              <p className="font-medium">Password requirements:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className={password.length >= 8 ? 'text-green-500' : 'text-gray-400'} />
                  At least 8 characters
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className={/[A-Z]/.test(password) ? 'text-green-500' : 'text-gray-400'} />
                  One uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className={/[a-z]/.test(password) ? 'text-green-500' : 'text-gray-400'} />
                  One lowercase letter
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className={/[0-9]/.test(password) ? 'text-green-500' : 'text-gray-400'} />
                  One number
                </li>
              </ul>
            </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Setting password...' : 'Set Password'}
              </Button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};
