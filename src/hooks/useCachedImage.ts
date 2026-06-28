import { useEffect, useState } from 'react';

const IMAGE_CACHE = 'medmacs-profile-image-cache';

export const useCachedImage = (url?: string | null) => {
  const [cachedUrl, setCachedUrl] = useState<string | null>(url || null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let cancelled = false;

    const load = async () => {
      if (!url || typeof window === 'undefined' || !('caches' in window)) {
        setCachedUrl(url || null);
        return;
      }

      try {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(url);

        if (cached) {
          const blob = await cached.blob();
          revokedUrl = URL.createObjectURL(blob);
          if (!cancelled) setCachedUrl(revokedUrl);
        } else {
          setCachedUrl(url);
        }

        if (navigator.onLine) {
          const response = await fetch(url, { cache: 'reload', mode: 'cors' });
          if (response.ok) {
            await cache.put(url, response.clone());
            const blob = await response.blob();
            const nextUrl = URL.createObjectURL(blob);
            if (revokedUrl) URL.revokeObjectURL(revokedUrl);
            revokedUrl = nextUrl;
            if (!cancelled) setCachedUrl(nextUrl);
          }
        }
      } catch {
        setCachedUrl(url);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [url]);

  return cachedUrl || url || null;
};

