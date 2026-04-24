import { ChevronDown, ChevronUp, Clock3, FileSpreadsheet, History, Upload } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { formatDataFileName } from '../../app/utils/fileDisplay';
import { ColumnSelectorDropdown } from '../../components/dataset/ColumnSelectorDropdown';
import { DatasetSummary } from '../../components/dataset/DatasetSummary';

export function DatasetPage({
  datasetState,
  onVisibleColumnsChange,
  onUploadClick,
  onToggleHistory,
  onToggleUploads,
  isHistoryExpanded,
  isUploadsExpanded,
  recentAnalyses,
  isLoadingRecent,
  onRecentRunSelect,
  uploadedFiles,
  isLoadingUploads,
  onUploadSelect,
  leftControls,
  rightControls,
  uploadDisabled = false,
  uploadDisabledReason = '',
  showChangeDatasetSection = true,
  changeDatasetCollapsible = true,
  showColumnSelector = true,
  children,
}) {
  const [isChangeOpen, setIsChangeOpen] = useState(false);
  const metadata = datasetState?.metadata || {};
  const visibleCount = datasetState?.visibleColumns?.length || 0;
  const totalColumns = datasetState?.columns?.length || 0;

  return (
    <div className="dataset-layout">
      <Card className="dataset-layout__summary-card">
        <DatasetSummary metadata={metadata} />

        <div className="dataset-control-bar">
          <div className="dataset-control-bar__left">
            {showColumnSelector ? (
              <ColumnSelectorDropdown
                columns={datasetState?.columns || []}
                visibleColumns={datasetState?.visibleColumns || []}
                onChange={onVisibleColumnsChange}
                lockedColumns={datasetState?.metadata?.ticketColumn ? [datasetState.metadata.ticketColumn] : []}
              />
            ) : null}
            {leftControls}
          </div>
          <div className="dataset-control-bar__right">
            {rightControls}
          </div>
        </div>

        <div className="dataset-layout__column-row">
          <span className="status-text">{`${visibleCount} of ${totalColumns} columns visible`}</span>
          <small className="status-text">Column, sort, and filter changes are display-only.</small>
        </div>
      </Card>

      {showChangeDatasetSection ? (
        <Card className="dataset-layout__change-card">
          {changeDatasetCollapsible ? (
            <button
              className={isChangeOpen ? 'compact-toggle compact-toggle--active dataset-change-toggle' : 'compact-toggle dataset-change-toggle'}
              onClick={() => setIsChangeOpen((current) => !current)}
              type="button"
              aria-expanded={isChangeOpen}
            >
              {isChangeOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Change Dataset
            </button>
          ) : (
            <div className="dataset-panel__section-header">
              <h4>Change Dataset</h4>
            </div>
          )}

          {isChangeOpen || !changeDatasetCollapsible ? (
            <>
              <div className="dataset-panel__action-grid">
                <button
                  className="compact-toggle dataset-panel__action"
                  onClick={onUploadClick}
                  type="button"
                  disabled={uploadDisabled}
                  title={uploadDisabled ? uploadDisabledReason : ''}
                >
                  <Upload size={15} />
                  Upload New File
                </button>
                <button className="compact-toggle dataset-panel__action" onClick={onToggleHistory} type="button">
                  <History size={15} />
                  Choose Recent Run
                </button>
                <button className="compact-toggle dataset-panel__action" onClick={onToggleUploads} type="button">
                  <FileSpreadsheet size={15} />
                  Choose Upload
                </button>
              </div>

              {metadata?.categoryField ? (
                <div className="dataset-panel__section dataset-panel__section--compact">
                  <div className="dataset-panel__section-header">
                    <h4>Advanced Settings</h4>
                    <p>{`Category field: ${metadata.categoryField}`}</p>
                  </div>
                </div>
              ) : null}

              {isHistoryExpanded ? (
                <div className="dataset-panel__section">
                  <div className="dataset-panel__section-header"><h4>Recent Runs</h4></div>
                  {recentAnalyses?.length ? (
                    <div className="stack-list">
                      {recentAnalyses.map((entry) => (
                        <button key={entry.id} className="stack-row stack-row--interactive" onClick={() => onRecentRunSelect(entry)} type="button">
                          <span className="stack-row__label">
                            <History size={16} />
                            <span>
                              <strong>{formatDataFileName(entry.fileName)}</strong>
                              <small>{new Date(entry.savedAt).toLocaleString()}</small>
                            </span>
                          </span>
                          <strong>{entry.analysis?.rowCount || 0} rows</strong>
                        </button>
                      ))}
                    </div>
                  ) : isLoadingRecent ? (
                    <div className="skeleton-stack"><div className="skeleton-line" /><div className="skeleton-line" /></div>
                  ) : (
                    <EmptyState icon={<Clock3 size={20} />} title="No saved analyses yet" description="Analyze a dataset once and recent runs will appear here." />
                  )}
                </div>
              ) : null}

              {isUploadsExpanded ? (
                <div className="dataset-panel__section">
                  <div className="dataset-panel__section-header"><h4>Uploaded Files</h4></div>
                  {uploadedFiles?.length ? (
                    <div className="stack-list">
                      {uploadedFiles.map((file) => (
                        <button key={file.filename} className="stack-row stack-row--interactive" onClick={() => onUploadSelect(file)} type="button">
                          <span className="stack-row__label">
                            <Upload size={16} />
                            <span>
                              <strong>{formatDataFileName(file.filename)}</strong>
                              <small>{file.url || file.modifiedAt || 'Uploaded source'}</small>
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : isLoadingUploads ? (
                    <div className="skeleton-stack"><div className="skeleton-line" /><div className="skeleton-line" /></div>
                  ) : (
                    <EmptyState icon={<Upload size={20} />} title="No uploads yet" description="Upload files to reuse them in dataset views." />
                  )}
                </div>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}

      {children}
    </div>
  );
}

export default DatasetPage;
