import { useEffect, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { getSoftwareRegistry, searchSoftwareRegistry, uploadSoftwareRegistry } from '../../app/services/api';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { SectionHeader } from '../../app/ui/SectionHeader';

const EMPTY_FILTERS = {
  search: '',
  phi: '',
  corpStandard: '',
  owner: '',
  hosting: '',
};

function normalizeYesNo(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (['yes', 'y', 'true', '1'].includes(raw)) return 'Yes';
  if (['no', 'n', 'false', '0'].includes(raw)) return 'No';
  return String(value || '').trim();
}

function toText(value) {
  return String(value || '').trim();
}

function formatTimestamp(value) {
  if (!value) {
    return 'Unknown';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
}

export function SoftwareRegistryPage({ embedded = false, headerTag = '/app/software' }) {
  const { isAdmin } = useCurrentUser();
  const [allItems, setAllItems] = useState([]);
  const [items, setItems] = useState([]);
  const [latestDocument, setLatestDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('replace');
  const [isUploading, setIsUploading] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  async function loadRegistry() {
    setLoading(true);
    setError('');
    try {
      const payload = await getSoftwareRegistry();
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      setAllItems(rows);
      setItems(rows);
      setLatestDocument(payload?.latest && typeof payload.latest === 'object' ? payload.latest : null);
    } catch (requestError) {
      setError(requestError.message || 'Software registry could not be loaded.');
      setAllItems([]);
      setItems([]);
      setLatestDocument(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRegistry();
  }, []);

  useEffect(() => {
    const search = toText(filters.search);
    if (!search) {
      setItems(allItems);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const payload = await searchSoftwareRegistry(search, { limit: 200 });
          if (isCancelled) {
            return;
          }
          const rows = Array.isArray(payload?.items) ? payload.items : [];
          setItems(rows);
        } catch (requestError) {
          if (isCancelled) {
            return;
          }
          setError(requestError.message || 'Software registry search failed.');
          setItems([]);
        }
      })();
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [filters.search, allItems]);

  const filteredItems = useMemo(() => {
    const ownerFilter = toText(filters.owner).toLowerCase();
    const hostingFilter = toText(filters.hosting).toLowerCase();

    return items.filter((row) => {
      if (filters.phi && normalizeYesNo(row.phi) !== filters.phi) {
        return false;
      }

      if (filters.corpStandard && normalizeYesNo(row.corp_standard) !== filters.corpStandard) {
        return false;
      }

      if (ownerFilter && !toText(row.business_owner).toLowerCase().includes(ownerFilter) && !toText(row.system_owner).toLowerCase().includes(ownerFilter)) {
        return false;
      }

      if (hostingFilter && !toText(row.hosting_provider).toLowerCase().includes(hostingFilter)) {
        return false;
      }

      return true;
    });
  }, [filters, items]);

  const summary = useMemo(() => {
    const total = items.length;
    const corpStandardCount = items.filter((row) => normalizeYesNo(row.corp_standard) === 'Yes').length;
    const phiCount = items.filter((row) => normalizeYesNo(row.phi) === 'Yes').length;
    return {
      total,
      corpStandardCount,
      phiCount,
    };
  }, [items]);

  async function handleUpload() {
    if (!uploadFile) {
      setUploadError('Choose a CSV or XLSX file first.');
      return;
    }

    setUploadError('');
    setUploadMessage('');
    setIsUploading(true);

    try {
      const payload = await uploadSoftwareRegistry(uploadFile, { mode: uploadMode });
      setUploadMessage(`Upload complete: ${payload?.total ?? 0} records (${payload?.mode || uploadMode}).`);
      setUploadFile(null);
      await loadRegistry();
    } catch (requestError) {
      setUploadError(requestError.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  const content = (
    <div className="software-registry-page">
      <SectionHeader
        tag={headerTag}
        title="Software Registry"
        description="Upload and manage the latest approved AdventHealth software registry."
        actions={isAdmin ? (
          <div className="table-actions">
            <label className="compact-toggle" htmlFor="software-registry-upload">
              <Upload size={14} />
              Select File
            </label>
            <input
              id="software-registry-upload"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: 'none' }}
              onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
            />
            <select
              className="ticket-queue__filter"
              value={uploadMode}
              onChange={(event) => setUploadMode(event.target.value)}
            >
              <option value="replace">Replace</option>
              <option value="upsert">Upsert</option>
            </select>
            <button className="ui-button ui-button--primary" type="button" disabled={isUploading || !uploadFile} onClick={() => void handleUpload()}>
              {isUploading ? 'Uploading...' : 'Set Latest Approved'}
            </button>
          </div>
        ) : null}
      />

      {uploadFile && isAdmin ? <p className="status-text">{`Selected: ${uploadFile.name}`}</p> : null}
      {uploadError ? <p className="status-text status-text--error">{uploadError}</p> : null}
      {uploadMessage ? <p className="status-text">{uploadMessage}</p> : null}
      {error ? <p className="status-text status-text--error">{error}</p> : null}

      <Card>
        <CardHeader title="Latest Approved Software File" description="The most recent uploaded source used for this registry." />
        {latestDocument ? (
          <div className="association-summary">
            <div className="association-summary__row"><span>Filename</span><strong>{toText(latestDocument.original_filename) || 'Unknown'}</strong></div>
            <div className="association-summary__row"><span>Records</span><strong>{Number(latestDocument.records || 0)}</strong></div>
            <div className="association-summary__row"><span>Uploaded By</span><strong>{toText(latestDocument.uploaded_by) || 'Unknown'}</strong></div>
            <div className="association-summary__row"><span>Updated</span><strong>{formatTimestamp(latestDocument.uploaded_at)}</strong></div>
          </div>
        ) : (
          <EmptyState title="No latest file set" description="Upload a CSV or XLSX to establish the latest approved software document." />
        )}
      </Card>

      <div className="system-stats" aria-label="Software registry summary">
        <Card className="system-card">
          <CardHeader title="Total Applications" />
          <strong>{summary.total}</strong>
        </Card>
        <Card className="system-card">
          <CardHeader title="Corp Standard Count" />
          <strong>{summary.corpStandardCount}</strong>
        </Card>
        <Card className="system-card">
          <CardHeader title="PHI Enabled Count" />
          <strong>{summary.phiCount}</strong>
        </Card>
      </div>

      <Card>
        <CardHeader title="Filters" description="Refine software records by governance and ownership fields." />
        <div className="logs-toolbar logs-toolbar--open">
          <label className="settings-field">
            <span>Search</span>
            <input
              type="text"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Application name..."
            />
          </label>
          <label className="settings-field">
            <span>PHI</span>
            <select value={filters.phi} onChange={(event) => setFilters((current) => ({ ...current, phi: event.target.value }))}>
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Corp Standard</span>
            <select
              value={filters.corpStandard}
              onChange={(event) => setFilters((current) => ({ ...current, corpStandard: event.target.value }))}
            >
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Owner</span>
            <input
              type="text"
              value={filters.owner}
              onChange={(event) => setFilters((current) => ({ ...current, owner: event.target.value }))}
              placeholder="Business or system owner"
            />
          </label>
          <label className="settings-field">
            <span>Hosting</span>
            <input
              type="text"
              value={filters.hosting}
              onChange={(event) => setFilters((current) => ({ ...current, hosting: event.target.value }))}
              placeholder="Cloud / on-prem"
            />
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader title="Registry Table" description={`${filteredItems.length} records`} />

        {loading ? <p className="status-text">Loading software registry...</p> : null}

        {!loading && !filteredItems.length ? (
          <EmptyState
            title="No software records"
            description="Upload a software CSV or XLSX file to populate this registry."
          />
        ) : null}

        {!loading && filteredItems.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Application</th>
                  <th>Business Function</th>
                  <th>PHI</th>
                  <th>Corp Standard</th>
                  <th>BAA</th>
                  <th>Core Level</th>
                  <th>Twilight</th>
                  <th>System Owner</th>
                  <th>Hosting</th>
                  <th>Deployed Sites</th>
                  <th>Description</th>
                  <th>Business Owner</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((row) => (
                  <tr key={row.id || `${row.vendor_name}-${row.application_name}`}>
                    <td>{toText(row.vendor_name) || '—'}</td>
                    <td>{toText(row.application_name) || '—'}</td>
                    <td>{toText(row.business_function) || '—'}</td>
                    <td>{normalizeYesNo(row.phi) || '—'}</td>
                    <td>{normalizeYesNo(row.corp_standard) || '—'}</td>
                    <td>{normalizeYesNo(row.baa) || '—'}</td>
                    <td>{toText(row.core_level) || '—'}</td>
                    <td>{toText(row.twilight) || '—'}</td>
                    <td>{toText(row.system_owner) || '—'}</td>
                    <td>{toText(row.hosting_provider) || '—'}</td>
                    <td>{toText(row.deployed_sites) || '—'}</td>
                    <td>{toText(row.description) || '—'}</td>
                    <td>{toText(row.business_owner) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className="module">
      {content}
    </section>
  );
}

export default SoftwareRegistryPage;
