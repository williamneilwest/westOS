export function DatasetSummary({ metadata }) {
  const fileName = metadata?.fileName || 'Unknown';
  const rowCount = metadata?.rowCount ?? 0;
  const columnCount = metadata?.columnCount ?? 0;
  const rawLastUpdated = metadata?.lastUpdated;
  const parsedLastUpdated = rawLastUpdated ? new Date(rawLastUpdated) : null;
  const lastUpdatedLabel = parsedLastUpdated && !Number.isNaN(parsedLastUpdated.getTime())
    ? parsedLastUpdated.toLocaleString()
    : (rawLastUpdated || 'Unknown');

  return (
    <div className="dataset-summary">
      <div className="dataset-summary__left">
        <strong className="dataset-summary__file" title={fileName}>{fileName}</strong>
        <span className="dataset-summary__meta">Last uploaded: {lastUpdatedLabel}</span>
        <span className="dataset-summary__meta">Display settings are local only. Dataset structure is backend-managed.</span>
      </div>

      <div className="dataset-summary__stats" aria-label="Dataset statistics">
        <span className="dataset-stat-chip">Rows: {rowCount}</span>
        <span className="dataset-stat-chip">Columns: {columnCount}</span>
      </div>
    </div>
  );
}

export default DatasetSummary;
