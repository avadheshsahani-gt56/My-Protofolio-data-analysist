import { useCallback, useEffect, useState } from 'react';

export type AppRoute = '/' | '/admin/login' | '/admin/dashboard';

function normalizePath(pathname: string, hash = ''): AppRoute {
  const cleaned = pathname.trim().toLowerCase().replace(/\/+$/, '') || '/';
  if (cleaned === '/admin/login' || cleaned === '/admin') return '/admin/login';
  if (cleaned === '/admin/dashboard') return '/admin/dashboard';

  const cleanedHash = hash.trim().toLowerCase().replace(/^#/, '').replace(/\/+$/, '');
  if (cleanedHash === '/admin/login' || cleanedHash === '/admin') return '/admin/login';
  if (cleanedHash === '/admin/dashboard') return '/admin/dashboard';

  return '/';
}

export function useRouter() {
  const [route, setRoute] = useState<AppRoute>(() =>
    normalizePath(window.location.pathname, window.location.hash)
  );

  useEffect(() => {
    const onLocationChange = () => {
      setRoute(normalizePath(window.location.pathname, window.location.hash));
    };
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, []);

  useEffect(() => {
    if (route !== '/' && window.location.pathname !== route) {
      window.history.replaceState({}, '', route);
    }
  }, [route]);

  const navigate = useCallback((nextRoute: AppRoute, replace = false) => {
    const normalized = normalizePath(nextRoute);
    if (window.location.pathname !== normalized || window.location.hash) {
      if (replace) {
        window.history.replaceState({}, '', normalized);
      } else {
        window.history.pushState({}, '', normalized);
      }
    }
    setRoute(normalized);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return { route, navigate };
}
