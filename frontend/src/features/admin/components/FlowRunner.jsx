import { useEffect, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import { Card, CardHeader } from '../../../app/ui/Card';
import { runFlow } from '../../../app/services/api';

function buildDefaultVariables(schema) {
  const fields = Array.isArray(schema) ? schema : [];
  return fields.reduce((acc, field) => {
    const name = String(field?.name || '').trim();
    const type = String(field?.type || 'string').trim().toLowerCase();
    if (!name) {
      return acc;
    }
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

function coerceValue(type, value) {
  const normalizedType = String(type || 'string').toLowerCase();
  if (normalizedType === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (normalizedType === 'boolean') {
    return Boolean(value);
  }
  return String(value ?? '');
}

export function FlowRunner({ template = null, onResult = null }) {
  const schema = useMemo(() => (Array.isArray(template?.input_schema) ? template.input_schema : []), [template?.input_schema]);
  const [variables, setVariables] = useState(() => buildDefaultVariables(schema));
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setVariables(buildDefaultVariables(schema));
    setResult(null);
    setError('');
  }, [template?.id, template?.script_name, schema]);

  function handleVariableChange(field, nextValue) {
    const name = String(field?.name || '').trim();
    if (!name) {
      return;
    }
    const coerced = coerceValue(field?.type, nextValue);
    setVariables((current) => ({ ...current, [name]: coerced }));
  }

  async function handleRun() {
    if (!template?.script_name) {
      setError('Template script name is required.');
      return;
    }

    setIsRunning(true);
    setError('');
    setResult(null);
    try {
      const payload = await runFlow(template, variables);
      const item = payload?.item || null;
      setResult(item);
      if (typeof onResult === 'function') {
        onResult(item);
      }
    } catch (requestError) {
      setError(requestError.message || 'Flow run failed.');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Test Runner"
        title={template?.display_name || 'Flow Test'}
        description="Generated input fields from template schema."
        action={(
          <button className="ui-button ui-button--primary" type="button" onClick={() => void handleRun()} disabled={isRunning || !template?.script_name}>
            <Play size={14} />
            {isRunning ? 'Running...' : 'Run Test'}
          </button>
        )}
      />

      {schema.length ? (
        <div className="analysis-grid">
          {schema.map((field) => {
            const fieldName = String(field?.name || '').trim();
            const fieldType = String(field?.type || 'string').trim().toLowerCase();
            if (!fieldName) {
              return null;
            }

            if (fieldType === 'boolean') {
              return (
                <label key={fieldName} className="settings-field">
                  <span>{fieldName}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(variables[fieldName])}
                    onChange={(event) => handleVariableChange(field, event.target.checked)}
                  />
                </label>
              );
            }

            return (
              <label key={fieldName} className="settings-field">
                <span>{fieldName}</span>
                <input
                  className="settings-input"
                  type={fieldType === 'number' ? 'number' : 'text'}
                  value={variables[fieldName] ?? ''}
                  onChange={(event) => handleVariableChange(field, event.target.value)}
                />
              </label>
            );
          })}
        </div>
      ) : (
        <p className="status-text">No input fields defined. This flow will run with an empty variables payload.</p>
      )}

      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {result ? (
        <div className="analysis-grid">
          <Card>
            <CardHeader eyebrow="Status" title="Execution" />
            <p>{`Flow: ${result.flow_name || template?.display_name || template?.script_name || 'Flow'}`}</p>
            <p>{`HTTP: ${result.status_code || 'Unknown'}`}</p>
          </Card>
          <Card>
            <CardHeader eyebrow="Output" title="Response JSON" />
            <pre className="code-block">{JSON.stringify(result.response || result, null, 2)}</pre>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}

export default FlowRunner;
