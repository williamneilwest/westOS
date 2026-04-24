import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Columns3, Search, X } from 'lucide-react';
import { formatColumnLabel, normalizeColumns } from './utils';

const GROUP_DEFINITIONS = [
  {
    id: 'core',
    title: 'Core Fields',
    matcher: /ticket|number|case|incident|request|task|status|state|priority|severity|assigned|assignee|owner|group|title|subject|summary|description|category/i,
  },
  {
    id: 'metadata',
    title: 'Metadata',
    matcher: /sys_|^id$|_id$|created|updated|modified|opened|closed|resolved|timestamp|time|date|source|path|url/i,
  },
  {
    id: 'optional',
    title: 'Optional \/ Extended',
    matcher: /.*/,
  },
];

function toDisplayLabel(column) {
  const normalized = formatColumnLabel(column)
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return normalized || String(column || 'Column');
}

function groupColumns(columns = []) {
  const grouped = {
    core: [],
    metadata: [],
    optional: [],
  };

  for (const column of columns) {
    const lower = String(column || '').toLowerCase();
    const group = GROUP_DEFINITIONS.find(({ id, matcher }) => id !== 'optional' && matcher.test(lower));
    grouped[group?.id || 'optional'].push(column);
  }

  return grouped;
}

export function ColumnSelectorDropdown({ columns = [], visibleColumns = [], onChange, lockedColumns = [] }) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({
    core: false,
    metadata: true,
    optional: true,
  });

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setQuery(searchInput.trim().toLowerCase());
    }, 180);

    return () => window.clearTimeout(timerId);
  }, [searchInput]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const groupedColumns = useMemo(() => groupColumns(columns), [columns]);

  const filteredGroupedColumns = useMemo(() => {
    if (!query) {
      return groupedColumns;
    }

    return Object.fromEntries(
      Object.entries(groupedColumns).map(([groupId, groupColumnsList]) => [
        groupId,
        groupColumnsList.filter((column) => {
          const label = toDisplayLabel(column).toLowerCase();
          const original = String(column || '').toLowerCase();
          return label.includes(query) || original.includes(query);
        }),
      ])
    );
  }, [groupedColumns, query]);

  const lockedSet = useMemo(() => new Set(lockedColumns), [lockedColumns]);

  function toggleColumn(column) {
    if (lockedSet.has(column)) {
      return;
    }
    const next = visibleColumns.includes(column)
      ? visibleColumns.filter((item) => item !== column)
      : [...visibleColumns, column];
    onChange(normalizeColumns(Array.from(new Set([...next, ...lockedColumns]))));
  }

  function toggleGroupCollapse(groupId) {
    setCollapsedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  function toggleGroupSelection(groupColumnsList) {
    if (!groupColumnsList.length) {
      return;
    }

    const allVisible = groupColumnsList.every((column) => visibleColumns.includes(column));
    const editableColumns = groupColumnsList.filter((column) => !lockedSet.has(column));

    if (allVisible) {
      onChange(normalizeColumns(Array.from(new Set([...visibleColumns.filter((column) => !editableColumns.includes(column)), ...lockedColumns]))));
      return;
    }

    onChange(normalizeColumns(Array.from(new Set([...visibleColumns, ...editableColumns, ...lockedColumns]))));
  }

  function clearSearchAndClose() {
    setSearchInput('');
    setQuery('');
    setOpen(false);
  }

  const panel = (
    <div className={open ? 'column-drawer-backdrop column-drawer-backdrop--open' : 'column-drawer-backdrop'} onClick={clearSearchAndClose} role="presentation">
      <aside
        aria-label="Columns"
        aria-modal="true"
        className={open ? 'column-drawer column-drawer--open' : 'column-drawer'}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="column-drawer__header">
          <div className="column-drawer__header-row">
            <h3>Columns</h3>
            <button
              type="button"
              className="compact-toggle compact-toggle--icon"
              onClick={clearSearchAndClose}
              aria-label="Close columns panel"
            >
              <X size={14} />
            </button>
          </div>

          <label className="column-drawer__search" htmlFor="column-drawer-search">
            <Search size={14} />
            <input
              id="column-drawer-search"
              type="text"
              placeholder="Search columns"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </label>
        </div>

        <div className="column-drawer__content">
          {GROUP_DEFINITIONS.map((group) => {
            const allColumnsInGroup = groupedColumns[group.id] || [];
            const matchingColumns = filteredGroupedColumns[group.id] || [];
            const allMatchingSelected = matchingColumns.length > 0 && matchingColumns.every((column) => visibleColumns.includes(column));

            return (
              <section className="column-group" key={group.id}>
                <div className="column-group__header">
                  <button
                    type="button"
                    className="column-group__toggle"
                    onClick={() => toggleGroupCollapse(group.id)}
                    aria-expanded={!collapsedGroups[group.id]}
                  >
                    {collapsedGroups[group.id] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span>{`${group.title} (${allColumnsInGroup.length})`}</span>
                  </button>

                  <button
                    type="button"
                    className="compact-toggle"
                    onClick={() => toggleGroupSelection(matchingColumns)}
                    disabled={!matchingColumns.length}
                  >
                    {allMatchingSelected ? 'Clear' : 'Select All'}
                  </button>
                </div>

                {!collapsedGroups[group.id] ? (
                  <div className="column-group__list">
                    {matchingColumns.length ? (
                      matchingColumns.map((column) => {
                        const cleanLabel = toDisplayLabel(column);
                        const rawName = String(column || '').trim();
                        const shouldShowRaw = cleanLabel.toLowerCase() !== rawName.toLowerCase();

                        return (
                          <label className="column-group__item" key={column}>
                            <input
                              type="checkbox"
                              checked={visibleColumns.includes(column)}
                              onChange={() => toggleColumn(column)}
                              disabled={lockedSet.has(column)}
                            />
                            <span className="column-group__item-copy">
                              <strong>{cleanLabel}</strong>
                              {lockedSet.has(column) ? <small>Required ticket field</small> : shouldShowRaw ? <small>{rawName}</small> : null}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="column-group__empty">No matching columns</p>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>

        <div className="column-drawer__footer">
          <span>{`${visibleColumns.length} of ${columns.length} visible`}</span>
          <small>Display-only state</small>
        </div>
      </aside>
    </div>
  );

  return (
    <div className="column-selector">
      <button
        type="button"
        className={open ? 'compact-toggle compact-toggle--active' : 'compact-toggle'}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <Columns3 size={15} />
        {`Columns (${visibleColumns.length}/${columns.length})`}
      </button>

      {open && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </div>
  );
}

export default ColumnSelectorDropdown;
