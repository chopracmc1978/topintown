import { useState, useCallback } from 'react';
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
    return `${renderUrl}${separator}width=${width}&quality=70&resize=contain`;
  }
  return url;
};

interface OptimizedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  className?: string;
  containerClassName?: string;
  fallback?: React.ReactNode;
}

/**
 * Image component with Supabase render-endpoint optimization,
 * skeleton placeholder, and fade-in on load.
 */
const OptimizedImage = ({
  src,
  alt,
  width = 400,
  className,
  containerClassName,
  fallback,
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  const optimizedSrc = getOptimizedImageUrl(src, width);
  const showFallback = error || !src || src === '/placeholder.svg';

  if (showFallback && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn('relative overflow-hidden bg-muted', containerClassName)}>
      {/* Skeleton shimmer while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      />
    </div>
  );
};

export default OptimizedImage;
