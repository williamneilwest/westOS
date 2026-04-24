import { useEffect, useMemo, useState } from 'react';
import { Copy, FileCode2, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { createScript, deleteScript, getScripts, updateScript } from '../../app/services/api';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';
import { Button } from '../../app/ui/Button';
import { EmptyState } from '../../app/ui/EmptyState';
import { SectionHeader } from '../../app/ui/SectionHeader';

const EMPTY_FORM = {
  id: '',
  name: '',
  description: '',
  body: '',
  variables: [],
};

const EMPTY_VARIABLE = {
  key: '',
  label: '',
  placeholder: '',
  default: '',
};

function toText(value) {
  return String(value || '').trim();
}

function normalizeScript(item) {
  return {
    id: toText(item?.id),
    name: toText(item?.name) || 'Untitled script',
    description: toText(item?.description),
    body: String(item?.body || ''),
    variables: Array.isArray(item?.variables) ? item.variables : [],
    updated_at: item?.updated_at || item?.created_at || '',
  };
}

function buildScript(body, variables, values) {
  let output = String(body || '');
  variables.forEach((variable) => {
    const key = toText(variable.key);
    if (!key) {
      return;
    }
    const value = values[key] ?? variable.default ?? '';
    output = output.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value));
  });
  return output;
}

function detectVariables(body) {
  const matches = String(body || '').matchAll(/{{\s*([A-Za-z][A-Za-z0-9_]{0,39})\s*}}/g);
  const seen = new Set();
  const variables = [];
  for (const match of matches) {
    const key = match[1];
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    variables.push({
      key,
      label: key.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      placeholder: '',
      default: '',
    });
  }
  return variables;
}

function formatTimestamp(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString();
}

