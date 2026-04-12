import { isSuppressedTicketColumn } from '../work/utils/aiAnalysis';
import { STORAGE_KEYS } from '../../app/constants/storageKeys';
import { storage } from '../../app/utils/storage';

export const TABLE_PAGE_SIZE = 50;
const VISIBLE_COLUMNS_STORAGE_KEY = STORAGE_KEYS.TABLE_COLUMNS;

export function formatColumnLabel(column) {
  return String(column ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferColumnType(rows, column) {
  const values = rows
    .map((row) => String(row?.[column] ?? '').trim())
    .filter(Boolean)
    .slice(0, 25);

  if (!values.length) {
    return 'text';
  }

  if (values.every((value) => !Number.isNaN(Number(value)))) {
    return 'number';
  }

  if (values.every((value) => !Number.isNaN(Date.parse(value)))) {
    return 'date';
  }

  return 'text';
}

export function getCellText(row, column) {
  return String(row?.[column] ?? '');
}

export function compareValues(leftValue, rightValue, columnType) {
  if (columnType === 'number') {
    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);

    if (Number.isNaN(leftNumber) && Number.isNaN(rightNumber)) {
      return 0;
    }

    if (Number.isNaN(leftNumber)) {
      return 1;
    }

    if (Number.isNaN(rightNumber)) {
      return -1;
    }

    return leftNumber - rightNumber;
  }

  if (columnType === 'date') {
    const leftDate = Date.parse(leftValue);
    const rightDate = Date.parse(rightValue);

    if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) {
      return 0;
    }

    if (Number.isNaN(leftDate)) {
      return 1;
    }

    if (Number.isNaN(rightDate)) {
      return -1;
    }

    return leftDate - rightDate;
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, { sensitivity: 'base' });
}

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
