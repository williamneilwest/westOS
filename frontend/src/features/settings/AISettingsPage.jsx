import { ExternalLink, Save, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createAgent, getAgents, getAISettings, updateAgent, updateAISettings } from '../../app/services/api';
import { getFeatureAgentId, sendChat, setFeatureAgentId } from '../../app/services/aiClient';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { SectionHeader } from '../../app/ui/SectionHeader';
import { AIInteractionsViewer } from '../ai/components/AIInteractionsViewer';

const EMPTY_FORM = {
  models: {
    preview: '',
    focused: '',
    deep: '',
    document_processing: '',
  },
  pipeline: {
    preview_max_rows: 10,
    focused_max_rows: 5,
    enable_chunking: true,
  },
};

const EMPTY_EDITOR = {
  id: '',
  name: '',
  description: '',
  prompt_template: '',
  enabled: true,
};

function buildFormFromSettings(result) {
  return {
    models: {
      preview: result?.models?.preview || '',
      focused: result?.models?.focused || '',
      deep: result?.models?.deep || '',
      document_processing: result?.models?.document_processing || '',
    },
    pipeline: {
      preview_max_rows: Number(result?.pipeline?.preview_max_rows || 10),
      focused_max_rows: Number(result?.pipeline?.focused_max_rows || 5),
      enable_chunking: Boolean(result?.pipeline?.enable_chunking),
    },
  };
}

function NumericInput({ id, label, value, onChange, changed = false }) {
  return (
    <label className={`column-filter__label ai-field${changed ? ' ai-field--changed' : ''}`} htmlFor={id}>
      <span>{label}</span>
      <input
        className="ticket-queue__filter"
        id={id}
        min="1"
        onChange={(event) => onChange(Number(event.target.value || 1))}
        type="number"
        value={value}
      />
    </label>
  );
}

