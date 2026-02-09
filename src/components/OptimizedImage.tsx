import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Get optimized Supabase storage image URL using the render endpoint
 * for server-side resizing. Falls back to original URL for non-Supabase images.
 */
export const getOptimizedImageUrl = (url: string | null | undefined, width = 400): string => {
  if (!url || url === '/placeholder.svg') return '/placeholder.svg';
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    const separator = renderUrl.includes('?') ? '&' : '?';
    return `${renderUrl}${separator}width=${width}&quality=75&resize=contain`;
  }
  return url;
};

// Simple in-memory cache to track which URLs have been loaded
const loadedImages = new Set<string>();

/**
 * Preload an image URL so it's ready when the component renders.
 * Call this early (e.g., when data arrives from an API) to start loading images
 * before they're even in the viewport.
 */
export const preloadImage = (url: string | null | undefined, width = 400): void => {
  try {
    const optimizedSrc = getOptimizedImageUrl(url, width);
    if (optimizedSrc === '/placeholder.svg' || loadedImages.has(optimizedSrc)) return;
    
    const img = new Image();
    img.src = optimizedSrc;
    img.onload = () => loadedImages.add(optimizedSrc);
  } catch {
    // Silently ignore – never crash for image preloading
  }
};

/**
 * Batch preload multiple images at once.
 */
export const preloadImages = (urls: (string | null | undefined)[], width = 400): void => {
  urls.forEach(url => preloadImage(url, width));
};

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  className?: string;
  containerClassName?: string;
  fallback?: React.ReactNode;
  /** If true, loads eagerly with high priority (use for above-the-fold images) */
  priority?: boolean;
}

/**
 * Image component with Supabase render-endpoint optimization,
 * skeleton placeholder, and instant/fade-in on load.
 */
const OptimizedImage = ({
  src,
  alt,
  width = 400,
  className,
  containerClassName,
  fallback,
  priority = false,
}: OptimizedImageProps) => {
  const optimizedSrc = getOptimizedImageUrl(src, width);
  const alreadyCached = loadedImages.has(optimizedSrc);
  
  const [loaded, setLoaded] = useState(alreadyCached);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if image is already complete (browser cache hit)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setLoaded(true);
      loadedImages.add(optimizedSrc);
    }
  }, [optimizedSrc]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    loadedImages.add(optimizedSrc);
  }, [optimizedSrc]);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  const showFallback = error || !src || src === '/placeholder.svg';

  if (showFallback && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn('relative overflow-hidden bg-muted', containerClassName)}>
      {/* Skeleton shimmer while loading - skip if already cached */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        ref={imgRef}
        src={optimizedSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          // Use instant display if already cached, otherwise fast fade
          alreadyCached
            ? 'opacity-100'
            : cn('transition-opacity duration-150', loaded ? 'opacity-100' : 'opacity-0'),
          className
        )}
      />
    </div>
  );
};

export default OptimizedImage;
