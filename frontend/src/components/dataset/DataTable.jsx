import { memo } from 'react';
import { EmptyState } from '../../app/ui/EmptyState';
import { formatColumnLabel, getCellText } from './utils';

export const DataTable = memo(function DataTable({
  rows = [],
  visibleColumns = [],
  sortConfig = { column: '', direction: 'asc' },
  onSort,
  onRowSelect,
  selectedRow,
  rowKey,
  emptyText = 'No rows match the current filters.',
  readOnly = false,
  cellFormatter = null,
}) {
  void readOnly;
  if (!visibleColumns.length) {
    return <EmptyState title="No visible columns" description="Select columns to render the dataset table." />;
  }

  return (
    <div className="dataset-table-wrap">
      <table className="dataset-table">
        <thead>
          <tr>
            {visibleColumns.map((column) => {
              const isSorted = sortConfig.column === column;
              return (
                <th key={column}>
                  <button type="button" className="dataset-table__sort" onClick={() => onSort?.(column)}>
                    <span>{formatColumnLabel(column)}</span>
                    <span aria-hidden="true">{isSorted ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, rowIndex) => {
              const key = typeof rowKey === 'function' ? rowKey(row, rowIndex) : `row-${rowIndex}`;
              const isSelected = selectedRow === row;
              return (
                <tr
                  key={key}
                  className={isSelected ? 'dataset-table__row dataset-table__row--selected' : 'dataset-table__row'}
                  onClick={() => onRowSelect?.(row)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowSelect?.(row);
                    }
                  }}
                  tabIndex={0}
                >
                  {visibleColumns.map((column) => {
                    const value = getCellText(row, column) || '—';
                    const renderedValue = typeof cellFormatter === 'function'
                      ? cellFormatter({ value, row, column })
                      : value;
                    return (
                      <td key={`${key}-${column}`}>
                        <span className="dataset-table__cell" title={value}>{renderedValue}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="dataset-table__empty" colSpan={visibleColumns.length}>{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default DataTable;
