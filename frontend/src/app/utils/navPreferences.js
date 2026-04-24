import { storage } from './storage';

const NAV_PREFS_KEY = 'westos.nav.preferences.v1';

function normalizeHrefs(hrefs) {
  if (!Array.isArray(hrefs)) {
    return [];
  }
  return hrefs
    .map((href) => String(href || '').trim())
    .filter(Boolean);
}

export function getNavPreferences() {
  const stored = storage.get(NAV_PREFS_KEY);
  if (!stored || typeof stored !== 'object') {
    return { order: [], hidden: [] };
  }
  return {
    order: normalizeHrefs(stored.order),
    hidden: normalizeHrefs(stored.hidden),
  };
}

export function setNavPreferences(value) {
  const payload = {
    order: normalizeHrefs(value?.order),
    hidden: normalizeHrefs(value?.hidden),
  };
  storage.set(NAV_PREFS_KEY, payload);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('westos:nav-preferences-changed'));
  }
}

export function clearNavPreferences() {
  storage.remove(NAV_PREFS_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('westos:nav-preferences-changed'));
  }
}

export function applyNavPreferences(modules, preferences) {
  const list = Array.isArray(modules) ? modules : [];
  const order = normalizeHrefs(preferences?.order);
  const hidden = new Set(normalizeHrefs(preferences?.hidden));
  const orderIndex = new Map(order.map((href, index) => [href, index]));

  return [...list]
    .filter((module) => !hidden.has(module.href))
    .sort((left, right) => {
      const leftIndex = orderIndex.has(left.href) ? orderIndex.get(left.href) : Number.MAX_SAFE_INTEGER;
      const rightIndex = orderIndex.has(right.href) ? orderIndex.get(right.href) : Number.MAX_SAFE_INTEGER;
      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }
      return String(left.label || '').localeCompare(String(right.label || ''));
    });
}
