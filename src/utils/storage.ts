export function normalizeExternalUrl(
  url: string | null | undefined
): string | null {
  const trimmed = (url ?? '').trim();
  if (!trimmed || trimmed.startsWith('/')) return null;

  // Reject unsafe schemes explicitly
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)
      ? `https://${trimmed}`
      : trimmed;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidExternalUrl(url: string | null | undefined): boolean {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return true;
  return normalizeExternalUrl(trimmed) !== null;
}

export function isValidImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) {
    return true;
  }
  return /\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(file.name);
}

export function resolveStorageAssetUrl(
  rawUrl: string | null | undefined,
  supabaseUrl: string,
  bucket = 'portfolio-assets'
): string | null {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
    return null;
  }

  // Local static assets under /public
  if (trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  // Reject unsafe schemes
  if (/^(javascript|data|vbscript):/i.test(trimmed)) {
    return null;
  }

  const cleanOrigin = supabaseUrl.replace(/\/+$/, '');

  // Handle root-relative Supabase Storage URLs (e.g. "/storage/v1/object/public/..." or "storage/v1/object/sign/...")
  const normalizedStorageCandidate =
    trimmed.startsWith('/storage/v1/object/')
      ? `${cleanOrigin}${trimmed}`
      : trimmed.startsWith('storage/v1/object/')
        ? `${cleanOrigin}/${trimmed}`
        : trimmed;

  // Convert Supabase /object/sign/ or /object/authenticated/ URLs to canonical public object URLs
  if (/^https?:\/\//i.test(normalizedStorageCandidate)) {
    try {
      const parsed = new URL(normalizedStorageCandidate);
      for (const marker of [
        '/storage/v1/object/sign/',
        '/storage/v1/object/authenticated/',
      ]) {
        const idx = parsed.pathname.indexOf(marker);
        if (idx !== -1) {
          const rest = parsed.pathname.slice(idx + marker.length);
          const slashIdx = rest.indexOf('/');
          if (slashIdx > 0) {
            const targetBucket = rest.slice(0, slashIdx);
            const targetPath = rest.slice(slashIdx + 1);
            return `${parsed.origin}/storage/v1/object/public/${targetBucket}/${targetPath}`;
          }
        }
      }
      return parsed.href;
    } catch {
      return null;
    }
  }

  // Handle relative Supabase Storage object paths (e.g. "certificates/123.jpg" or "portfolio-assets/certificates/123.jpg")
  const cleanRelative = trimmed.replace(/^\/+/, '');
  const bucketPrefix = `${bucket}/`;
  const objectPath = cleanRelative.startsWith(bucketPrefix)
    ? cleanRelative.slice(bucketPrefix.length)
    : cleanRelative;

  if (!objectPath) return null;
  return `${cleanOrigin}/storage/v1/object/public/${bucket}/${objectPath}`;
}
