import { isSuppressedTicketColumn } from '../work/utils/aiAnalysis';
import { STORAGE_KEYS } from '../../app/constants/storageKeys';
import { storage } from '../../app/utils/storage';
import {
  compareValues,
  formatColumnLabel,
  getCellText,
  inferColumnType,
} from '../../components/dataset/utils';

export { compareValues, formatColumnLabel, getCellText, inferColumnType };

export const TABLE_PAGE_SIZE = 50;
const VISIBLE_COLUMNS_STORAGE_KEY = STORAGE_KEYS.TABLE_COLUMNS;

function loadVisibleColumnPreferences() {
  const stored = storage.get(VISIBLE_COLUMNS_STORAGE_KEY);
  return stored && typeof stored === 'object' ? stored : {};
}

function saveVisibleColumnPreferences(preferences) {
  storage.set(VISIBLE_COLUMNS_STORAGE_KEY, preferences);
}

export function isMobileViewport() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 768px)').matches
    : false;
}

export function getDefaultVisibleColumns(columns = [], options = {}) {
  if (!columns.length) {
    return [];
  }

  const maxVisibleColumns = options.maxVisibleColumns || (isMobileViewport() ? 3 : 8);

  const priorityColumns = [
    ...columns.filter(
      (column) => !isSuppressedTicketColumn(column) && /id|name|title|status|date|created|updated|owner|email/i.test(column)
    ),
    ...columns,
  ].filter((column) => !isSuppressedTicketColumn(column));

  return Array.from(new Set(priorityColumns)).slice(0, Math.min(maxVisibleColumns, columns.length));
}

export function getStoredVisibleColumns(preferenceKey, columns = [], options = {}) {
  if (!columns.length) {
    return [];
  }

  const preferences = loadVisibleColumnPreferences();
  const storedColumns = Array.isArray(preferences[preferenceKey]) ? preferences[preferenceKey] : [];
  const nextColumns = storedColumns.filter((column, index) => storedColumns.indexOf(column) === index && columns.includes(column));

  if (nextColumns.length) {
    return nextColumns;
  }

  return getDefaultVisibleColumns(columns, options);
}

export function setStoredVisibleColumns(preferenceKey, columns = []) {
  const preferences = loadVisibleColumnPreferences();

  saveVisibleColumnPreferences({
    ...preferences,
    [preferenceKey]: Array.from(new Set(columns)),
  });
}