function ModelSelect({ id, label, value, options, onChange, changed = false }) {
  return (
    <label className={`column-filter__label ai-field${changed ? ' ai-field--changed' : ''}`} htmlFor={id}>
      <span>{label}</span>
      <select className="ticket-queue__filter" id={id} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">Select model</option>
        {options.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>
    </label>
  );
}

function AgentEditorModal({
  open,
  form,
  onClose,
  onChange,
  onSave,
  isSaving,
  testInput,
  onTestInputChange,
  onRunTest,
  testOutput,
  testError,
  isTesting,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="auth-modal" role="presentation" onClick={onClose}>
      <div className="auth-modal__surface ai-agent-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Edit AI Agent">
        <Card className="auth-modal__card ai-agent-modal__card">
          <div className="auth-modal__close-row">
            <strong>Edit Agent Prompt</strong>
            <button className="compact-toggle" onClick={onClose} type="button" aria-label="Close">
              <X size={14} />
            </button>
          </div>

          <div className="ai-settings-grid">
            <label className="column-filter__label ai-field" htmlFor="agent-name">
              <span>Name</span>
              <input
                className="ticket-queue__filter"
                id="agent-name"
                value={form.name}
                onChange={(event) => onChange('name', event.target.value)}
              />
            </label>

            <label className="column-filter__label ai-field" htmlFor="agent-enabled">
              <span>Enabled</span>
              <select
                className="ticket-queue__filter"
                id="agent-enabled"
                value={form.enabled ? 'true' : 'false'}
                onChange={(event) => onChange('enabled', event.target.value === 'true')}
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </label>
          </div>

          <label className="column-filter__label ai-field" htmlFor="agent-description">
            <span>Description</span>
            <input
              className="ticket-queue__filter"
              id="agent-description"
              value={form.description}
              onChange={(event) => onChange('description', event.target.value)}
            />
          </label>

          <label className="column-filter__label ai-field" htmlFor="agent-prompt-template">
            <span>Prompt Template</span>
            <textarea
              className="ticket-queue__filter ai-agent-modal__textarea"
              id="agent-prompt-template"
              value={form.prompt_template}
              onChange={(event) => onChange('prompt_template', event.target.value)}
            />
          </label>

          <label className="column-filter__label ai-field" htmlFor="agent-test-input">
            <span>Test Input</span>
            <textarea
              className="ticket-queue__filter ai-agent-modal__test-input"
              id="agent-test-input"
              value={testInput}
              onChange={(event) => onTestInputChange(event.target.value)}
              placeholder="Paste sample ticket context or ask a question..."
            />
          </label>

          <div className="ai-agent-modal__actions">
            <button className="ui-button ui-button--secondary" type="button" onClick={onRunTest} disabled={isTesting}>
              {isTesting ? 'Running...' : 'Run Test'}
            </button>
            <button className="ui-button ui-button--primary" type="button" onClick={onSave} disabled={isSaving}>
              <Save size={15} />
              {isSaving ? 'Saving...' : 'Save Agent'}
            </button>
          </div>

          <div className="ai-agent-modal__output">
            <strong>Output Preview</strong>
            {testError ? <p className="status-text status-text--error">{testError}</p> : null}
            <pre className="code-block">{testOutput || 'Run a test to preview output.'}</pre>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function AISettingsPage() {
  const [settings, setSettings] = useState(null);
  const [agents, setAgents] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [ticketAnalysisAgent, setTicketAnalysisAgentState] = useState(() =>
    getFeatureAgentId('ticket_analysis', 'ticket_analyzer')
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorForm, setEditorForm] = useState(EMPTY_EDITOR);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorTestInput, setEditorTestInput] = useState('Review this ticket quickly and suggest practical next steps.');
  const [editorTestOutput, setEditorTestOutput] = useState('');
  const [editorTestError, setEditorTestError] = useState('');
  const [editorTesting, setEditorTesting] = useState(false);

  async function loadAgents() {
    try {
      const result = await getAgents();
      const items = Array.isArray(result?.items) ? result.items : [];
      setAgents(items);
      if (items.length && !items.some((agent) => agent?.id === ticketAnalysisAgent)) {
        const fallback = String(items[0]?.id || '').trim();
        if (fallback) {
          setTicketAnalysisAgentState(fallback);
          setFeatureAgentId('ticket_analysis', fallback);
        }
      }
    } catch {
      setAgents([]);
    }
  }

  useEffect(() => {
    let isMounted = true;

    getAISettings()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setSettings(result);
        setForm(buildFormFromSettings(result));
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.message || 'AI settings could not be loaded.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void loadAgents();
  }, []);

  function updateModel(key, value) {
    setForm((current) => ({
      ...current,
      models: {
        ...current.models,
        [key]: value,
      },
    }));
  }

  function updatePipeline(key, value) {
    setForm((current) => ({
      ...current,
      pipeline: {
        ...current.pipeline,
        [key]: value,
      },
    }));
  }

  function handleTicketAnalysisAgentChange(value) {
    const nextValue = String(value || '').trim();
    setTicketAnalysisAgentState(nextValue);
    setFeatureAgentId('ticket_analysis', nextValue);
  }

  function openEditor(agent) {
    setEditorForm({
      id: String(agent?.id || '').trim(),
      name: String(agent?.name || '').trim(),
      description: String(agent?.description || '').trim(),
      prompt_template: String(agent?.prompt_template || '').trim(),
      enabled: Boolean(agent?.enabled),
    });
    setEditorTestOutput('');
    setEditorTestError('');
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditorSaving(false);
    setEditorTesting(false);
  }

  function updateEditorField(key, value) {
    setEditorForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSaveAgent() {
    if (!editorForm.id) {
      return;
    }

    setEditorSaving(true);
    setEditorTestError('');
    try {
      await updateAgent(editorForm.id, {
        name: editorForm.name,
        description: editorForm.description,
        prompt_template: editorForm.prompt_template,
        enabled: editorForm.enabled,
      });
      await loadAgents();
      closeEditor();
    } catch (requestError) {
      setEditorTestError(requestError.message || 'Agent update failed.');
      setEditorSaving(false);
    }
  }

  async function handleAgentQuickToggle(agent) {
    try {
      await updateAgent(agent.id, { enabled: !agent.enabled });
      await loadAgents();
    } catch (requestError) {
      setError(requestError.message || 'Agent toggle failed.');
    }
  }

  async function handleAgentQuickTest(agent) {
    try {
      const result = await sendChat({
        message: 'Give me a quick practical ticket review.',
        agentId: agent.id,
        context: {
          source: 'settings_agent_quick_test',
          ticket: {
            id: 'INC12345',
            status: 'In Progress',
            summary: 'Printer queue stuck for multiple users',
            notes: 'Restarted spooler once, issue came back after 20 minutes.',
          },
        },
      });

      setSuccessMessage(result?.message || 'Agent test completed.');
    } catch (requestError) {
      setError(requestError.message || 'Agent test failed.');
    }
  }

  async function handleRunEditorTest() {
    if (!editorForm.id) {
      return;
    }

    setEditorTesting(true);
    setEditorTestError('');
    setEditorTestOutput('');

    try {
      const result = await sendChat({
        message: editorTestInput || 'Summarize this ticket in practical language.',
        agentId: editorForm.id,
        context: {
          source: 'settings_agent_editor_test',
          ticket: {
            id: 'INC12345',
            status: 'In Progress',
            summary: 'Printer queue stuck for multiple users',
            notes: 'Restarted spooler once, issue came back after 20 minutes.',
          },
        },
      });
      setEditorTestOutput(result?.message || result?.summary || 'No output returned.');
    } catch (requestError) {
      setEditorTestError(requestError.message || 'Agent test failed.');
    } finally {
      setEditorTesting(false);
    }
  }

  const baseForm = useMemo(() => (settings ? buildFormFromSettings(settings) : EMPTY_FORM), [settings]);
  const hasChanges = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseForm), [baseForm, form]);
  const saveStateLabel = hasChanges ? 'Unsaved changes' : 'Saved';

  const agentNameMap = useMemo(() => {
    const map = {};
    agents.forEach((agent) => {
      const id = String(agent?.id || '').trim();
      if (!id) {
        return;
      }
      map[id] = String(agent?.name || id).trim();
    });
    return map;
  }, [agents]);

  async function handleSave() {
    if (!form.models.preview || !form.models.focused || !form.models.deep || !form.models.document_processing) {
      setError('All model selections are required.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      const result = await updateAISettings(form);
      setSettings(result);
      setForm(buildFormFromSettings(result));
      setSuccessMessage('AI settings saved.');
    } catch (requestError) {
      setError(requestError.message || 'AI settings could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEnsureDefaultAgent() {
    if (agents.some((agent) => agent.id === 'ticket_analyzer')) {
      return;
    }

    try {
      await createAgent({
        id: 'ticket_analyzer',
        name: 'Ticket Analyzer',
        description: 'Casual IT peer ticket analysis',
        enabled: true,
        prompt_template:
          'You are an IT support peer reviewing a ticket.\\n\\nSpeak casually like a real coworker. Not corporate. Not formal.\\n\\nTicket Data:\\n{{context}}\\n\\nUser Input:\\n{{input}}\\n\\nRespond naturally.',
      });
      await loadAgents();
      setSuccessMessage('Default ticket analyzer was restored.');
    } catch (requestError) {
      setError(requestError.message || 'Could not restore default agent.');
    }
  }

  if (!settings) {
    return (
      <section className="module">
        <SectionHeader tag="/app/ai" title="AI" description="Model routing and pipeline controls." />
        <EmptyState
          icon={<SlidersHorizontal size={20} />}
          title="Loading AI settings"
          description={error || 'Fetching saved AI configuration.'}
        />
      </section>
    );
  }

  return (
    <section className="module ai-settings-page">
      <SectionHeader
        tag="/app/ai"
        title="AI"
        description="Configure pipeline, agents, and monitoring in one place."
        actions={(
          <a className="compact-toggle" href="https://webui.westos.app" rel="noreferrer" target="_blank">
            <ExternalLink size={14} />
            Open WebUI
          </a>
        )}
      />

      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {successMessage ? <p className="status-text">{successMessage}</p> : null}

      <div className="ai-pipeline ai-settings-shell">
        <div className="ai-pipeline__layout ai-settings-layout">
          <div className="ai-pipeline__main ai-settings-column">
            <Card className="landing__card ai-config-card">
              <CardHeader
                eyebrow="Pipeline"
                title="Pipeline Configuration"
                description={`Provider: ${settings.provider || 'unknown'}`}
              />

              <div className="ai-config-section">
                <h4>Stage Models</h4>
                <div className="ai-settings-grid">
                  <ModelSelect
                    changed={form.models.preview !== baseForm.models.preview}
                    id="preview-model"
                    label="Preview Model"
                    onChange={(value) => updateModel('preview', value)}
                    options={settings.availableModels || []}
                    value={form.models.preview}
                  />
                  <ModelSelect
                    changed={form.models.focused !== baseForm.models.focused}
                    id="focused-model"
                    label="Focused Model"
                    onChange={(value) => updateModel('focused', value)}
                    options={settings.availableModels || []}
                    value={form.models.focused}
                  />
                  <ModelSelect
                    changed={form.models.deep !== baseForm.models.deep}
                    id="deep-model"
                    label="Deep Model"
                    onChange={(value) => updateModel('deep', value)}
                    options={settings.availableModels || []}
                    value={form.models.deep}
                  />
                  <ModelSelect
                    changed={form.models.document_processing !== baseForm.models.document_processing}
                    id="document-processing-model"
                    label="Document Processing Model"
                    onChange={(value) => updateModel('document_processing', value)}
                    options={settings.availableModels || []}
                    value={form.models.document_processing}
                  />
                </div>
              </div>

              <div className="ai-config-section">
                <h4>Processing Rules</h4>
                <div className="ai-settings-grid">
                  <NumericInput
                    changed={form.pipeline.preview_max_rows !== baseForm.pipeline.preview_max_rows}
                    id="preview-max-rows"
                    label="Preview max rows"
                    onChange={(value) => updatePipeline('preview_max_rows', value)}
                    value={form.pipeline.preview_max_rows}
                  />
                  <NumericInput
                    changed={form.pipeline.focused_max_rows !== baseForm.pipeline.focused_max_rows}
                    id="focused-max-rows"
                    label="Focused max rows"
                    onChange={(value) => updatePipeline('focused_max_rows', value)}
                    value={form.pipeline.focused_max_rows}
                  />
                  <label
                    className={`column-filter__label ai-settings__toggle${form.pipeline.enable_chunking !== baseForm.pipeline.enable_chunking ? ' ai-field--changed' : ''}`}
                    htmlFor="enable-chunking"
                  >
                    <span>Enable chunking</span>
                    <input
                      checked={form.pipeline.enable_chunking}
                      id="enable-chunking"
                      onChange={(event) => updatePipeline('enable_chunking', event.target.checked)}
                      type="checkbox"
                    />
                  </label>
                </div>
              </div>
            </Card>

            <AIInteractionsViewer agentLookup={agentNameMap} />
          </div>

          <aside className="ai-settings-column ai-settings-column--side">
            <Card className="landing__card ai-config-card">
              <CardHeader
                eyebrow="Agents"
                title="Agent System"
                description="Manage prompts and behavior for feature-level AI agents."
              />

              {!agents.length ? (
                <EmptyState
                  icon={<SlidersHorizontal size={16} />}
                  title="No agents loaded"
                  description="Restore the default ticket analyzer to continue."
                  actions={(
                    <button className="compact-toggle" type="button" onClick={() => void handleEnsureDefaultAgent()}>
                      Restore Default Agent
                    </button>
                  )}
                />
              ) : (
                <div className="ai-agent-grid">
                  {agents.map((agent) => (
                    <article className="ai-agent-card" key={agent.id}>
                      <div className="ai-agent-card__header">
                        <strong>{agent.name || agent.id}</strong>
                        <span className={`ai-state-pill${agent.enabled ? '' : ' ai-state-pill--warning'}`}>
                          {agent.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p>{agent.description || 'No description configured.'}</p>
                      <div className="ai-agent-card__actions">
                        <button className="compact-toggle" type="button" onClick={() => openEditor(agent)}>
                          Edit Prompt
                        </button>
                        <button className="compact-toggle" type="button" onClick={() => void handleAgentQuickTest(agent)}>
                          Test
                        </button>
                        <button className="compact-toggle" type="button" onClick={() => void handleAgentQuickToggle(agent)}>
                          {agent.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="ai-config-section ai-feature-mapping">
                <h4>Feature Mapping</h4>
                <div className="ai-feature-mapping__row">
                  <span>Ticket Analysis</span>
                  <select
                    className="ticket-queue__filter"
                    onChange={(event) => handleTicketAnalysisAgentChange(event.target.value)}
                    value={ticketAnalysisAgent}
                  >
                    {agents.length ? null : <option value="ticket_analyzer">Ticket Analyzer</option>}
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name || agent.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            <Card className="landing__card ai-apply-card">
              <CardHeader eyebrow="System Controls" title="System Controls" description={settings.note || 'Settings apply immediately.'} />
              <div className="ai-apply-state">
                <span className={`ai-state-pill${hasChanges ? ' ai-state-pill--warning' : ''}`}>{saveStateLabel}</span>
              </div>
              <div className="ai-actions-row ai-actions-row--stacked">
                <button
                  className="ui-button ui-button--primary"
                  disabled={isSaving || !hasChanges}
                  onClick={handleSave}
                  type="button"
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  className="ui-button ui-button--secondary"
                  disabled={isSaving || !hasChanges}
                  onClick={() => setForm(baseForm)}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <AgentEditorModal
        open={editorOpen}
        form={editorForm}
        onClose={closeEditor}
        onChange={updateEditorField}
        onSave={() => void handleSaveAgent()}
        isSaving={editorSaving}
        testInput={editorTestInput}
        onTestInputChange={setEditorTestInput}
        onRunTest={() => void handleRunEditorTest()}
        testOutput={editorTestOutput}
        testError={editorTestError}
        isTesting={editorTesting}
      />
    </section>
  );
}
