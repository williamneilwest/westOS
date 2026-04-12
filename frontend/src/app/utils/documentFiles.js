export function getFileExtension(fileName) {
  const raw = String(fileName || '').trim().toLowerCase();
  const index = raw.lastIndexOf('.');
  return index >= 0 ? raw.slice(index) : '';
}

export function isCsvFile(fileName, mimeType = '') {
  const extension = getFileExtension(fileName);
  const normalizedMime = String(mimeType || '').toLowerCase();
  return extension === '.csv' || normalizedMime === 'text/csv' || normalizedMime === 'application/vnd.ms-excel';
}

export function isPdfFile(fileName, mimeType = '') {
  return getFileExtension(fileName) === '.pdf' || String(mimeType || '').toLowerCase() === 'application/pdf';
}

export function isImageFile(fileName, mimeType = '') {
  const extension = getFileExtension(fileName);
  const normalizedMime = String(mimeType || '').toLowerCase();
  return normalizedMime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(extension);
}

export function isTextLikeFile(fileName, mimeType = '') {
  const extension = getFileExtension(fileName);
  const normalizedMime = String(mimeType || '').toLowerCase();
  return normalizedMime.startsWith('text/') || ['.txt', '.md', '.json', '.log'].includes(extension);
}

export function canPreviewInline(fileName, mimeType = '') {
  return isPdfFile(fileName, mimeType) || isImageFile(fileName, mimeType) || isTextLikeFile(fileName, mimeType);
}

export function buildDocumentViewHref({ url, fileName, mimeType = '', title = '', backTo = '' }) {
  const params = new URLSearchParams();
  params.set('url', url || '');
  params.set('fileName', fileName || '');

  if (mimeType) {
    params.set('mimeType', mimeType);
  }

  if (title) {
    params.set('title', title);
  }

  if (backTo) {
    params.set('backTo', backTo);
  }

  return `/app/document?${params.toString()}`;
}
