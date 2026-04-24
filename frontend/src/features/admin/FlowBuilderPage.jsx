import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Save } from 'lucide-react';
import {
  createAdminFlowTemplate,
  getAdminFlowTemplates,
  updateAdminFlowTemplate,
} from '../../app/services/api';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { FlowRunner } from './components/FlowRunner';

const EMPTY_TEMPLATE = {
  id: null,
  script_name: '',
  display_name: '',
  category: 'General',
  description: '',
  endpoint: '',
  input_schema: [],
};

function normalizeTemplate(template) {
  const item = template && typeof template === 'object' ? template : {};
  return {
    id: item.id ?? null,
    script_name: String(item.script_name || '').trim(),
    display_name: String(item.display_name || '').trim(),
    category: String(item.category || 'General').trim() || 'General',
    description: String(item.description || '').trim(),
    endpoint: String(item.endpoint || '').trim(),
    input_schema: Array.isArray(item.input_schema)
      ? item.input_schema.map((field) => ({
          name: String(field?.name || '').trim(),
          type: String(field?.type || 'string').trim().toLowerCase(),
          required: Boolean(field?.required),
        }))
      : [],
  };
}

export function FlowBuilderPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  async function loadTemplates() {
    setLoading(true);
    setError('');
    try {
      const payload = await getAdminFlowTemplates();
      const items = Array.isArray(payload?.items) ? payload.items.map(normalizeTemplate) : [];
      setTemplates(items);

      if (items.length && !selectedTemplateId) {
        setSelectedTemplateId(items[0].id);
        setDraft(items[0]);
      }
      if (!items.length) {
        setSelectedTemplateId(null);
        setDraft(EMPTY_TEMPLATE);
      }
    } catch (requestError) {
      setTemplates([]);
      setError(requestError.message || 'Could not load flow templates.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectTemplate(template) {
    const next = normalizeTemplate(template);
    setSelectedTemplateId(next.id);
    setDraft(next);
    setSuccessMessage('');
    setError('');
  }

  function handleNewTemplate() {
    setSelectedTemplateId(null);
    setDraft(EMPTY_TEMPLATE);
    setSuccessMessage('');
    setError('');
  }

  function updateDraftField(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateSchemaField(index, key, value) {
    setDraft((current) => {
      const nextSchema = [...(current.input_schema || [])];
      nextSchema[index] = { ...nextSchema[index], [key]: value };
      return { ...current, input_schema: nextSchema };
    });
  }

  function addSchemaField() {
    setDraft((current) => ({
      ...current,
      input_schema: [...(current.input_schema || []), { name: '', type: 'string', required: false }],
    }));
  }

  function removeSchemaField(index) {
    setDraft((current) => ({
      ...current,
      input_schema: (current.input_schema || []).filter((_, fieldIndex) => fieldIndex !== index),
    }));
  }

  async function handleSave() {
    if (!draft.script_name || !draft.display_name) {
      setError('script_name and display_name are required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    const payload = {
      script_name: draft.script_name,
      display_name: draft.display_name,
      category: draft.category,
      description: draft.description,
      endpoint: draft.endpoint,
      input_schema: (draft.input_schema || []).filter((field) => String(field?.name || '').trim()),
    };

    try {
      const response = draft.id
        ? await updateAdminFlowTemplate(draft.id, payload)
        : await createAdminFlowTemplate(payload);
      const item = normalizeTemplate(response?.item || payload);

      if (draft.id) {
        setTemplates((current) => current.map((template) => (template.id === draft.id ? item : template)));
      } else {
        setTemplates((current) => [item, ...current]);
      }

      setSelectedTemplateId(item.id);
      setDraft(item);
      setSuccessMessage(draft.id ? 'Template updated.' : 'Template created.');
    } catch (requestError) {
      setError(requestError.message || 'Template could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module">
      <Card>
        <CardHeader
          eyebrow="/app/admin/flow-builder"
          title="Flow Template Builder"
          description="Define reusable HTTP flow templates, generate test inputs, and run controlled tests."
          action={(
            <button className="compact-toggle" type="button" onClick={() => void loadTemplates()} disabled={loading}>
              <RefreshCcw size={14} />
              Refresh
            </button>
          )}
        />
        {error ? <p className="status-text status-text--error">{error}</p> : null}
        {successMessage ? <p className="status-text">{successMessage}</p> : null}
      </Card>

      <div className="work-layout">
        <Card>
          <CardHeader
            eyebrow="Templates"
            title="Saved Templates"
            action={(
              <button className="compact-toggle" type="button" onClick={handleNewTemplate}>
                <Plus size={14} />
                New
              </button>
            )}
          />

          {loading ? <p className="status-text">Loading templates...</p> : null}
          {!loading && !templates.length ? (
            <EmptyState title="No templates yet" description="Create your first flow template to start standardized flow testing." />
          ) : null}
          {!loading && templates.length ? (
            <div className="stack-list">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={selectedTemplateId === template.id ? 'stack-row stack-row--interactive association-list__item--selected' : 'stack-row stack-row--interactive'}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <span className="stack-row__label">
                    <span>
                      <strong>{template.display_name}</strong>
                      <small>{template.script_name}</small>
                      <small>{template.category}</small>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card>
          <CardHeader
            eyebrow="Builder"
            title={draft.id ? 'Edit Template' : 'Create Template'}
            action={(
              <button className="ui-button ui-button--primary" type="button" onClick={() => void handleSave()} disabled={saving}>
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            )}
          />

          <div className="analysis-grid">
            <label className="settings-field">
              <span>script_name</span>
              <input className="settings-input" value={draft.script_name} onChange={(event) => updateDraftField('script_name', event.target.value)} />
            </label>
            <label className="settings-field">
              <span>display_name</span>
              <input className="settings-input" value={draft.display_name} onChange={(event) => updateDraftField('display_name', event.target.value)} />
            </label>
            <label className="settings-field">
              <span>category</span>
              <input className="settings-input" value={draft.category} onChange={(event) => updateDraftField('category', event.target.value)} />
            </label>
            <label className="settings-field">
              <span>endpoint</span>
              <input className="settings-input" value={draft.endpoint} onChange={(event) => updateDraftField('endpoint', event.target.value)} placeholder="Optional override" />
            </label>
          </div>

          <label className="settings-field">
            <span>description</span>
            <textarea className="association-script association-script--fit" value={draft.description} onChange={(event) => updateDraftField('description', event.target.value)} />
          </label>

          <div className="dataset-panel__section-header">
            <h4>Input Schema</h4>
            <button className="compact-toggle" type="button" onClick={addSchemaField}>Add Field</button>
          </div>

          {(draft.input_schema || []).length ? (
            <div className="stack-list">
              {(draft.input_schema || []).map((field, index) => (
                <div className="stack-row flow-builder-schema-row" key={`schema-field-${index}`}>
                  <span className="stack-row__label">
                    <span>
                      <input
                        className="settings-input"
                        value={field.name || ''}
                        onChange={(event) => updateSchemaField(index, 'name', event.target.value)}
                        placeholder="name"
                      />
                    </span>
                  </span>
                  <div className="stack-row__actions flow-builder-schema-row__actions">
                    <select
                      className="ticket-queue__filter"
                      value={field.type || 'string'}
                      onChange={(event) => updateSchemaField(index, 'type', event.target.value)}
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                    </select>
                    <label className="settings-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(event) => updateSchemaField(index, 'required', event.target.checked)}
                      />
                      Required
                    </label>
                    <button className="compact-toggle" type="button" onClick={() => removeSchemaField(index)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="status-text">No input fields added yet.</p>
          )}
        </Card>
      </div>

      <FlowRunner template={normalizeTemplate(draft.id ? selectedTemplate || draft : draft)} />
    </section>
  );
}

export default FlowBuilderPage;
