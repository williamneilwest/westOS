import { useEffect, useMemo, useState } from 'react';
import { Play, Plus, RefreshCcw, Save, Trash2 } from 'lucide-react';
import {
  createFlowTemplate,
  deleteFlowTemplate,
  getFlowTemplates,
  runFlowTemplate,
  updateFlowTemplate,
} from '../../app/services/api';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { SectionHeader } from '../../app/ui/SectionHeader';

const EMPTY_TEMPLATE = {
  id: null,
  script_name: '',
  display_name: '',
  description: '',
  input_schema: [],
};

function normalizeTemplate(template) {
  const item = template && typeof template === 'object' ? template : {};
  return {
    id: item.id ?? null,
    script_name: String(item.script_name || '').trim(),
    display_name: String(item.display_name || '').trim(),
    description: String(item.description || '').trim(),
    input_schema: Array.isArray(item.input_schema)
      ? item.input_schema.map((field) => ({
          name: String(field?.name || '').trim(),
          type: ['string', 'number', 'boolean'].includes(String(field?.type || '').toLowerCase())
            ? String(field?.type || '').toLowerCase()
            : 'string',
          required: Boolean(field?.required),
        }))
      : [],
  };
}

function buildDefaultVariables(schema = []) {
  return schema.reduce((acc, field) => {
    const name = String(field?.name || '').trim();
    if (!name) {
      return acc;
    }
    const type = String(field?.type || 'string').toLowerCase();
    if (type === 'number') {
      acc[name] = 0;
    } else if (type === 'boolean') {
      acc[name] = false;
    } else {
      acc[name] = '';
    }
    return acc;
  }, {});
}

function coerceValue(type, rawValue) {
  const normalizedType = String(type || 'string').toLowerCase();
  if (normalizedType === 'number') {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (normalizedType === 'boolean') {
    return Boolean(rawValue);
  }
  return String(rawValue ?? '');
}

function formatTimestamp(value) {
  const parsed = new Date(String(value || ''));
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }
  return parsed.toLocaleString();
}

function previewJson(value, expanded) {
  const raw = typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2);
  if (expanded) {
    return raw;
  }
  return raw.length > 1400 ? `${raw.slice(0, 1400)}...` : raw;
}

