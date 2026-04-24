import { useState } from 'react';

function formatWhen(value) {
  const parsed = new Date(value || '');
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown';
  }
  return parsed.toLocaleString();
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

function truncateQuery(value) {
  const query = String(value || '').trim().replace(/\s+/g, ' ');
  if (!query) {
    return 'No user query recorded';
  }
  return query.length > 80 ? `${query.slice(0, 80)}...` : query;
}

function routeBadgeTone(interaction) {
  if (String(interaction?.entry?.status || '').toLowerCase() === 'error') {
    return 'error';
  }

  const answerType = String(interaction?.structured?.answerType || '').toLowerCase();
  if (answerType.includes('fallback') || answerType.includes('low_confidence')) {
    return 'fallback';
  }

  const route = String(interaction?.entry?.route || '').toLowerCase();
  if (route === 'kb') {
    return 'kb';
  }

  return 'general';
}

export function AIInteractionCard({ interaction }) {
  const [expanded, setExpanded] = useState(false);
  const routeTone = routeBadgeTone(interaction);
  const entry = interaction?.entry || {};
  const structured = interaction?.structured || {};
  const queryPreview = truncateQuery(interaction?.query);
  const tokenTotal = shortToken(entry?.tokens?.total || 0);

  return (
    <article className="ai-interaction-card">
      <button type="button" className="ai-interaction-card__collapsed" onClick={() => setExpanded((current) => !current)}>
        <div className="ai-interaction-card__title-row">
          <strong>{interaction?.agent || 'Unknown Agent'}</strong>
          <span className={`ai-route-badge ai-route-badge--${routeTone}`}>{String(entry?.route || 'general')}</span>
          <small>{formatWhen(entry?.timestamp)}</small>
          <span className="chip ai-summary-chip">{tokenTotal}</span>
        </div>
        <p className="ai-interaction-card__query">{queryPreview}</p>
      </button>

      {expanded ? (
        <div className="ai-interaction-card__expanded">
          <section>
            <h5>USER QUERY</h5>
            <p>{interaction?.query || 'No user query recorded'}</p>
          </section>

          <section>
            <h5>ROUTING INFO</h5>
            <div className="ai-interaction-card__meta-grid">
              <span>{`agent: ${interaction?.agent || 'Unknown Agent'}`}</span>
              <span>{`route: ${String(entry?.route || 'general')}`}</span>
              <span>{`mode: ${String(entry?.mode || entry?.type || 'chat')}`}</span>
            </div>
          </section>

          <section>
            <h5>RESPONSE</h5>
            {Array.isArray(structured?.steps) && structured.steps.length ? (
              <ol className="assistant-popover__steps">
                {structured.steps.map((step, index) => (
                  <li key={`${interaction?.key || 'interaction'}-step-${index}`}>{step}</li>
                ))}
              </ol>
            ) : (
              <p>{structured?.summary || 'No response summary recorded.'}</p>
            )}
          </section>

          {structured?.source ? (
            <section>
              <h5>SOURCE</h5>
              <p>{structured.source}</p>
            </section>
          ) : null}

          <section>
            <h5>TOKENS</h5>
            <div className="ai-interaction-card__meta-grid">
              <span>{`input: ${Number(entry?.tokens?.input || 0)}`}</span>
              <span>{`output: ${Number(entry?.tokens?.output || 0)}`}</span>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
}

export default AIInteractionCard;
