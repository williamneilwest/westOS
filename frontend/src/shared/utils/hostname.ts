const LIFE_HOSTS = new Set(['life.wnwest.com', 'life.localhost']);
const LANDING_HOSTS = new Set(['wnwest.com', 'www.wnwest.com', 'localhost', '127.0.0.1']);

export type WestOsAppId = 'landing' | 'life' | 'unknown';

export function resolveWestOsApp(hostname: string): WestOsAppId {
  if (LIFE_HOSTS.has(hostname)) {
    return 'life';
  }

  if (LANDING_HOSTS.has(hostname)) {
    return 'landing';
  }

  return 'unknown';
}
