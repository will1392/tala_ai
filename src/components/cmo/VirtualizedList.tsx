import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { debounce } from 'lodash';
import { cn } from '../../utils/cn';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight?: number | ((index: number) => number);
  overscan?: number;
  className?: string;
  onScroll?: (scrollOffset: number) => void;
  searchable?: boolean;
  emptyMessage?: string;
}

export function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight = 50,
  overscan = 5,
  className,
  onScroll,
  searchable = false,
  emptyMessage = 'No items found'
}: VirtualizedListProps<T>) {
  const listRef = useRef<List>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState(items);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      if (!term) {
        setFilteredItems(items);
        return;
      }

      const filtered = items.filter((item: any) => 
        JSON.stringify(item).toLowerCase().includes(term.toLowerCase())
      );
      setFilteredItems(filtered);
      
      // Reset scroll position
      listRef.current?.scrollToItem(0);
    }, 300),
    [items]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem(filteredItems[index], index)}
    </div>
  ));

  Row.displayName = 'VirtualizedRow';

  const getItemSize = typeof itemHeight === 'function' ? itemHeight : () => itemHeight;

  if (filteredItems.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-gray-500", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("h-full", className)}>
      {searchable && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          />
        </div>
      )}
      
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={searchable ? height - 72 : height}
            width={width}
            itemCount={filteredItems.length}
            itemSize={getItemSize}
            overscanCount={overscan}
            onScroll={({ scrollOffset }) => onScroll?.(scrollOffset)}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

// Virtualized grid component
interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount: number;
  rowHeight: number;
  gap?: number;
  className?: string;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  columnCount,
  rowHeight,
  gap = 16,
  className
}: VirtualizedGridProps<T>) {
  const rowCount = Math.ceil(items.length / columnCount);

  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const startIndex = index * columnCount;
    const endIndex = Math.min(startIndex + columnCount, items.length);
    const rowItems = items.slice(startIndex, endIndex);

    return (
      <div style={style} className="flex" >
        {rowItems.map((item, colIndex) => (
          <div
            key={startIndex + colIndex}
            className="flex-1"
            style={{ marginRight: colIndex < rowItems.length - 1 ? gap : 0 }}
          >
            {renderItem(item, startIndex + colIndex)}
          </div>
        ))}
      </div>
    );
  });

  Row.displayName = 'VirtualizedGridRow';

  return (
    <div className={cn("h-full", className)}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            itemCount={rowCount}
            itemSize={() => rowHeight + gap}
            overscanCount={2}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

// Memory-optimized image component
interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const OptimizedImage = memo(({
  src,
  alt,
  className,
  onLoad,
  onError
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => {
      setIsLoaded(true);
      onLoad?.();
    };

    const handleError = () => {
      setHasError(true);
      onError?.();
    };

    // Use native lazy loading
    img.loading = 'lazy';

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src, onLoad, onError]);

  if (hasError) {
    return (
      <div className={cn("bg-gray-200 dark:bg-gray-700 flex items-center justify-center", className)}>
        <span className="text-gray-500 text-sm">Failed to load image</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={cn(
        className,
        !isLoaded && "opacity-0",
        "transition-opacity duration-300"
      )}
    />
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Debounced input component
interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
}

export const DebouncedInput = memo(({
  value: initialValue,
  onChange,
  delay = 300,
  ...props
}: DebouncedInputProps) => {
  const [value, setValue] = useState(initialValue);

  const debouncedChange = useCallback(
    debounce((value: string) => onChange(value), delay),
    [onChange, delay]
  );

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedChange(newValue);
  };

  return (
    <input
      {...props}
      value={value}
      onChange={handleChange}
    />
  );
});

DebouncedInput.displayName = 'DebouncedInput';

// Memory manager hook
export const useMemoryManager = () => {
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number;
    total: number;
    percentage: number;
  }>({ used: 0, total: 0, percentage: 0 });

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize;
        const total = memory.jsHeapSizeLimit;
        const percentage = (used / total) * 100;

        setMemoryUsage({ used, total, percentage });

        // Trigger cleanup if memory usage is high
        if (percentage > 80) {
          console.warn('High memory usage detected:', percentage.toFixed(2) + '%');
          // Trigger garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }
    };

    const interval = setInterval(checkMemory, 10000); // Check every 10 seconds
    checkMemory(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const clearCache = useCallback(() => {
    // Clear any component-specific caches
    localStorage.removeItem('cmo_temp_cache');
    sessionStorage.clear();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }, []);

  return { memoryUsage, clearCache };
};

// Efficient re-render prevention
export const useMemoizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const ref = useRef<T>(callback);

  useEffect(() => {
    ref.current = callback;
  }, [callback]);

  return useCallback(
    ((...args) => ref.current(...args)) as T,
    deps
  );
};

export default VirtualizedList;