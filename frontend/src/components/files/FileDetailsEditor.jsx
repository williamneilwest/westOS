import { useEffect, useMemo, useState } from 'react';

function normalizeTags(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index);
}

export function FileDetailsEditor({
  name = '',
  category = '',
  tags = [],
  categoryOptions = [],
  disabled = false,
  onSave,
}) {
  const [draftName, setDraftName] = useState(name);
  const [draftCategory, setDraftCategory] = useState(category);
  const [draftTags, setDraftTags] = useState(Array.isArray(tags) ? tags.join(', ') : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraftName(name || '');
  }, [name]);

  useEffect(() => {
    setDraftCategory(category || '');
  }, [category]);

  useEffect(() => {
    setDraftTags(Array.isArray(tags) ? tags.join(', ') : '');
  }, [tags]);

  const normalizedTags = useMemo(() => normalizeTags(draftTags), [draftTags]);

  async function handleSave() {
    if (typeof onSave !== 'function') {
      return;
    }

    setError('');
    setSaving(true);

    try {
      await onSave({
        name: draftName,
        category: draftCategory,
        tags: normalizedTags,
      });
    } catch (saveError) {
      setError(saveError?.message || 'Failed to update file details.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="kb-edit-details">
      <label className="kb-edit-details__field">
        <span>Name</span>
        <input
          className="input"
          type="text"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          disabled={disabled || saving}
          placeholder="File name"
        />
      </label>

      <label className="kb-edit-details__field">
        <span>Category</span>
        <select
          className="input"
          value={draftCategory}
          onChange={(event) => setDraftCategory(event.target.value)}
          disabled={disabled || saving}
        >
          {categoryOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>

      <label className="kb-edit-details__field">
        <span>Tags (comma-separated)</span>
        <input
          className="input"
          type="text"
          value={draftTags}
          onChange={(event) => setDraftTags(event.target.value)}
          disabled={disabled || saving}
          placeholder="network, printers, onboarding"
        />
      </label>

      {error ? <small className="status-text status-text--error">{error}</small> : null}

      <button
        type="button"
        className="upload-row-menu__action"
        onClick={() => void handleSave()}
        disabled={disabled || saving}
      >
        {saving ? 'Saving…' : 'Save details'}
      </button>
    </div>
  );
}

export default FileDetailsEditor;
