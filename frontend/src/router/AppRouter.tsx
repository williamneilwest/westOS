import { useEffect, useState } from 'react';
import LifeOSApp from '@/modules/life/app/App';
import { LandingApp } from '@/modules/system/LandingApp';
import { PortfolioApp } from '@/modules/system/PortfolioApp';

export function AppRouter() {
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updatePathname = () => setPathname(window.location.pathname);
    const historyStateEvent = 'westos:navigation';
    const historyRef = window.history as History & {
      __westosPatched?: boolean;
    };

    if (!historyRef.__westosPatched) {
      const wrapHistoryMethod = (method: 'pushState' | 'replaceState') => {
        const original = window.history[method];
        window.history[method] = function patchedHistoryMethod(...args) {
          const result = original.apply(this, args);
          window.dispatchEvent(new Event(historyStateEvent));
          return result;
        };
      };

      wrapHistoryMethod('pushState');
      wrapHistoryMethod('replaceState');
      historyRef.__westosPatched = true;
    }

    window.addEventListener('popstate', updatePathname);
    window.addEventListener(historyStateEvent, updatePathname);

    return () => {
      window.removeEventListener('popstate', updatePathname);
      window.removeEventListener(historyStateEvent, updatePathname);
    };
  }, []);

  if (pathname === '/portfolio' || pathname.startsWith('/portfolio/')) {
    return <PortfolioApp />;
  }

  if (pathname === '/app' || pathname.startsWith('/app/')) {
    return <LifeOSApp />;
  }

  if (pathname === '/' || pathname === '/projects' || pathname === '/services') {
    return <LandingApp />;
  }

  return <LandingApp />;
}
