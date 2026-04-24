export function parseFileId(fileUrl) {
  const raw = String(fileUrl || '').trim();
  if (!raw) {
    return '';
  }

  const pathOnly = raw.replace(/^https?:\/\/[^/]+/i, '').split('?', 1)[0].replace(/^\/+/, '');
  if (pathOnly.startsWith('api/')) {
    return pathOnly.slice(4);
  }
  return pathOnly;
}