export function ScriptsPage() {
  const { isAdmin } = useCurrentUser();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [valuesByScript, setValuesByScript] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [copyState, setCopyState] = useState('');

  async function loadScripts(query = search) {
    setLoading(true);
    setError('');
    try {
      const payload = await getScripts({ query });
      const nextItems = Array.isArray(payload?.items) ? payload.items.map(normalizeScript) : [];
      setItems(nextItems);
      setSelectedId((current) => {
        if (current && nextItems.some((item) => item.id === current)) {
          return current;
        }
        return nextItems[0]?.id || '';
      });
    } catch (requestError) {
      setError(requestError.message || 'Failed to load scripts.');
      setItems([]);
      setSelectedId('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadScripts('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadScripts(search);
    }, 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const selectedScript = useMemo(() => {
    if (isCreating) {
      return null;
    }
    return items.find((item) => item.id === selectedId) || items[0] || null;
  }, [isCreating, items, selectedId]);

  const selectedValues = selectedScript ? valuesByScript[selectedScript.id] || {} : {};
  const activeValuesKey = form.id || '__new__';
  const activeValues = valuesByScript[activeValuesKey] || selectedValues || {};
  const previewCode = buildScript(form.body, form.variables, activeValues);

  useEffect(() => {
    if (isCreating) {
      return;
    }
    if (!selectedScript) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      id: selectedScript.id,
      name: selectedScript.name,
      description: selectedScript.description,
      body: selectedScript.body,
      variables: selectedScript.variables.map((variable) => ({ ...EMPTY_VARIABLE, ...variable })),
    });
  }, [isCreating, selectedScript]);

  useEffect(() => {
    if (!selectedScript) {
      return;
    }
    setValuesByScript((current) => {
      if (current[selectedScript.id]) {
        return current;
      }
      const defaults = {};
      selectedScript.variables.forEach((variable) => {
        defaults[toText(variable.key)] = variable.default || '';
      });
      return { ...current, [selectedScript.id]: defaults };
    });
  }, [selectedScript]);

  function setScriptValue(key, value) {
    setValuesByScript((current) => ({
      ...current,
      [activeValuesKey]: {
        ...(current[activeValuesKey] || {}),
        [key]: value,
      },
    }));
  }

  function startNewScript() {
    setIsCreating(true);
    setSelectedId('');
    setForm({
      ...EMPTY_FORM,
      body: '$UserName = "{{userName}}"\n$HardwareName = "{{hardwareName}}"',
      variables: [
        { key: 'userName', label: 'User Name', placeholder: 'jane.doe', default: '' },
        { key: 'hardwareName', label: 'Hardware Name', placeholder: 'AH-PC-12345', default: '' },
      ],
    });
    setMessage('');
    setError('');
    setCopyState('');
    setValuesByScript((current) => ({
      ...current,
      __new__: {
        userName: '',
        hardwareName: '',
      },
    }));
  }

  function updateVariable(index, field, value) {
    setForm((current) => ({
      ...current,
      variables: current.variables.map((variable, variableIndex) => (
        variableIndex === index ? { ...variable, [field]: value } : variable
      )),
    }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    const payload = {
      name: form.name,
      description: form.description,
      body: form.body,
      variables: form.variables.filter((variable) => toText(variable.key)),
    };
    try {
      const result = form.id ? await updateScript(form.id, payload) : await createScript(payload);
      const saved = normalizeScript(result?.item || result);
      setMessage(form.id ? 'Script updated.' : 'Script created.');
      setIsCreating(false);
      await loadScripts(search);
      if (saved.id) {
        setSelectedId(saved.id);
        setValuesByScript((current) => ({
          ...current,
          [saved.id]: current[activeValuesKey] || {},
        }));
      }
    } catch (requestError) {
      setError(requestError.message || 'Failed to save script.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(scriptId) {
    if (!scriptId) {
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await deleteScript(scriptId);
      setMessage('Script removed.');
      await loadScripts(search);
    } catch (requestError) {
      setError(requestError.message || 'Failed to remove script.');
    } finally {
      setSaving(false);
    }
  }

  async function copyBuiltCode() {
    if (!previewCode) {
      return;
    }
    setCopyState('');
    try {
      await navigator.clipboard.writeText(previewCode);
      setCopyState('Copied.');
    } catch {
      setCopyState('Copy unavailable.');
    }
  }

  return (
    <section className="module scripts-page">
      <div className="scripts-layout">
        <aside className="scripts-sidebar">
          <div className="scripts-sidebar__top">
            <SectionHeader
              tag="/app/scripts"
              title="Scripts"
              description="Saved PowerShell templates."
            />
            {isAdmin ? (
              <Button type="button" variant="secondary" onClick={startNewScript}>
                <Plus size={15} />
                New Script
              </Button>
            ) : null}
          </div>

          <label className="settings-field scripts-search-field">
            <span>Search</span>
            <div className="scripts-search">
              <Search size={16} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find scripts"
              />
            </div>
          </label>

          {loading ? <p className="status-text">Loading scripts...</p> : null}

          <div className="scripts-list">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === selectedScript?.id ? 'scripts-list__item scripts-list__item--active' : 'scripts-list__item'}
                onClick={() => {
                  setIsCreating(false);
                  setSelectedId(item.id);
                  setCopyState('');
                }}
              >
                <span className="work-domain-card__icon">
                  <FileCode2 size={15} />
                </span>
                <span>
                  <strong>{item.name}</strong>
                  {item.description ? <small>{item.description}</small> : null}
                  {item.updated_at ? <em>{formatTimestamp(item.updated_at)}</em> : null}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="scripts-workspace">
          {message ? <p className="status-text scripts-feedback">{message}</p> : null}
          {error ? <p className="status-text status-text--error scripts-feedback">{error}</p> : null}

          {!loading && !items.length && !isCreating ? (
            <EmptyState title="No scripts saved" description={isAdmin ? 'Create a script to get started.' : 'No scripts are available yet.'} />
          ) : null}

          {selectedScript || isCreating ? (
            <form className="scripts-form" onSubmit={handleSave}>
              <section className="scripts-section scripts-section--header">
                <div className="scripts-section__heading">
                  <div>
                    <span className="ui-eyebrow">Select / Edit / Test / Save</span>
                    <h3>Script Header</h3>
                  </div>
                  <Button type="button" variant="secondary" onClick={copyBuiltCode} disabled={!previewCode}>
                    <Copy size={15} />
                    Copy Code
                  </Button>
                </div>
                <div className="scripts-header-grid">
                  <label className="settings-field">
                    <span>Script Name</span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Restart Print Spooler"
                      required
                      disabled={!isAdmin}
                    />
                  </label>
                  <label className="settings-field">
                    <span>Description</span>
                    <input
                      type="text"
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Device support command"
                      disabled={!isAdmin}
                    />
                  </label>
                </div>
                {copyState ? <p className="status-text">{copyState}</p> : null}
              </section>

              <section className="scripts-section">
                <div className="scripts-section__heading">
                  <div>
                    <span className="ui-eyebrow">Inputs</span>
                    <h3>Variables</h3>
                  </div>
                  {isAdmin ? (
                    <div className="table-actions">
                      <button
                        type="button"
                        className="compact-toggle"
                        onClick={() => setForm((current) => ({ ...current, variables: detectVariables(current.body) }))}
                      >
                        Detect
                      </button>
                      <button
                        type="button"
                        className="compact-toggle"
                        onClick={() => setForm((current) => ({ ...current, variables: [...current.variables, EMPTY_VARIABLE] }))}
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>
                  ) : null}
                </div>

                {form.variables.length ? (
                  <div className="scripts-variable-grid">
                    {form.variables.map((variable, index) => {
                      const key = toText(variable.key);
                      const valueKey = key || `variable-${index}`;
                      return (
                        <div className="scripts-variable-card" key={`${valueKey}-${index}`}>
                          <label className="settings-field scripts-variable-card__input">
                            <span>{variable.label || key || 'Variable'}</span>
                            <input
                              type="text"
                              value={activeValues[valueKey] ?? variable.default ?? ''}
                              onChange={(event) => setScriptValue(valueKey, event.target.value)}
                              placeholder={variable.placeholder || variable.label || key}
                            />
                          </label>

                          {isAdmin ? (
                            <div className="scripts-variable-definition">
                              <label className="settings-field">
                                <span>Key</span>
                                <input value={variable.key} onChange={(event) => updateVariable(index, 'key', event.target.value)} placeholder="userName" />
                              </label>
                              <label className="settings-field">
                                <span>Label</span>
                                <input value={variable.label} onChange={(event) => updateVariable(index, 'label', event.target.value)} placeholder="User Name" />
                              </label>
                              <label className="settings-field">
                                <span>Placeholder</span>
                                <input value={variable.placeholder} onChange={(event) => updateVariable(index, 'placeholder', event.target.value)} placeholder="jane.doe" />
                              </label>
                              <label className="settings-field">
                                <span>Default</span>
                                <input value={variable.default} onChange={(event) => updateVariable(index, 'default', event.target.value)} placeholder="" />
                              </label>
                              <button
                                type="button"
                                className="compact-toggle scripts-variable-row__remove"
                                onClick={() => setForm((current) => ({
                                  ...current,
                                  variables: current.variables.filter((_, variableIndex) => variableIndex !== index),
                                }))}
                                aria-label="Remove variable"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="status-text">No variables defined for this script.</p>
                )}
              </section>

              <section className="scripts-section">
                <div className="scripts-section__heading">
                  <div>
                    <span className="ui-eyebrow">Edit</span>
                    <h3>PowerShell Script</h3>
                  </div>
                </div>
                <textarea
                  className="scripts-editor"
                  value={form.body}
                  onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                  placeholder="Write-Host &quot;{{userName}} on {{hardwareName}}&quot;"
                  required
                  disabled={!isAdmin}
                />
              </section>

              <section className="scripts-section">
                <div className="scripts-section__heading">
                  <div>
                    <span className="ui-eyebrow">Test</span>
                    <h3>Preview Output</h3>
                  </div>
                </div>
                <pre className="scripts-code-preview">{previewCode}</pre>
              </section>

              {isAdmin ? (
                <div className="scripts-action-bar">
                  <Button type="submit" disabled={saving}>
                    <Save size={15} />
                    {saving ? 'Saving...' : 'Save Script'}
                  </Button>
                  {form.id ? (
                    <Button type="button" variant="secondary" className="scripts-delete-button" disabled={saving} onClick={() => void handleDelete(form.id)}>
                      <Trash2 size={15} />
                      Delete Script
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </form>
          ) : null}
        </main>
      </div>
    </section>
  );
}

export default ScriptsPage;
