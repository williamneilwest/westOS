export function formatDataFileName(fileName) {
  const raw = String(fileName ?? '').trim();
  if (!raw) {
    return '';
  }

  const extensionMatch = raw.match(/(\.[a-z0-9]+)$/i);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
  const withoutExtension = extension ? raw.slice(0, -extension.length) : raw;
  const withoutTimestamp = withoutExtension.replace(/^\d{14}_/, '');

  // Special-case mappings for known filenames that should display with a friendly label
  // Normalize to a lowercase, space-separated key for matching
  const normalizedKey = withoutTimestamp
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const specialDisplayMap = {
    // Always show this CSV as "UsersRMR" (without extension)
    'u users peoplesoft locations': 'UsersRMR',
  };

  if (specialDisplayMap[normalizedKey]) {
    return specialDisplayMap[normalizedKey];
  }

  const normalized = withoutTimestamp
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return extension ? `${normalized}${extension}` : normalized;
}
