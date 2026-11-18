import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import {
  parseSupabaseStoragePublicUrl,
  resolveSignedStorageUrl,
} from '../services/portfolioService';

interface FallbackImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  fallbackIcon?: ReactNode;
}

export function FallbackImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  fallbackIcon,
}: FallbackImageProps) {
  const normalizedSrc = src?.trim() || null;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [signedFallback, setSignedFallback] = useState<{
    originalSrc: string;
    signedUrl: string;
  } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    setSignedFallback(null);
    setFailedSrc(null);
  }, [normalizedSrc]);

  const activeSrc =
    normalizedSrc && signedFallback?.originalSrc === normalizedSrc
      ? signedFallback.signedUrl
      : normalizedSrc;

  useEffect(() => {
    if (!activeSrc) return;
    const imgEl = imgRef.current;
    if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
      setLoadedSrc(activeSrc);
    }
  }, [activeSrc]);

  const hasError = Boolean(activeSrc && failedSrc === activeSrc);
  const isLoading = Boolean(activeSrc && !hasError && loadedSrc !== activeSrc);

  if (!activeSrc || hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-[#101B30] text-slate-400 border border-slate-800/80 select-none ${className}`}
      >
        <div className="mb-2 text-[#00D9FF]/70">
          {fallbackIcon ?? <ImageOff className="w-7 h-7" />}
        </div>
        <span className="text-xs font-medium text-slate-400 text-center px-3">
          {fallbackTitle ?? alt}
        </span>
      </div>
    );
  }

  const loadingPlaceholderClasses = isLoading
    ? `animate-pulse bg-[#0B1426] ${className.includes('h-full') ? '' : 'min-h-[200px]'}`
    : '';

  return (
    <img
      ref={imgRef}
      key={activeSrc}
      src={activeSrc}
      alt={alt}
      onLoad={() => setLoadedSrc(activeSrc)}
      onError={async () => {
        // If public URL failed (e.g., private bucket), try signed URL once before showing fallback
        if (
          normalizedSrc &&
          activeSrc === normalizedSrc &&
          parseSupabaseStoragePublicUrl(normalizedSrc)
        ) {
          const signedUrl = await resolveSignedStorageUrl(normalizedSrc);
          if (signedUrl) {
            setSignedFallback({ originalSrc: normalizedSrc, signedUrl });
            return;
          }
        }
        setFailedSrc(activeSrc);
      }}
      className={`${className} ${loadingPlaceholderClasses}`.trim()}
    />
  );
}
