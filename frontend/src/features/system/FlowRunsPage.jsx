import { useEffect, useMemo, useState } from 'react';
import { Filter, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getFlowRunById, getFlowRuns } from '../../app/services/api';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { SectionHeader } from '../../app/ui/SectionHeader';

function formatTimestamp(value) {
  const parsed = new Date(String(value || ''));
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }
  return parsed.toLocaleString();
}

function parsePreview(text, maxChars = 1200) {
  const value = String(text || '');
  return value.length <= maxChars ? value : `${value.slice(0, maxChars)}...`;
}

export function FlowRunsPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState({
    flowName: '',
    status: '',
    userId: '',
  });
  const [showFullInput, setShowFullInput] = useState(false);
  const [showFullOutput, setShowFullOutput] = useState(false);
  const [detailTab, setDetailTab] = useState('output');

  async function loadRuns() {
    setLoading(true);
    setError('');
    try {
      const payload = await getFlowRuns({
        flowName: filters.flowName,
        status: filters.status,
        userId: filters.userId,
      });
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      setItems(rows);
      if (!rows.some((row) => row.id === selectedId)) {
        setSelectedId(rows[0]?.id || null);
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not load flow runs.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedRun(null);
      return;
    }
    let mounted = true;
    setDetailLoading(true);
    setShowFullInput(false);
    setShowFullOutput(false);
    setDetailTab('output');
    getFlowRunById(selectedId)
      .then((payload) => {
        if (!mounted) {
          return;
        }
        setSelectedRun(payload?.item || null);
      })
      .catch((requestError) => {
        if (mounted) {
          setError(requestError.message || 'Could not load flow run detail.');
          setSelectedRun(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setDetailLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const uniqueUsers = useMemo(
    () => Array.from(new Set(items.map((item) => String(item.user_id || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [items]
  );

  return (
    <section className="module">
      <SectionHeader
        tag="/app/flows"
        title="Flow Execution Tracking"
        description="Inspect external flow runs, inputs, outputs, and execution status."
      />

      {error ? <p className="status-text status-text--error">{error}</p> : null}

      <Card>
        <CardHeader
          eyebrow="Filters"
          title="Flow Runs"
          description={isAdmin ? 'Admin view: all users.' : `Scoped to your account (${user?.username || 'user'}).`}
          action={(
            <div className="table-actions">
              <button className="compact-toggle" type="button" onClick={() => navigate('/app/flows/templates')}>
                Templates
              </button>
            </div>
          )}
        />
        <div className="flow-runs-filters-inline">
          <label className="settings-field flow-runs-filters-inline__field">
            <span>Flow Name</span>
            <input
              type="text"
              value={filters.flowName}
              onChange={(event) => setFilters((current) => ({ ...current, flowName: event.target.value }))}
              placeholder="Search flow name"
            />
          </label>
          <label className="settings-field flow-runs-filters-inline__field">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="">All</option>
              <option value="success">success</option>
              <option value="error">error</option>
            </select>
          </label>
          {isAdmin ? (
            <label className="settings-field flow-runs-filters-inline__field">
              <span>User</span>
              <select
                value={filters.userId}
                onChange={(event) => setFilters((current) => ({ ...current, userId: event.target.value }))}
              >
                <option value="">All users</option>
                {uniqueUsers.map((id) => (
                  <option key={`flow-user-${id}`} value={id}>{id}</option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" className="compact-toggle flow-runs-filters-inline__refresh" onClick={() => void loadRuns()} disabled={loading}>
            <RefreshCcw size={14} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </Card>

      <div className="work-layout">
        <Card>
          <CardHeader eyebrow="Runs" title="Flow Run History" action={<span className="icon-badge"><Filter size={16} /></span>} />
          {loading ? <p className="status-text">Loading runs...</p> : null}
          {!loading && !items.length ? (
            <EmptyState icon={<Filter size={20} />} title="No flow runs" description="No records matched the current filters." />
          ) : null}
          {!loading && items.length ? (
            <div className="data-table-wrap">
              <table className="data-table flow-runs-table flow-runs-table--compact">
                <thead>
                  <tr>
                    <th>Flow</th>
                    <th>Status</th>
                    <th>User</th>
                    <th>Timestamp</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={`flow-run-${item.id}`}
                      className={item.id === selectedId ? 'data-table__row--selected flow-runs-table__row flow-runs-table__row--selected' : 'flow-runs-table__row'}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <td>{item.flow_name}</td>
                      <td>
                        <span className={item.status === 'success' ? 'association-status association-status--assigned' : 'association-status association-status--missing'}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.user_id || 'n/a'}</td>
                      <td>{formatTimestamp(item.created_at)}</td>
                      <td>{`${Number(item.duration_ms || 0)} ms`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader eyebrow="Detail" title="Run Detail" />
          {detailLoading ? <p className="status-text">Loading detail...</p> : null}
          {!detailLoading && !selectedRun ? (
            <EmptyState icon={<Filter size={20} />} title="No run selected" description="Select a row to inspect input and output." />
          ) : null}
          {!detailLoading && selectedRun ? (
            <div className="flow-detail-tabs-wrap">
              <div className="flow-detail-tabs" role="tablist" aria-label="Run detail tabs">
                <button
                  type="button"
                  className={detailTab === 'input' ? 'compact-toggle compact-toggle--active' : 'compact-toggle'}
                  onClick={() => setDetailTab('input')}
                >
                  Input
                </button>
                <button
                  type="button"
                  className={detailTab === 'output' ? 'compact-toggle compact-toggle--active' : 'compact-toggle'}
                  onClick={() => setDetailTab('output')}
                >
                  Output
                </button>
                <button
                  type="button"
                  className={detailTab === 'meta' ? 'compact-toggle compact-toggle--active' : 'compact-toggle'}
                  onClick={() => setDetailTab('meta')}
                >
                  Meta
                </button>
              </div>

              {detailTab === 'input' ? (
                <div className="flow-detail-panel">
                  <div className="table-actions">
                    <button type="button" className="compact-toggle" onClick={() => setShowFullInput((current) => !current)}>
                      {showFullInput ? 'Collapse JSON' : 'Expand JSON'}
                    </button>
                  </div>
                  <pre className="code-block">{showFullInput ? String(selectedRun.input_json || '') : parsePreview(selectedRun.input_json)}</pre>
                </div>
              ) : null}

              {detailTab === 'output' ? (
                <div className="flow-detail-panel">
                  <div className="table-actions">
                    <button type="button" className="compact-toggle" onClick={() => setShowFullOutput((current) => !current)}>
                      {showFullOutput ? 'Collapse JSON' : 'Expand JSON'}
                    </button>
                  </div>
                  <pre className="code-block">{showFullOutput ? String(selectedRun.output_json || '') : parsePreview(selectedRun.output_json)}</pre>
                </div>
              ) : null}

              {detailTab === 'meta' ? (
                <div className="flow-detail-panel">
                  <div className="dataset-metrics-grid">
                    <div className="metric-tile"><span>Flow</span><strong>{selectedRun.flow_name}</strong></div>
                    <div className="metric-tile"><span>Status</span><strong>{selectedRun.status}</strong></div>
                    <div className="metric-tile"><span>User</span><strong>{selectedRun.user_id || 'n/a'}</strong></div>
                    <div className="metric-tile"><span>Duration</span><strong>{`${Number(selectedRun.duration_ms || 0)} ms`}</strong></div>
                    <div className="metric-tile"><span>Timestamp</span><strong>{formatTimestamp(selectedRun.created_at)}</strong></div>
                    <div className="metric-tile"><span>Error</span><strong>{selectedRun.error_message || 'None'}</strong></div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>
      </div>
    </section>
  );
}

export default FlowRunsPage;
