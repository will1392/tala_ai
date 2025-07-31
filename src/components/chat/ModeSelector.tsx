import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useMode } from '../../hooks/useMode';
import type { AppMode, CMOSubMode } from '../../hooks/useMode';
import toast from 'react-hot-toast';
import { DropdownPortal } from './DropdownPortal';

interface ModeSelectorProps {
  className?: string;
  compact?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ 
  className = '', 
  compact = false 
}) => {
  const {
    mode,
    subMode,
    isLoading,
    switchMode,
    updateSubMode,
    getModeTheme,
    getModeIcon,
    getSubModeLabel
  } = useMode();
  
  // Debug logging
  console.log('ModeSelector render:', { mode, isLoading, subMode });

  const [showSubModeDropdown, setShowSubModeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const theme = getModeTheme();


  const handleModeToggle = async () => {
    const newMode: AppMode = mode === 'travel' ? 'cmo' : 'travel';
    await switchMode(newMode, newMode === 'cmo' ? 'all' : null);
  };

  const handleModeSwitch = async (newMode: AppMode, newSubMode?: CMOSubMode | null) => {
    // Don't switch if already in that mode
    if (mode === newMode) {
      // Still show a toast to confirm current mode
      if (newMode === 'travel') {
        toast('✈️ Already in Travel Mode', {
          duration: 2000,
          style: {
            background: '#0fc6c6',
            color: 'white',
            boxShadow: '0 4px 12px rgba(15, 198, 198, 0.3)',
          },
        });
      } else {
        toast('🎯 Already in Marketing Mode', {
          duration: 2000,
          style: {
            background: '#ff6b6b',
            color: 'white',
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
          },
        });
      }
      return;
    }
    
    // Log for debugging
    console.log('Switching mode from', mode, 'to', newMode);
    
    await switchMode(newMode, newSubMode || null);
    
    // Show toast notification
    if (newMode === 'travel') {
      toast.success('✈️ Switched to Travel Mode — Let\'s plan your perfect trip!', {
        duration: 3000,
        style: {
          background: '#0fc6c6',
          color: 'white',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(15, 198, 198, 0.3)',
        },
        iconTheme: {
          primary: 'white',
          secondary: '#0fc6c6',
        },
      });
    } else {
      toast.success('🎯 Switched to Marketing Mode — Ready to grow your brand!', {
        duration: 3000,
        style: {
          background: '#ff6b6b',
          color: 'white',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
        },
        iconTheme: {
          primary: 'white',
          secondary: '#ff6b6b',
        },
      });
    }
  };

  const handleSubModeSelect = (newSubMode: CMOSubMode) => {
    updateSubMode(newSubMode);
    setShowSubModeDropdown(false);
  };

  const subModes: CMOSubMode[] = ['all', 'seo', 'email', 'social', 'directMail', 'ads'];

  if (compact) {
    // Compact version for mobile or smaller spaces
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={handleModeToggle}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
          style={{
            backgroundColor: theme.primary + '20',
            color: theme.primary,
            border: `1px solid ${theme.primary}40`
          }}
        >
          <span className="text-base">{getModeIcon()}</span>
          <span>{mode === 'travel' ? 'Travel' : 'CMO'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main Mode Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-lg"
            style={{ backgroundColor: theme.primary + '10' }}
            layoutId="mode-background"
          />
          
          <div className="relative flex items-center p-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg w-64 shadow-lg">
            {/* Background indicator that moves */}
            <motion.div
              className="absolute rounded-md shadow-lg"
              style={{ 
                backgroundColor: mode === 'travel' ? '#0fc6c6' : '#ff6b6b',
                width: 'calc(50% - 4px)',
                height: 'calc(100% - 8px)',
                top: '4px',
                left: '4px'
              }}
              animate={{
                x: mode === 'travel' ? 0 : 'calc(100% + 4px)'
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            
            {/* Travel Mode Button */}
            <motion.button
              onClick={() => {
                console.log('Travel button clicked, isLoading:', isLoading);
                handleModeSwitch('travel');
              }}
              disabled={false}  // Never disable for better UX
              className={`
                relative flex items-center justify-center gap-2 
                px-4 py-2 rounded-md font-medium text-sm 
                transition-all duration-200 z-10 flex-1
                ${mode === 'travel' 
                  ? 'text-white font-semibold drop-shadow-md' 
                  : 'text-white/80 hover:text-white'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span 
                className="text-base"
                animate={{ scale: mode === 'travel' ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                ✈️
              </motion.span>
              <span>Travel</span>
            </motion.button>

            {/* CMO Mode Button */}
            <motion.button
              onClick={() => {
                console.log('Marketing button clicked, isLoading:', isLoading);
                handleModeSwitch('cmo', 'all');
              }}
              disabled={false}  // Never disable for better UX
              className={`
                relative flex items-center justify-center gap-2
                px-4 py-2 rounded-md font-medium text-sm
                transition-all duration-200 z-10 flex-1
                ${mode === 'cmo' 
                  ? 'text-white font-semibold drop-shadow-md' 
                  : 'text-white/80 hover:text-white'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span 
                className="text-base"
                animate={{ scale: mode === 'cmo' ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                🎯
              </motion.span>
              <span>Marketing</span>
            </motion.button>
          </div>
        </div>

        {/* Sub-mode Selector (CMO only) */}
        <AnimatePresence>
          {mode === 'cmo' && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, scale: 0.95, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -10 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <button
                ref={dropdownButtonRef}
                onClick={() => setShowSubModeDropdown(!showSubModeDropdown)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:shadow-sm bg-white/10 backdrop-blur-sm"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: showSubModeDropdown ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <span className="text-sm font-medium text-white">
                  {getSubModeLabel(subMode || 'all')}
                </span>
                <ChevronDown 
                  className={`w-4 h-4 transition-transform text-white ${
                    showSubModeDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu using Portal */}
              <DropdownPortal
                isOpen={showSubModeDropdown}
                onClose={() => setShowSubModeDropdown(false)}
                triggerRef={dropdownButtonRef}
                className="w-56 bg-gray-900 rounded-lg shadow-xl overflow-hidden"
                style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}
              >
                <div 
                  className="py-1"
                  style={{ 
                    maxHeight: '320px',
                    overflowY: 'auto'
                  }}
                >
                  {subModes.map((subModeOption) => (
                    <button
                      key={subModeOption}
                      onClick={() => handleSubModeSelect(subModeOption)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center justify-between"
                      style={{
                        color: subMode === subModeOption ? '#ff6b6b' : 'white',
                        backgroundColor: subMode === subModeOption ? 'rgba(255, 107, 107, 0.2)' : 'transparent'
                      }}
                    >
                      <span>{getSubModeLabel(subModeOption)}</span>
                      {subMode === subModeOption && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: '#ff6b6b' }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </DropdownPortal>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Mode Description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.2 }}
          className="mt-2"
        >
          <p className="text-xs" style={{ color: theme.textSecondary }}>
            {mode === 'travel' 
              ? 'Plan trips, find flights, and explore destinations'
              : `Marketing tools${subMode && subMode !== 'all' ? ` for ${getSubModeLabel(subMode)}` : ''}`
            }
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium" style={{ color: mode === 'travel' ? '#0fc6c6' : '#ff6b6b' }}>
              Current mode: {mode.toUpperCase()}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};