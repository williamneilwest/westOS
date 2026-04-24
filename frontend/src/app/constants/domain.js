export function getHostname() {
  return typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
}

export function isWorkDomainHost(hostname = getHostname()) {
  return hostname === 'work.westos.dev' || hostname.startsWith('work.');
}