export function FlowTemplatesPage() {
  const { user } = useCurrentUser();
  const canWrite = String(user?.role || '').toLowerCase() !== 'readonly';
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [variables, setVariables] = useState({});
  const [responseTab, setResponseTab] = useState('output');
  const [expandedInput, setExpandedInput] = useState(false);
  const [expandedOutput, setExpandedOutput] = useState(false);
  const [lastRun, setLastRun] = useState(null);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const payloadPreview = useMemo(
    () => ({
      scriptName: draft.script_name,
      variables,
    }),
    [draft.script_name, variables]
  );

  async function loadTemplates() {
    setLoading(true);
    setError('');
    try {
      const payload = await getFlowTemplates();
      const items = Array.isArray(payload?.items) ? payload.items.map(normalizeTemplate) : [];
      setTemplates(items);
      if (items.length) {
        const selected = items.find((item) => item.id === selectedTemplateId) || items[0];
        setSelectedTemplateId(selected.id);
        setDraft(selected);
        setVariables(buildDefaultVariables(selected.input_schema));
      } else {
        setSelectedTemplateId(null);
        setDraft(EMPTY_TEMPLATE);
        setVariables({});
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not load templates.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectTemplate(item) {
    const normalized = normalizeTemplate(item);
    setSelectedTemplateId(normalized.id);
    setDraft(normalized);
    setVariables(buildDefaultVariables(normalized.input_schema));
    setLastRun(null);
    setMessage('');
    setError('');
  }

  function handleNewTemplate() {
    setSelectedTemplateId(null);
    setDraft(EMPTY_TEMPLATE);
    setVariables({});
    setLastRun(null);
    setMessage('');
    setError('');
  }

  function updateDraftField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addVariableField() {
    setDraft((current) => ({
      ...current,
      input_schema: [...(current.input_schema || []), { name: '', type: 'string', required: false }],
    }));
  }

  function updateVariableField(index, key, value) {
    setDraft((current) => {
      const next = [...(current.input_schema || [])];
      next[index] = { ...next[index], [key]: value };
      return { ...current, input_schema: next };
    });
  }

  function removeVariableField(index) {
    setDraft((current) => ({
      ...current,
      input_schema: (current.input_schema || []).filter((_, fieldIndex) => fieldIndex !== index),
    }));
  }

  function updateRunnerVariable(field, value) {
    const name = String(field?.name || '').trim();
    if (!name) {
      return;
    }
    setVariables((current) => ({
      ...current,
      [name]: coerceValue(field?.type, value),
    }));
  }

  async function handleSaveTemplate() {
    if (!canWrite) {
      return;
    }
    if (!draft.script_name) {
      setError('scriptName is required.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      script_name: draft.script_name,
      display_name: draft.display_name || draft.script_name,
      description: draft.description || '',
      category: 'General',
      input_schema: (draft.input_schema || []).filter((field) => String(field?.name || '').trim()),
    };

    try {
      const response = draft.id
        ? await updateFlowTemplate(draft.id, payload)
        : await createFlowTemplate(payload);
      const next = normalizeTemplate(response?.item || payload);
      setDraft(next);
      setSelectedTemplateId(next.id);
      setTemplates((current) => {
        if (draft.id) {
          return current.map((item) => (item.id === next.id ? next : item));
        }
        return [next, ...current];
      });
      setVariables(buildDefaultVariables(next.input_schema));
      setMessage(draft.id ? 'Template updated.' : 'Template created.');
    } catch (requestError) {
      setError(requestError.message || 'Could not save template.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!canWrite || !draft.id) {
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await deleteFlowTemplate(draft.id);
      const nextTemplates = templates.filter((item) => item.id !== draft.id);
      setTemplates(nextTemplates);
      if (nextTemplates.length) {
        const next = nextTemplates[0];
        setSelectedTemplateId(next.id);
        setDraft(next);
        setVariables(buildDefaultVariables(next.input_schema));
      } else {
        setSelectedTemplateId(null);
        setDraft(EMPTY_TEMPLATE);
        setVariables({});
      }
      setLastRun(null);
      setMessage('Template deleted.');
    } catch (requestError) {
      setError(requestError.message || 'Could not delete template.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRunTemplate() {
    if (!canWrite || !draft.id) {
      return;
    }
    setRunning(true);
    setError('');
    setMessage('');
    try {
      const payload = await runFlowTemplate(draft.id, variables);
      setLastRun(payload?.item || null);
      setResponseTab('output');
    } catch (requestError) {
      setError(requestError.message || 'Flow test run failed.');
      setLastRun(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="module">
      <SectionHeader
        tag="/app/flows/templates"
        title="Flow Template Builder"
        description="Build reusable flow templates, generate payloads, and run controlled tests."
      />

      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {message ? <p className="status-text">{message}</p> : null}

      <div className="work-layout">
        <Card>
          <CardHeader
            eyebrow="Templates"
            title="Template List"
            action={(
              <div className="table-actions">
                <button className="compact-toggle" type="button" onClick={() => void loadTemplates()} disabled={loading}>
                  <RefreshCcw size={14} />
                  Refresh
                </button>
                {canWrite ? (
                  <button className="compact-toggle" type="button" onClick={handleNewTemplate}>
                    <Plus size={14} />
                    New
                  </button>
                ) : null}
              </div>
            )}
          />
          {loading ? <p className="status-text">Loading templates...</p> : null}
          {!loading && !templates.length ? (
            <EmptyState title="No templates" description="Create a template to start standardized flow execution." />
          ) : null}
          {!loading && templates.length ? (
            <div className="stack-list">
              {templates.map((item) => (
                <button
                  key={`flow-template-${item.id}`}
                  type="button"
                  className={item.id === selectedTemplateId ? 'stack-row stack-row--interactive association-list__item--selected' : 'stack-row stack-row--interactive'}
                  onClick={() => handleSelectTemplate(item)}
                >
                  <span className="stack-row__label">
                    <span>
                      <strong>{item.display_name || item.script_name}</strong>
                      <small>{item.script_name}</small>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            eyebrow="Editor"
            title={draft.id ? 'Edit Template' : 'Create Template'}
            action={(
              <div className="table-actions">
                {draft.id && canWrite ? (
                  <button className="compact-toggle" type="button" onClick={() => void handleDeleteTemplate()} disabled={saving}>
                    <Trash2 size={14} />
                    Delete
                  </button>
                ) : null}
                {canWrite ? (
                  <button className="ui-button ui-button--primary" type="button" onClick={() => void handleSaveTemplate()} disabled={saving}>
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                ) : null}
              </div>
            )}
          />

          <div className="analysis-grid">
            <label className="settings-field">
              <span>scriptName</span>
              <input
                className="settings-input"
                value={draft.script_name}
                onChange={(event) => updateDraftField('script_name', event.target.value)}
                placeholder="flow_script_name"
                disabled={!canWrite}
              />
            </label>
            <label className="settings-field">
              <span>description</span>
              <input
                className="settings-input"
                value={draft.description}
                onChange={(event) => updateDraftField('description', event.target.value)}
                placeholder="Optional template context"
                disabled={!canWrite}
              />
            </label>
          </div>

          <div className="dataset-panel__section-header">
            <h4>Variables</h4>
            {canWrite ? (
              <button className="compact-toggle" type="button" onClick={addVariableField}>
                Add Variable
              </button>
            ) : null}
          </div>

          {(draft.input_schema || []).length ? (
            <div className="stack-list">
              {(draft.input_schema || []).map((field, index) => (
                <div className="stack-row flow-builder-schema-row" key={`flow-var-${index}`}>
                  <span className="stack-row__label">
                    <span>
                      <input
                        className="settings-input"
                        value={field.name || ''}
                        onChange={(event) => updateVariableField(index, 'name', event.target.value)}
                        placeholder="name"
                        disabled={!canWrite}
                      />
                    </span>
                  </span>
                  <div className="stack-row__actions flow-builder-schema-row__actions">
                    <select
                      className="ticket-queue__filter"
                      value={field.type || 'string'}
                      onChange={(event) => updateVariableField(index, 'type', event.target.value)}
                      disabled={!canWrite}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                    </select>
                    <label className="settings-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(event) => updateVariableField(index, 'required', event.target.checked)}
                        disabled={!canWrite}
                      />
                      Required
                    </label>
                    {canWrite ? (
                      <button className="compact-toggle" type="button" onClick={() => removeVariableField(index)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="status-text">No variables defined.</p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader eyebrow="Payload" title="Generated JSON Payload" />
        <pre className="code-block">{JSON.stringify(payloadPreview, null, 2)}</pre>
      </Card>

      <Card>
        <CardHeader
          eyebrow="Test Runner"
          title="Run Template"
          action={(
            <button
              type="button"
              className="ui-button ui-button--primary"
              onClick={() => void handleRunTemplate()}
              disabled={!canWrite || !draft.id || running}
            >
              <Play size={14} />
              {running ? 'Running...' : 'Run Test'}
            </button>
          )}
        />

        {(draft.input_schema || []).length ? (
          <div className="analysis-grid">
            {(draft.input_schema || []).map((field) => {
              const name = String(field?.name || '').trim();
              if (!name) {
                return null;
              }
              const type = String(field?.type || 'string').toLowerCase();
              if (type === 'boolean') {
                return (
                  <label key={`runner-${name}`} className="settings-field">
                    <span>{name}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(variables[name])}
                      onChange={(event) => updateRunnerVariable(field, event.target.checked)}
                      disabled={!canWrite}
                    />
                  </label>
                );
              }
              return (
                <label key={`runner-${name}`} className="settings-field">
                  <span>{name}</span>
                  <input
                    className="settings-input"
                    type={type === 'number' ? 'number' : 'text'}
                    value={variables[name] ?? ''}
                    onChange={(event) => updateRunnerVariable(field, event.target.value)}
                    disabled={!canWrite}
                  />
                </label>
              );
            })}
          </div>
        ) : (
          <p className="status-text">This template has no variables. Run test will send an empty variables object.</p>
        )}
      </Card>

      <Card>
        <CardHeader eyebrow="Response Viewer" title="Execution Detail" />
        {!lastRun ? (
          <EmptyState title="No run yet" description="Run a template test to inspect input, output, and metadata." />
        ) : (
          <>
            <div className="flow-detail-tabs" role="tablist" aria-label="Run detail tabs">
              <button
                type="button"
                className={responseTab === 'input' ? 'compact-toggle compact-toggle--active' : 'compact-toggle'}
                onClick={() => setResponseTab('input')}
              >
                Input
              </button>
              <button
                type="button"
                className={responseTab === 'output' ? 'compact-toggle compact-toggle--active' : 'compact-toggle'}
                onClick={() => setResponseTab('output')}
              >
                Output
              </button>
              <button
                type="button"
                className={responseTab === 'meta' ? 'compact-toggle compact-toggle--active' : 'compact-toggle'}
                onClick={() => setResponseTab('meta')}
              >
                Meta
              </button>
            </div>

            {responseTab === 'input' ? (
              <div className="flow-detail-panel">
                <div className="table-actions">
                  <button type="button" className="compact-toggle" onClick={() => setExpandedInput((current) => !current)}>
                    {expandedInput ? 'Collapse JSON' : 'Expand JSON'}
                  </button>
                </div>
                <pre className="code-block">{previewJson(payloadPreview, expandedInput)}</pre>
              </div>
            ) : null}

            {responseTab === 'output' ? (
              <div className="flow-detail-panel">
                <div className="table-actions">
                  <button type="button" className="compact-toggle" onClick={() => setExpandedOutput((current) => !current)}>
                    {expandedOutput ? 'Collapse JSON' : 'Expand JSON'}
                  </button>
                </div>
                <pre className="code-block">{previewJson(lastRun?.response || lastRun, expandedOutput)}</pre>
              </div>
            ) : null}

            {responseTab === 'meta' ? (
              <div className="flow-detail-panel">
                <div className="dataset-metrics-grid">
                  <div className="metric-tile"><span>Status</span><strong>{String(lastRun?.status_code || 'n/a')}</strong></div>
                  <div className="metric-tile"><span>Flow</span><strong>{String(lastRun?.flow_name || draft.display_name || draft.script_name || 'n/a')}</strong></div>
                  <div className="metric-tile"><span>Script</span><strong>{String(lastRun?.script_name || draft.script_name || 'n/a')}</strong></div>
                  <div className="metric-tile"><span>Timestamp</span><strong>{formatTimestamp(new Date().toISOString())}</strong></div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </section>
  );
}

export default FlowTemplatesPage;
