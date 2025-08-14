import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useMode } from '../../hooks/useMode';
import type { AppMode, CMOSubMode } from '../../hooks/useMode';
import toast from 'react-hot-toast';
import { DropdownPortal } from './DropdownPortal';
import { Button } from '../ui/Button';

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
        <Button
          onClick={handleModeToggle}
          disabled={isLoading}
          variant="secondary"
          size="sm"
          className="rounded-full text-sm font-medium"
          style={{
            backgroundColor: theme.primary + '20',
            color: theme.primary,
            border: `1px solid ${theme.primary}40`
          }}
        >
          <span className="text-base">{getModeIcon()}</span>
          <span>{mode === 'travel' ? 'Travel' : 'CMO'}</span>
        </Button>
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
          
          <div className="relative flex items-center p-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg w-64 shadow-lg" role="radiogroup" aria-label="Chat mode selection">
            {/* Background indicator that moves */}
            <motion.div
              className="absolute rounded-md shadow-lg"
              style={{ 
                backgroundColor: mode === 'travel' ? '#0fc6c6' : '#ff6b6b',
                width: '50%',
                height: 'calc(100% - 8px)',
                top: '4px',
                left: '0'
              }}
              animate={{
                x: mode === 'travel' ? 0 : '100%'
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            
            {/* Travel Mode Button */}
            <Button
              onClick={() => {
                console.log('Travel button clicked, isLoading:', isLoading);
                handleModeSwitch('travel');
              }}
              disabled={false}  // Never disable for better UX
              variant="ghost"
              size="md"
              className={`
                relative flex-1 bg-transparent hover:bg-transparent
                ${mode === 'travel' 
                  ? 'text-white font-semibold drop-shadow-md' 
                  : 'text-white/80 hover:text-white'
                }
              `}
              aria-label="Switch to Travel mode"
              aria-pressed={mode === 'travel'}
              role="radio"
              aria-checked={mode === 'travel'}
            >
              <motion.span 
                className="text-base"
                animate={{ scale: mode === 'travel' ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                aria-hidden="true"
              >
                ✈️
              </motion.span>
              <span>Travel</span>
            </Button>

            {/* CMO Mode Button */}
            <Button
              onClick={() => {
                console.log('Marketing button clicked, isLoading:', isLoading);
                handleModeSwitch('cmo', 'all');
              }}
              disabled={false}  // Never disable for better UX
              variant="ghost"
              size="md"
              className={`
                relative flex-1 bg-transparent hover:bg-transparent
                ${mode === 'cmo' 
                  ? 'text-white font-semibold drop-shadow-md' 
                  : 'text-white/80 hover:text-white'
                }
              `}
              aria-label="Switch to Marketing mode"
              aria-pressed={mode === 'cmo'}
              role="radio"
              aria-checked={mode === 'cmo'}
            >
              <motion.span 
                className="text-base"
                animate={{ scale: mode === 'cmo' ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300 }}
                aria-hidden="true"
              >
                🎯
              </motion.span>
              <span>Marketing</span>
            </Button>
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
              <Button
                ref={dropdownButtonRef}
                onClick={() => setShowSubModeDropdown(!showSubModeDropdown)}
                variant="secondary"
                size="md"
                className="border hover:shadow-sm bg-white/10 backdrop-blur-sm"
                style={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  backgroundColor: showSubModeDropdown ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'
                }}
                aria-label={`Marketing sub-mode: ${getSubModeLabel(subMode || 'all')}. Click to change.`}
                aria-expanded={showSubModeDropdown}
                aria-haspopup="menu"
              >
                <span className="text-sm font-medium text-white">
                  {getSubModeLabel(subMode || 'all')}
                </span>
                <ChevronDown 
                  className={`w-4 h-4 transition-transform text-white ${
                    showSubModeDropdown ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </Button>

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
                  role="menu"
                  aria-orientation="vertical"
                >
                  {subModes.map((subModeOption) => (
                    <Button
                      key={subModeOption}
                      onClick={() => handleSubModeSelect(subModeOption)}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between px-4 py-3 text-sm hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg"
                      style={{
                        color: subMode === subModeOption ? '#ff6b6b' : 'white',
                        backgroundColor: subMode === subModeOption ? 'rgba(255, 107, 107, 0.2)' : 'transparent'
                      }}
                      role="menuitem"
                      aria-current={subMode === subModeOption ? "true" : undefined}
                    >
                      <span>{getSubModeLabel(subModeOption)}</span>
                      {subMode === subModeOption && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: '#ff6b6b' }}
                          aria-hidden="true"
                        />
                      )}
                    </Button>
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
          <p className="text-xs" style={{ color: 'white' }}>
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