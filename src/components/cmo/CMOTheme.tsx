import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CMOTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  gradient: string;
}

interface CMOThemeContextType {
  theme: CMOTheme;
  isActive: boolean;
  setActive: (active: boolean) => void;
}

const defaultTheme: CMOTheme = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#ec4899',
  background: '#fafafa',
  surface: '#ffffff',
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  gradient: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
};

const cmoTheme: CMOTheme = {
  primary: '#7c3aed',
  secondary: '#2563eb',
  accent: '#dc2626',
  background: '#f5f3ff',
  surface: '#ffffff',
  text: '#1e1b4b',
  muted: '#6b7280',
  border: '#e0e7ff',
  gradient: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)'
};

const CMOThemeContext = createContext<CMOThemeContextType>({
  theme: defaultTheme,
  isActive: false,
  setActive: () => {}
});

export const useCMOTheme = () => useContext(CMOThemeContext);

interface CMOThemeProviderProps {
  children: React.ReactNode;
}

export const CMOThemeProvider: React.FC<CMOThemeProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(defaultTheme);

  useEffect(() => {
    if (isActive) {
      // Animate theme transition
      document.documentElement.style.setProperty('--transition-duration', '500ms');
      
      // Apply CMO theme colors
      Object.entries(cmoTheme).forEach(([key, value]) => {
        if (key !== 'gradient') {
          document.documentElement.style.setProperty(`--color-${key}`, value);
        }
      });

      setCurrentTheme(cmoTheme);

      // Add CMO mode class
      document.body.classList.add('cmo-mode');
    } else {
      // Revert to default theme
      Object.entries(defaultTheme).forEach(([key, value]) => {
        if (key !== 'gradient') {
          document.documentElement.style.setProperty(`--color-${key}`, value);
        }
      });

      setCurrentTheme(defaultTheme);

      // Remove CMO mode class
      document.body.classList.remove('cmo-mode');
    }
  }, [isActive]);

  const setActive = (active: boolean) => {
    setIsActive(active);
  };

  return (
    <CMOThemeContext.Provider value={{ theme: currentTheme, isActive, setActive }}>
      {children}
      <ThemeTransitionOverlay isActive={isActive} />
    </CMOThemeContext.Provider>
  );
};

// Theme transition overlay
const ThemeTransitionOverlay: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShow(true);
      setTimeout(() => setShow(false), 1000);
    }
  }, [isActive]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50"
        >
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0) 0%, transparent 100%)',
                'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.2) 0%, transparent 100%)',
                'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0) 0%, transparent 100%)',
              ]
            }}
            transition={{ duration: 1 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Custom CSS for CMO mode
export const CMOThemeStyles = () => (
  <style jsx global>{`
    :root {
      --transition-duration: 300ms;
    }

    body.cmo-mode {
      transition: background-color var(--transition-duration) ease-in-out;
    }

    body.cmo-mode * {
      transition: color var(--transition-duration) ease-in-out,
                  background-color var(--transition-duration) ease-in-out,
                  border-color var(--transition-duration) ease-in-out;
    }

    body.cmo-mode .bg-primary {
      background: var(--color-primary) !important;
    }

    body.cmo-mode .text-primary {
      color: var(--color-primary) !important;
    }

    body.cmo-mode .border-primary {
      border-color: var(--color-primary) !important;
    }

    body.cmo-mode .gradient-primary {
      background: var(--color-gradient) !important;
    }

    /* Animated gradients for CMO mode */
    body.cmo-mode .animated-gradient {
      background: linear-gradient(-45deg, #7c3aed, #2563eb, #dc2626, #8b5cf6);
      background-size: 400% 400%;
      animation: gradient 15s ease infinite;
    }

    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* Glow effects */
    body.cmo-mode .glow-primary {
      box-shadow: 0 0 20px rgba(124, 58, 237, 0.5);
    }

    body.cmo-mode .glow-secondary {
      box-shadow: 0 0 20px rgba(37, 99, 235, 0.5);
    }

    /* Hover animations */
    body.cmo-mode .hover-lift {
      transition: transform 0.2s ease;
    }

    body.cmo-mode .hover-lift:hover {
      transform: translateY(-2px);
    }

    /* Pulse animation */
    body.cmo-mode .pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `}</style>
);

export default CMOThemeProvider;