import { Plus, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getKeywordSettings, updateKeywordSettings } from '../../../app/services/api';

function normalizeKeyword(value) {
  return String(value || '').trim().toLowerCase();
}

export function KeywordSettingsPanel({ onSaved }) {
  const [blocked, setBlocked] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getKeywordSettings()
      .then((settings) => {
        if (!active) {
          return;
        }
        setBlocked(Array.isArray(settings?.do_not_use_keywords) ? settings.do_not_use_keywords : []);
        setError('');
      })
      .catch((requestError) => {
        if (!active) {
          return;
        }
        setError(requestError.message || 'Keyword settings could not be loaded.');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const addKeyword = () => {
    const keyword = normalizeKeyword(draft);
    if (!keyword) {
      return;
    }
    setBlocked((current) => (current.includes(keyword) ? current : [...current, keyword].sort()));
    setDraft('');
    setMessage('');
  };

  const removeKeyword = (keyword) => {
    setBlocked((current) => current.filter((item) => item !== keyword));
    setMessage('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const settings = await updateKeywordSettings({ do_not_use_keywords: blocked });
      const nextBlocked = Array.isArray(settings?.do_not_use_keywords) ? settings.do_not_use_keywords : blocked;
      setBlocked(nextBlocked);
      setMessage('Keyword filters saved.');
      onSaved?.(nextBlocked);
    } catch (requestError) {
      setError(requestError.message || 'Keyword settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="keyword-settings-panel">
      <div className="keyword-settings-panel__header">
        <div>
          <strong>Blocked Keywords</strong>
          <small>These words are excluded from keyword metrics.</small>
        </div>
        <button className="compact-toggle" disabled={loading || saving} onClick={save} type="button">
          <Save size={14} />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="keyword-settings-panel__form">
        <input
          className="settings-input"
          disabled={loading || saving}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addKeyword();
            }
          }}
          placeholder="Add keyword"
          value={draft}
        />
        <button className="compact-toggle" disabled={loading || saving || !normalizeKeyword(draft)} onClick={addKeyword} type="button">
          <Plus size={14} />
          Add
        </button>
      </div>

      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {message ? <p className="status-text">{message}</p> : null}

      <div className="keyword-settings-panel__chips">
        {blocked.length ? (
          blocked.map((keyword) => (
            <span className="keyword-settings-chip" key={keyword}>
              {keyword}
              <button aria-label={`Remove ${keyword}`} onClick={() => removeKeyword(keyword)} type="button">
                <X size={12} />
              </button>
            </span>
          ))
        ) : (
          <p className="insights-section__empty">No blocked keywords.</p>
        )}
      </div>
    </div>
  );
}
