import React, { lazy, Suspense, ComponentType } from 'react';
import { CMOLoadingState } from './CMOLoadingStates';

interface LazyLoadConfig {
  loader: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  errorBoundary?: boolean;
  preload?: boolean;
}

// Error boundary component
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">
            Failed to load component
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load wrapper component
export function createLazyComponent<P extends object>(
  config: LazyLoadConfig
): React.FC<P> {
  const LazyComponent = lazy(config.loader);

  // Preload option
  if (config.preload) {
    config.loader();
  }

  const Component: React.FC<P> = (props) => {
    const fallback = config.fallback || <CMOLoadingState type="tool" />;

    const content = (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );

    if (config.errorBoundary) {
      return (
        <LazyLoadErrorBoundary fallback={fallback}>
          {content}
        </LazyLoadErrorBoundary>
      );
    }

    return content;
  };

  return Component;
}

// Lazy loaded CMO components
export const LazyUnifiedToolManager = createLazyComponent({
  loader: () => import('./UnifiedToolManager'),
  errorBoundary: true
});

export const LazyCMOOnboarding = createLazyComponent({
  loader: () => import('./CMOOnboarding'),
  errorBoundary: true
});

export const LazyQuickActionsBar = createLazyComponent({
  loader: () => import('./QuickActionsBar'),
  errorBoundary: true
});

// Progressive tool loader
interface ProgressiveLoaderProps {
  tools: string[];
  renderTool: (toolId: string) => React.ReactNode;
  batchSize?: number;
  delay?: number;
}

export const ProgressiveToolLoader: React.FC<ProgressiveLoaderProps> = ({
  tools,
  renderTool,
  batchSize = 3,
  delay = 100
}) => {
  const [loadedTools, setLoadedTools] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let currentIndex = 0;
    const loadNextBatch = () => {
      const nextBatch = tools.slice(currentIndex, currentIndex + batchSize);
      if (nextBatch.length > 0) {
        setLoadedTools(prev => [...prev, ...nextBatch]);
        currentIndex += batchSize;
        
        if (currentIndex < tools.length) {
          setTimeout(loadNextBatch, delay);
        } else {
          setIsLoading(false);
        }
      }
    };

    loadNextBatch();
  }, [tools, batchSize, delay]);

  return (
    <>
      {loadedTools.map(toolId => (
        <React.Fragment key={toolId}>
          {renderTool(toolId)}
        </React.Fragment>
      ))}
      {isLoading && tools.length > loadedTools.length && (
        <div className="flex items-center justify-center p-4">
          <CMOLoadingState type="tool" message="Loading more tools..." />
        </div>
      )}
    </>
  );
};

// Intersection observer hook for lazy loading
export const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options?: IntersectionObserverInit
): boolean => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
};

// Lazy image component
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  placeholder = '/placeholder.png'
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [isLoading, setIsLoading] = React.useState(true);
  const imgRef = React.useRef<HTMLDivElement>(null);
  const isIntersecting = useIntersectionObserver(imgRef, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  React.useEffect(() => {
    if (isIntersecting && imageSrc === placeholder) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setImageSrc(src);
        setIsLoading(false);
      };
      img.onerror = () => {
        setIsLoading(false);
      };
    }
  }, [isIntersecting, src, placeholder, imageSrc]);

  return (
    <div ref={imgRef} className={className}>
      <img
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'blur-sm' : ''} transition-all`}
      />
    </div>
  );
};

// Resource preloader
export class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadedResources: Set<string> = new Set();

  static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  preloadComponent(loader: () => Promise<any>): void {
    loader().catch(err => console.error('Preload failed:', err));
  }

  preloadImage(src: string): void {
    if (!this.preloadedResources.has(src)) {
      const img = new Image();
      img.src = src;
      this.preloadedResources.add(src);
    }
  }

  preloadScript(src: string): void {
    if (!this.preloadedResources.has(src)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = src;
      document.head.appendChild(link);
      this.preloadedResources.add(src);
    }
  }
}

// Export singleton instance
export const resourcePreloader = ResourcePreloader.getInstance();