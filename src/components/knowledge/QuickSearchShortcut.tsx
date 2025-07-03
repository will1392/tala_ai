import { useState } from 'react';
import { Search, Command } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface QuickSearchShortcutProps {
  onOpenSearch: () => void;
  className?: string;
  placeholder?: string;
}

export const QuickSearchShortcut = ({ 
  onOpenSearch, 
  className,
  placeholder = "Search everything..." 
}: QuickSearchShortcutProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.button
      onClick={onOpenSearch}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300',
        'bg-gray-800/90 border border-gray-600/50 hover:bg-gray-700/90 hover:border-gray-500/70',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
        'group backdrop-blur-sm',
        isFocused && 'ring-2 ring-primary border-transparent',
        className
      )}
    >
      <Search 
        size={18} 
        className={cn(
          'text-white/70 transition-colors',
          'group-hover:text-white/90',
          isFocused && 'text-primary'
        )} 
      />
      
      <span className="flex-1 text-left text-white/80 group-hover:text-white/90">
        {placeholder}
      </span>
      
      <div className="flex items-center gap-1 text-xs text-white/60 group-hover:text-white/80">
        <Command size={12} />
        <span>K</span>
      </div>
    </motion.button>
  );
};