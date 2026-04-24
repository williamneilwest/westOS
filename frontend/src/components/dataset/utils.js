export const DATASET_PAGE_SIZE = 50;
const TICKET_COLUMN_PRIORITY = ['ticket', 'number', 'u_task_1', 'sys_id'];

export function formatColumnLabel(column) {
  return String(column ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferColumnType(rows, column) {
  const values = (rows || [])
    .map((row) => String(row?.[column] ?? '').trim())
    .filter(Boolean)
    .slice(0, 25);

  if (!values.length) return 'text';
  if (values.every((value) => !Number.isNaN(Number(value)))) return 'number';
  if (values.every((value) => !Number.isNaN(Date.parse(value)))) return 'date';
  return 'text';
}

export function compareValues(leftValue, rightValue, columnType) {
  if (columnType === 'number') {
    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);
    if (Number.isNaN(leftNumber) && Number.isNaN(rightNumber)) return 0;
    if (Number.isNaN(leftNumber)) return 1;
    if (Number.isNaN(rightNumber)) return -1;
    return leftNumber - rightNumber;
  }

  if (columnType === 'date') {
    const leftDate = Date.parse(leftValue);
    const rightDate = Date.parse(rightValue);
    if (Number.isNaN(leftDate) && Number.isNaN(rightDate)) return 0;
    if (Number.isNaN(leftDate)) return 1;
    if (Number.isNaN(rightDate)) return -1;
    return leftDate - rightDate;
  }

  return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, { sensitivity: 'base' });
}

export function getCellText(row, column) {
  return String(row?.[column] ?? '');
}

export function rowMatchesGlobalSearch(row, visibleColumns = [], query = '') {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return true;
  return visibleColumns.some((column) => getCellText(row, column).toLowerCase().includes(normalizedQuery));
}

export function filterRowsByGlobalSearch(rows = [], visibleColumns = [], query = '') {
  return (rows || []).filter((row) => rowMatchesGlobalSearch(row, visibleColumns, query));
}

export function getDefaultVisibleColumns(columns = [], maxVisibleColumns = 8) {
  if (!columns.length) return [];
  const priorityPatterns = [/id|ticket|case|incident|request|task/i, /title|name|subject|summary|description/i, /status|state|priority|severity/i, /date|time|created|updated/i];

  const prioritized = [];
  priorityPatterns.forEach((pattern) => {
    const match = columns.find((column) => pattern.test(column) && !prioritized.includes(column));
    if (match) prioritized.push(match);
  });

  const merged = Array.from(new Set([...prioritized, ...columns]));
  return merged.slice(0, Math.min(maxVisibleColumns, columns.length));
}

export function detectTicketColumn(columns = []) {
  const normalizedColumns = Array.isArray(columns) ? columns : [];
  for (const candidate of TICKET_COLUMN_PRIORITY) {
    const match = normalizedColumns.find((column) => String(column || '').trim().toLowerCase() === candidate);
    if (match) {
      return match;
    }
  }
  return '';
}

export function normalizeColumns(columns = []) {
  const source = Array.isArray(columns) ? columns : [];
  const uniqueColumns = Array.from(new Set(source.filter(Boolean)));
  const ticketColumn = detectTicketColumn(uniqueColumns);
  if (!ticketColumn) {
    return uniqueColumns;
  }

  return [ticketColumn, ...uniqueColumns.filter((column) => column !== ticketColumn)];
}

export function resolveField(row, preferredField = '', fallbackColumns = []) {
  if (preferredField && row?.[preferredField] !== undefined && row?.[preferredField] !== null && String(row[preferredField]).trim()) {
    return String(row[preferredField]);
  }

  for (const column of fallbackColumns) {
    const value = row?.[column];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }

  return '';
}
