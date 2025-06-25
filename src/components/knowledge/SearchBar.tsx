import { Search, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export const SearchBar = ({ value, onChange }: SearchBarProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-primary transition-colors" size={20} />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search documents, visa requirements, airline policies..."
          className={cn(
            'w-full pl-12 pr-32 py-4 rounded-2xl',
            'glass-input text-lg',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary-900'
          )}
        />
        <button className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-primary rounded-xl text-secondary-900 font-medium flex items-center gap-2 hover:bg-primary-dark transition-colors">
          <Sparkles size={16} />
          AI Search
        </button>
      </div>
      
    </motion.div>
  );
};