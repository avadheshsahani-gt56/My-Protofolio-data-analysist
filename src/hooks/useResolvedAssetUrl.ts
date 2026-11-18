import { useEffect, useState } from 'react';
import {
  parseSupabaseStoragePublicUrl,
  resolveReadableAssetUrl,
} from '../services/portfolioService';

export function useResolvedAssetUrl(rawUrl: string | null | undefined): string | null {
  const normalized = rawUrl?.trim() || null;
  const [resolved, setResolved] = useState<{
    original: string;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!normalized || !parseSupabaseStoragePublicUrl(normalized)) {
      return;
    }

    let active = true;
    resolveReadableAssetUrl(normalized).then((nextUrl) => {
      if (!active || !nextUrl) return;
      setResolved({ original: normalized, url: nextUrl });
    });

    return () => {
      active = false;
    };
  }, [normalized]);

  if (!normalized) return null;
  if (resolved && resolved.original === normalized) {
    return resolved.url;
  }
  return normalized;
}
