import { useEffect, useMemo, useState } from 'react';
import { Play, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

async function adminRequest(path, options = {}) {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    credentials: 'include',
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return payload || {};
}

export function AdminFlowsPage() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFlow, setSelectedFlow] = useState('');
  const [inputJson, setInputJson] = useState('{\n  "searchText": "resp"\n}');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  async function loadFlows() {
    setLoading(true);
    setError('');
    try {
      const payload = await adminRequest('/api/admin/flows');
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setFlows(items);
      if (!selectedFlow && items.length) {
        setSelectedFlow(items[0].name);
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not load flow metadata.');
      setFlows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFlows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = useMemo(
    () => flows.find((item) => item.name === selectedFlow) || null,
    [flows, selectedFlow]
  );

  async function handleRun() {
    if (!selectedFlow) {
      setError('Select a flow first.');
      return;
    }

    let variables = {};
    try {
      variables = JSON.parse(inputJson || '{}');
    } catch {
      setError('Input JSON is invalid.');
      return;
    }

    setRunning(true);
    setError('');
    setResult(null);
    try {
      const payload = await adminRequest('/api/admin/flows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flow_name: selectedFlow, variables }),
      });
      setResult(payload?.item || null);
    } catch (requestError) {
      setError(requestError.message || 'Flow run failed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="module">
      <Card>
        <CardHeader
          eyebrow="/app/admin/flows"
          title="Flow Control Center"
          description="Admin-only flow metadata, test execution, and output inspection."
          action={
            <div className="table-actions">
              <Link className="compact-toggle" to="/app/admin/flow-builder">
                Open Flow Builder
              </Link>
              <button className="compact-toggle" type="button" onClick={() => void loadFlows()} disabled={loading}>
                <RefreshCcw size={14} />
                Refresh
              </button>
            </div>
          }
        />
        {error ? <p className="status-text status-text--error">{error}</p> : null}
      </Card>

      <div className="work-layout">
        <Card>
          <CardHeader eyebrow="Registry" title="Registered Flows" />
          {loading ? <p className="status-text">Loading flows...</p> : null}
          {!loading && !flows.length ? (
            <EmptyState title="No flows" description="No registered flows are currently available." />
          ) : null}
          {!loading && flows.length ? (
            <div className="stack-list">
              {flows.map((flow) => (
                <button
                  key={flow.name}
                  type="button"
                  className={selectedFlow === flow.name ? 'stack-row stack-row--interactive association-list__item--selected' : 'stack-row stack-row--interactive'}
                  onClick={() => setSelectedFlow(flow.name)}
                >
                  <span className="stack-row__label">
                    <span>
                      <strong>{flow.name}</strong>
                      <small>{flow.description}</small>
                      <small>{`Script: ${flow.script_name}`}</small>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            eyebrow="Test Run"
            title={selected?.name || 'Flow Test'}
            description={selected ? `Required vars: ${(selected.required_variables || []).join(', ')}` : 'Select a flow to run a test.'}
            action={
              <button className="ui-button ui-button--primary" type="button" onClick={() => void handleRun()} disabled={running || !selected}>
                <Play size={15} />
                {running ? 'Running...' : 'Run Test'}
              </button>
            }
          />
          <label className="settings-field">
            <span>Input JSON</span>
            <textarea
              className="association-script association-script--fit"
              value={inputJson}
              onChange={(event) => setInputJson(event.target.value)}
            />
          </label>
          {result ? (
            <div className="analysis-grid">
              <Card>
                <CardHeader eyebrow="Status" title="Execution" />
                <p>{`Flow: ${result.flow_name}`}</p>
                <p>{`HTTP: ${result.status_code}`}</p>
              </Card>
              <Card>
                <CardHeader eyebrow="Output" title="Response" />
                <pre className="code-block">{JSON.stringify(result.response || {}, null, 2)}</pre>
              </Card>
            </div>
          ) : null}
        </Card>
      </div>
    </section>
  );
}

export default AdminFlowsPage;
