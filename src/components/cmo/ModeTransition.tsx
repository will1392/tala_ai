import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, TrendingUp, Target, Palette } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModeTransitionProps {
  isActive: boolean;
  onComplete?: () => void;
}

export const ModeTransition: React.FC<ModeTransitionProps> = ({ isActive, onComplete }) => {
  const [showTransition, setShowTransition] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (isActive) {
      setShowTransition(true);
      setPhase(0);
      
      // Animate through phases
      const phases = [1, 2, 3];
      phases.forEach((p, index) => {
        setTimeout(() => setPhase(p), (index + 1) * 400);
      });

      // Complete transition
      setTimeout(() => {
        setShowTransition(false);
        onComplete?.();
      }, 2000);
    }
  }, [isActive, onComplete]);

  if (!showTransition) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-none"
      >
        {/* Background gradient animation */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
              'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
              'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
              'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
            ]
          }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {/* Center animation */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="relative"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2 }}
          >
            {/* Main icon */}
            <motion.div
              className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center",
                "bg-gradient-to-br from-primary to-purple-600"
              )}
              animate={{ 
                rotate: [0, 360],
                boxShadow: [
                  '0 0 0 0 rgba(99, 102, 241, 0.4)',
                  '0 0 0 20px rgba(99, 102, 241, 0)',
                  '0 0 0 0 rgba(99, 102, 241, 0.4)',
                ]
              }}
              transition={{ duration: 2, ease: "easeInOut" }}
            >
              <Sparkles className="w-12 h-12 text-white" />
            </motion.div>

            {/* Orbiting icons */}
            {phase >= 1 && (
              <motion.div
                className="absolute top-0 left-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                transition={{ duration: 1.5, ease: "linear" }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                </div>
              </motion.div>
            )}

            {phase >= 2 && (
              <motion.div
                className="absolute top-0 left-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: -360 }}
                transition={{ duration: 1.5, ease: "linear" }}
              >
                <div className="absolute top-1/2 -right-8 -translate-y-1/2">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </motion.div>
            )}

            {phase >= 3 && (
              <>
                <motion.div
                  className="absolute top-0 left-0 w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, rotate: 360 }}
                  transition={{ duration: 1.5, ease: "linear" }}
                >
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </motion.div>
                <motion.div
                  className="absolute top-0 left-0 w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, rotate: -360 }}
                  transition={{ duration: 1.5, ease: "linear" }}
                >
                  <div className="absolute top-1/2 -left-8 -translate-y-1/2">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                      <Palette className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>

          {/* Text animation */}
          <motion.div
            className="absolute top-full mt-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Activating CMO Mode
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Preparing your marketing command center...
            </p>
          </motion.div>
        </div>

        {/* Particle effects */}
        <ParticleEffect />
      </motion.div>
    </AnimatePresence>
  );
};

// Particle effect component
const ParticleEffect: React.FC = () => {
  const particles = Array.from({ length: 20 });

  return (
    <>
      {particles.map((_, index) => (
        <motion.div
          key={index}
          className="absolute w-2 h-2 bg-primary rounded-full"
          initial={{
            x: '50vw',
            y: '50vh',
            opacity: 0
          }}
          animate={{
            x: `${50 + (Math.random() - 0.5) * 100}vw`,
            y: `${50 + (Math.random() - 0.5) * 100}vh`,
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            delay: index * 0.1,
            ease: "easeOut"
          }}
        />
      ))}
    </>
  );
};

export default ModeTransition;