import { useEffect, useMemo, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { getAIInteractionLogs } from '../../../app/services/aiClient';
import { Card, CardHeader } from '../../../app/ui/Card';
import { EmptyState } from '../../../app/ui/EmptyState';
import { AIInteractionCard } from './AIInteractionCard';

const BROKEN_SUMMARY_TEXT = 'KB results found, but no concise summary was returned.';
const FALLBACK_SUMMARY_TEXT = 'Document found, showing extracted content';

function normalizeItems(items) {
  const list = Array.isArray(items) ? items : [];
  return list.filter((item) => String(item?.status || '').toLowerCase() !== 'skipped');
}

function sanitizeSystemText(text) {
  const value = String(text || '').trim();
  if (!value) {
    return '';
  }
  if (value.includes(BROKEN_SUMMARY_TEXT)) {
    return FALLBACK_SUMMARY_TEXT;
  }
  return value;
}

function parseJsonBlock(value) {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    // fallback parsing below
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[0]);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function extractOriginalQuery(entry) {
  const explicit = String(entry?.originalUserQuery || '').trim();
  if (explicit) {
    return explicit;
  }

  const prompt = String(entry?.prompt || '');
  const match = prompt.match(/user query:\s*(.+)$/im);
  if (match) {
    return match[1].trim();
  }
  return '';
}

function normalizeStructuredResponse(entry) {
  const parsed = parseJsonBlock(entry?.response);
  const rawResponse = sanitizeSystemText(entry?.response);

  const steps = parsed?.steps;
  const normalizedSteps = Array.isArray(steps)
    ? steps.map((step) => String(step || '').trim()).filter(Boolean)
    : [];

  let summary = sanitizeSystemText(parsed?.summary || '');
  if (!summary) {
    summary = sanitizeSystemText(rawResponse);
  }
  if (!summary) {
    summary = FALLBACK_SUMMARY_TEXT;
  }

  const citations = Array.isArray(parsed?.citations) ? parsed.citations : [];
  const sourceFromCitation = citations.find((item) => item && typeof item === 'object')?.title;

  return {
    answerType: String(parsed?.answer_type || entry?.responseType || 'summary').trim().toLowerCase(),
    summary,
    steps: normalizedSteps,
    source: String(parsed?.source || sourceFromCitation || '').trim(),
  };
}

function shortToken(value) {
  const count = Number(value || 0);
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}m`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

function agentLabel(entry, agentLookup) {
  const sourceAgent = String(entry?.sourceAgent || '').trim();
  if (sourceAgent && agentLookup[sourceAgent]) {
    return agentLookup[sourceAgent];
  }

  const agentId = String(entry?.agentId || '').trim();
  if (agentId && agentLookup[agentId]) {
    return agentLookup[agentId];
  }

  return sourceAgent || agentId || 'Unknown Agent';
}

export function AIInteractionsViewer({ agentLookup = {} }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modelFilter, setModelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const payload = await getAIInteractionLogs(200);
      setItems(normalizeItems(payload?.items));
    } catch (requestError) {
      setError(requestError.message || 'AI interactions could not be loaded.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.input += Number(item?.tokens?.input || 0);
        acc.output += Number(item?.tokens?.output || 0);
        return acc;
      },
      { input: 0, output: 0 }
    );
  }, [items]);

  const modelOptions = useMemo(
    () => Array.from(new Set(items.map((item) => String(item?.model || '').trim()).filter(Boolean))).sort(),
    [items]
  );
  const typeOptions = useMemo(
    () => Array.from(new Set(items.map((item) => String(item?.type || '').trim()).filter(Boolean))).sort(),
    [items]
  );

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const model = String(item?.model || '').trim();
        const type = String(item?.type || '').trim();
        const modelMatches = modelFilter === 'all' || model === modelFilter;
        const typeMatches = typeFilter === 'all' || type === typeFilter;
        return modelMatches && typeMatches;
      }),
    [items, modelFilter, typeFilter]
  );

  const preparedItems = useMemo(
    () =>
      filteredItems.map((entry, index) => ({
        key: `${entry?.timestamp || 'ts'}-${index}`,
        entry,
        query: extractOriginalQuery(entry),
        structured: normalizeStructuredResponse(entry),
        agent: agentLabel(entry, agentLookup),
      })),
    [filteredItems, agentLookup]
  );

  return (
    <Card className="analysis-grid__wide">
      <CardHeader
        eyebrow="AI Monitoring"
        title="AI Interactions"
        description="Compact accordion cards with route and response details."
        action={(
          <button className="compact-toggle" type="button" onClick={() => void loadItems()} disabled={loading}>
            Refresh
          </button>
        )}
      />

      {error ? <p className="status-text status-text--error">{error}</p> : null}

      <div className="console-runtime-meta">
        <span>
          <small>Total interactions</small>
          <strong>{filteredItems.length}</strong>
        </span>
        <span>
          <small>Input tokens</small>
          <strong>{totals.input}</strong>
        </span>
        <span>
          <small>Output tokens</small>
          <strong>{totals.output}</strong>
        </span>
      </div>

      <div className="ai-interactions-controls">
        <label className="settings-field" htmlFor="ai-model-filter">
          <span>Model</span>
          <select id="ai-model-filter" className="ticket-queue__filter" value={modelFilter} onChange={(event) => setModelFilter(event.target.value)}>
            <option value="all">All models</option>
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </label>
        <label className="settings-field" htmlFor="ai-type-filter">
          <span>Interaction Type</span>
          <select id="ai-type-filter" className="ticket-queue__filter" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="status-text">Loading AI interactions...</p>
      ) : preparedItems.length ? (
        <div className="stack-list ai-interactions-list">
          {preparedItems.map((interaction) => (
            <AIInteractionCard key={interaction.key} interaction={interaction} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<MessageSquareText size={20} />}
          title="No AI interactions yet"
          description="Run an AI operation to populate this viewer."
        />
      )}

      {!loading && preparedItems.length ? (
        <div className="ai-interactions-footer">
          <span className="status-text">{`Filtered token total: ${shortToken(totals.input + totals.output)}`}</span>
        </div>
      ) : null}
    </Card>
  );
}

export default AIInteractionsViewer;
