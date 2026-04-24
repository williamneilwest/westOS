import { Database, Eye, Pencil, RefreshCw, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { deleteDataSource, deleteDataSourceRow, getDataSourceData, getDataSources, getUploads, promoteUploadToSource, replaceDataSourceFile, updateDataSource } from '../../app/services/api';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { SectionHeader } from '../../app/ui/SectionHeader';

function formatDate(value) {
  if (!value) {
    return 'Unknown';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }
  return parsed.toLocaleString();
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function DataSourcesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useCurrentUser();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeSource, setActiveSource] = useState('');
  const [activeRows, setActiveRows] = useState([]);
  const [activeColumns, setActiveColumns] = useState([]);
  const [activeUpdatedAt, setActiveUpdatedAt] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [uploads, setUploads] = useState([]);
  const [selectedUploadPath, setSelectedUploadPath] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewNormalized, setPreviewNormalized] = useState(true);
  const [deletingRowKey, setDeletingRowKey] = useState('');
  const [deletingSourceId, setDeletingSourceId] = useState(0);
  const [editingSource, setEditingSource] = useState(null);
  const [editSourceKey, setEditSourceKey] = useState('');
  const [editSourceName, setEditSourceName] = useState('');
  const [savingSourceDetails, setSavingSourceDetails] = useState(false);
  const [replacingSource, setReplacingSource] = useState(null);
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacingFile, setReplacingFile] = useState(false);

  async function loadSources() {
    setLoading(true);
    setError('');
    try {
      const payload = await getDataSources();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setSources(items);
    } catch (requestError) {
      setError(requestError.message || 'Data sources could not be loaded.');
      setSources([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSources();
  }, []);

  async function openPromoteModal() {
    setError('');
    setMessage('');
    setShowPromoteModal(true);
    try {
      const files = await getUploads();
      const items = Array.isArray(files) ? files : [];
      setUploads(items);
      setSelectedUploadPath(items[0]?.path || '');
      setSourceName(items[0]?.filename ? normalizeName(items[0].filename.replace(/\.[^.]+$/, '')) : '');
    } catch (requestError) {
      setError(requestError.message || 'Uploads could not be loaded.');
      setUploads([]);
    }
  }

  async function handlePromote() {
    if (!selectedUploadPath) {
      setError('Select an uploaded file first.');
      return;
    }

    const normalized = normalizeName(sourceName);
    if (!normalized) {
      setError('Enter a source name.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const payload = await promoteUploadToSource({
        filePath: selectedUploadPath,
        name: normalized,
        type: 'csv',
      });
      setShowPromoteModal(false);
      setMessage(`Promoted "${payload?.source?.name || normalized}" as active source.`);
      await loadSources();
    } catch (requestError) {
      setError(requestError.message || 'Promote to source failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewData(name) {
    const normalized = normalizeName(name);
    if (!normalized) {
      return;
    }
    setActiveSource(normalized);
    setError('');
    try {
      const payload = await getDataSourceData(normalized, { normalized: previewNormalized });
      const rows = Array.isArray(payload?.rows) ? payload.rows : (Array.isArray(payload?.items) ? payload.items : []);
      const columns = Array.isArray(payload?.columns)
        ? payload.columns
        : (rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0]) : []);
      setActiveRows(rows);
      setActiveColumns(columns);
      const sourceMeta = sources.find((source) => normalizeName(source.key || source.name) === normalized);
      setActiveUpdatedAt(sourceMeta?.updated_at || sourceMeta?.last_updated || '');
    } catch (requestError) {
      setError(requestError.message || 'Source data could not be loaded.');
      setActiveRows([]);
      setActiveColumns([]);
      setActiveUpdatedAt('');
    }
  }

  function buildRowDeleteFilters(row) {
    if (!row || typeof row !== 'object') {
      return {};
    }
    const idValue = row.id ?? row.group_id ?? row.opid ?? row.user_id;
    if (idValue !== undefined && idValue !== null && String(idValue).trim() !== '') {
      return { id: idValue };
    }
    const filters = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === undefined) {
        continue;
      }
      if (value === null || String(value).trim() !== '') {
        filters[key] = value;
      }
    }
    return filters;
  }

  function extractRecordIdentifier(row) {
    if (!row || typeof row !== 'object') {
      return '';
    }
    const candidate = row.id ?? row.opid ?? row.user_id ?? row.group_id;
    return candidate === undefined || candidate === null ? '' : String(candidate).trim();
  }

  async function handleDeleteRow(row, index) {
    if (!activeSource) {
      return;
    }
    const filters = buildRowDeleteFilters(row);
    if (!Object.keys(filters).length) {
      setError('Could not determine row identifier for delete.');
      return;
    }
    const confirmed = window.confirm('Delete this row from the source table? This cannot be undone.');
    if (!confirmed) {
      return;
    }
    const rowKey = `${activeSource}-${index}`;
    setDeletingRowKey(rowKey);
    setError('');
    setMessage('');
    try {
      const payload = await deleteDataSourceRow(activeSource, filters);
      setMessage(`Deleted ${payload?.deleted || 0} row(s) from ${activeSource}.`);
      await loadSources();
      await handleViewData(activeSource);
    } catch (requestError) {
      setError(requestError.message || 'Delete row failed.');
    } finally {
      setDeletingRowKey('');
    }
  }

  async function handleDeleteSource(source) {
    const sourceId = Number(source?.id || 0);
    if (!sourceId) {
      return;
    }
    const sourceLabel = String(source?.display_name || source?.name || sourceId).trim();
    const confirmed = window.confirm(`Remove source "${sourceLabel}"? This will also drop its backing table when possible.`);
    if (!confirmed) {
      return;
    }
    setDeletingSourceId(sourceId);
    setError('');
    setMessage('');
    try {
      const payload = await deleteDataSource(sourceId, { dropTable: true });
      const dropped = Boolean(payload?.table_dropped);
      setMessage(dropped ? `Removed "${sourceLabel}" and dropped its table.` : `Removed "${sourceLabel}".`);
      if (normalizeName(activeSource) === normalizeName(source?.key || source?.name)) {
        setActiveSource('');
        setActiveRows([]);
        setActiveColumns([]);
        setActiveUpdatedAt('');
      }
      await loadSources();
    } catch (requestError) {
      setError(requestError.message || 'Source removal failed.');
    } finally {
      setDeletingSourceId(0);
    }
  }

  function openEditSourceModal(source) {
    setEditingSource(source || null);
    setEditSourceKey(String(source?.key || source?.name || '').trim());
    setEditSourceName(String(source?.display_name || source?.name || '').trim());
  }

  async function saveSourceDetails() {
    const sourceId = Number(editingSource?.id || 0);
    if (!sourceId) {
      return;
    }
    const nextKey = normalizeName(editSourceKey);
    const nextName = String(editSourceName || '').trim();
    if (!nextKey) {
      setError('Source key is required.');
      return;
    }
    if (!nextName) {
      setError('Source Data Name is required.');
      return;
    }

    setSavingSourceDetails(true);
    setError('');
    setMessage('');
    try {
      await updateDataSource(sourceId, {
        key: nextKey,
        sourceName: nextName,
      });
      setMessage(`Updated source details for "${nextName}".`);
      setEditingSource(null);
      await loadSources();
      if (activeSource && normalizeName(activeSource) === normalizeName(editingSource?.key || editingSource?.name)) {
        setActiveSource(nextKey);
      }
    } catch (requestError) {
      setError(requestError.message || 'Source details update failed.');
    } finally {
      setSavingSourceDetails(false);
    }
  }

  function openReplaceSourceModal(source) {
    setReplacingSource(source || null);
    setReplacementFile(null);
  }

  async function handleReplaceSourceFile() {
    const sourceId = Number(replacingSource?.id || 0);
    if (!sourceId) {
      return;
    }
    if (!(replacementFile instanceof File)) {
      setError('Choose a file to upload.');
      return;
    }

    setReplacingFile(true);
    setError('');
    setMessage('');
    try {
      const payload = await replaceDataSourceFile(sourceId, replacementFile);
      const nextSource = payload?.source || replacingSource;
      const sourceLabel = String(nextSource?.display_name || nextSource?.name || replacingSource?.display_name || '').trim() || 'source';
      setMessage(`Uploaded fresh data for "${sourceLabel}" and activated the new source file.`);
      setReplacingSource(null);
      setReplacementFile(null);
      await loadSources();

      const nextActiveSource = normalizeName(nextSource?.key || nextSource?.name || '');
      if (nextActiveSource) {
        setActiveSource(nextActiveSource);
        await handleViewData(nextActiveSource);
      }
    } catch (requestError) {
      setError(requestError.message || 'Fresh source upload failed.');
    } finally {
      setReplacingFile(false);
    }
  }

  useEffect(() => {
    if (!activeSource) {
      return;
    }
    void handleViewData(activeSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewNormalized]);

  const tableColumns = useMemo(() => activeColumns, [activeColumns]);

  return (
    <section className="module">
      <SectionHeader
        tag="/app/data-sources"
        title="Data Sources"
        description="Source of truth datasets promoted from uploads and reused across modules."
        actions={(
          <div className="table-actions">
            <button className="compact-toggle" type="button" onClick={() => void loadSources()}>
              <RefreshCw size={14} />
              Refresh
            </button>
            <button className="ui-button ui-button--primary" type="button" onClick={() => void openPromoteModal()}>
              <Upload size={14} />
              Promote from Upload
            </button>
          </div>
        )}
      />

      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {message ? <p className="status-text">{message}</p> : null}

      <div className="work-layout">
        <Card>
          <CardHeader title="Registered Sources" description={`${sources.length} source${sources.length === 1 ? '' : 's'}`} />
          {loading ? <p className="status-text">Loading sources...</p> : null}
          {!loading && !sources.length ? (
            <EmptyState
              icon={<Database size={20} />}
              title="No data sources"
              description="Promote an uploaded file to create a source of truth."
            />
          ) : null}
          {!loading && sources.length ? (
            <div className="stack-list">
              {sources.map((source) => (
                <div key={source.id} className="stack-row">
                  <span className="stack-row__label">
                    <span>
                      <strong>{source.display_name || source.name}</strong>
                      <small>{`Key: ${source.key || source.name}`}</small>
                      <small>{`Table: ${source.table_name || source.name}`}</small>
                      <small>{`Updated ${formatDate(source.updated_at || source.last_updated)} · ${source.row_count ?? source.active_version?.row_count ?? 0} rows`}</small>
                    </span>
                  </span>
                  <div className="stack-row__actions">
                    <button className="compact-toggle" type="button" onClick={() => void handleViewData(source.key || source.name)}>
                      <Eye size={14} />
                      View Data
                    </button>
                    {isAdmin ? (
                      <button
                        className="compact-toggle"
                        type="button"
                        onClick={() => openReplaceSourceModal(source)}
                      >
                        <Upload size={14} />
                        Upload Fresh Data
                      </button>
                    ) : null}
                    <button
                      className="compact-toggle"
                      type="button"
                      onClick={() => openEditSourceModal(source)}
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      className="compact-toggle"
                      type="button"
                      onClick={() => void handleDeleteSource(source)}
                      disabled={deletingSourceId === Number(source.id)}
                    >
                      <Trash2 size={14} />
                      {deletingSourceId === Number(source.id) ? 'Removing...' : 'Remove Source'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            title="Source Preview"
            description={activeSource ? `${activeSource} · ${activeRows.length} rows · Updated ${formatDate(activeUpdatedAt)}` : 'Select a source to inspect data.'}
            action={(
              <div className="table-actions">
                <button
                  className={!previewNormalized ? 'compact-toggle compact-toggle--active' : 'compact-toggle'}
                  type="button"
                  onClick={() => setPreviewNormalized(false)}
                >
                  Raw
                </button>
                <button
                  className={previewNormalized ? 'compact-toggle compact-toggle--active' : 'compact-toggle'}
                  type="button"
                  onClick={() => setPreviewNormalized(true)}
                >
                  Normalized
                </button>
              </div>
            )}
          />
          {!activeSource ? <p className="status-text">Choose a source and click View Data.</p> : null}
          {activeSource && !activeRows.length ? <p className="status-text">No rows returned for this source.</p> : null}
          {activeSource && activeRows.length ? (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.slice(0, 100).map((row, index) => (
                    <tr key={`${activeSource}-${index}`}>
                      {tableColumns.map((column) => (
                        <td key={`${activeSource}-${index}-${column}`}>{String(row?.[column] ?? '') || '—'}</td>
                      ))}
                      <td>
                        <div className="stack-row__actions">
                          {extractRecordIdentifier(row) ? (
                            <button
                              type="button"
                              className="compact-toggle"
                              onClick={() => {
                                const id = extractRecordIdentifier(row);
                                navigate(`/app/data/view/${encodeURIComponent(activeSource)}/${encodeURIComponent(id)}`, {
                                  state: {
                                    from: `${location.pathname}${location.search || ''}`,
                                    label: 'Data Sources',
                                  },
                                });
                              }}
                            >
                              <Eye size={14} />
                              View
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="compact-toggle"
                            onClick={() => void handleDeleteRow(row, index)}
                            disabled={deletingRowKey === `${activeSource}-${index}`}
                          >
                            <Trash2 size={14} />
                            {deletingRowKey === `${activeSource}-${index}` ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      </div>

      {showPromoteModal ? (
        <div className="auth-modal" role="presentation" onClick={() => setShowPromoteModal(false)}>
          <div className="auth-modal__surface" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <Card className="auth-modal__card">
              <CardHeader title="Promote Upload to Source" description="Select an uploaded file and assign a source name." />
              <div className="settings-form">
                <label className="settings-field">
                  <span>Upload</span>
                  <select value={selectedUploadPath} onChange={(event) => setSelectedUploadPath(event.target.value)}>
                    {uploads.map((file) => (
                      <option key={file.path} value={file.path}>
                        {file.filename}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="settings-field">
                  <span>Source Name</span>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(event) => setSourceName(event.target.value)}
                    placeholder="users_master"
                  />
                </label>
              </div>
              <div className="table-actions">
                <button className="compact-toggle" type="button" onClick={() => setShowPromoteModal(false)}>
                  Cancel
                </button>
                <button className="ui-button ui-button--primary" type="button" disabled={submitting} onClick={() => void handlePromote()}>
                  {submitting ? 'Promoting...' : 'Promote'}
                </button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {editingSource ? (
        <div className="auth-modal" role="presentation" onClick={() => setEditingSource(null)}>
          <div className="auth-modal__surface" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <Card className="auth-modal__card">
              <CardHeader title="Edit Source Details" description="Update source key and source data name." />
              <div className="settings-form">
                <label className="settings-field">
                  <span>Key Name</span>
                  <input
                    type="text"
                    value={editSourceKey}
                    onChange={(event) => setEditSourceKey(event.target.value)}
                    placeholder="users_master"
                  />
                </label>
                <label className="settings-field">
                  <span>Source Data Name</span>
                  <input
                    type="text"
                    value={editSourceName}
                    onChange={(event) => setEditSourceName(event.target.value)}
                    placeholder="Users Master"
                  />
                </label>
              </div>
              <div className="table-actions">
                <button className="compact-toggle" type="button" onClick={() => setEditingSource(null)}>
                  Cancel
                </button>
                <button className="ui-button ui-button--primary" type="button" disabled={savingSourceDetails} onClick={() => void saveSourceDetails()}>
                  {savingSourceDetails ? 'Saving...' : 'Save'}
                </button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {replacingSource ? (
        <div className="auth-modal" role="presentation" onClick={() => setReplacingSource(null)}>
          <div className="auth-modal__surface" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <Card className="auth-modal__card">
              <CardHeader
                title="Upload Fresh Source File"
                description={`Replace the active file for ${replacingSource.display_name || replacingSource.name}.`}
              />
              <div className="settings-form">
                <label className="settings-field">
                  <span>Current Source</span>
                  <input type="text" value={String(replacingSource.display_name || replacingSource.name || '').trim()} readOnly />
                </label>
                <label className="settings-field">
                  <span>New File</span>
                  <input
                    type="file"
                    accept=".csv,.json,.txt,.xlsx,.xls,.doc,.docx,.pdf"
                    onChange={(event) => setReplacementFile(event.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="table-actions">
                <button className="compact-toggle" type="button" onClick={() => setReplacingSource(null)}>
                  Cancel
                </button>
                <button className="ui-button ui-button--primary" type="button" disabled={replacingFile} onClick={() => void handleReplaceSourceFile()}>
                  {replacingFile ? 'Uploading...' : 'Upload Fresh Data'}
                </button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default DataSourcesPage;
