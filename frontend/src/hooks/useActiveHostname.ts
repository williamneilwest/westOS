import { useMemo } from 'react';
import { resolveWestOsApp } from '@/shared/utils/hostname';

export function useActiveHostname() {
  return useMemo(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return {
      hostname,
      appId: resolveWestOsApp(hostname),
    };
  }, []);
}
