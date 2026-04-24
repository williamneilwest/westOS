import { AlertTriangle, Clock3, MessageSquareText, RefreshCw, Tags, UserRoundCheck } from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser } from '../../../app/hooks/useCurrentUser';
import { Card, CardHeader } from '../../../app/ui/Card';
import { DataModal } from '../../../components/DataModal';
import { KeywordSettingsPanel } from './KeywordSettingsPanel';

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatUpdated(value) {
  if (!value) {
    return 'Not loaded';
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 'Recently';
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(parsed));
}

function MetricTile({ label, value, detail, onClick }) {
  const Tag = onClick ? 'button' : 'article';
  return (
    <Tag className={onClick ? 'insights-tile ticket-metrics-tile ticket-metrics-clickable' : 'insights-tile ticket-metrics-tile'} onClick={onClick} type={onClick ? 'button' : undefined}>
      <span>{label}</span>
      <strong>{formatNumber(value)}</strong>
      {detail ? <small>{detail}</small> : null}
      {onClick ? <em>Tap to explore</em> : null}
    </Tag>
  );
}

function RankedList({ items = [], emptyText, secondaryKey, footer = null, onItemClick }) {
  if (!items.length) {
    return (
      <>
        <p className="insights-section__empty">{emptyText}</p>
        {footer}
      </>
    );
  }

  return (
    <div className="insights-list">
      {items.map((item) => (
        <button
          className={onItemClick ? 'insights-list__row insights-list__row--button' : 'insights-list__row'}
          key={`${item.label || item.id}-${item.count ?? item.openedAt ?? item.state}`}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          type={onItemClick ? 'button' : undefined}
        >
          <div>
            <strong>{item.label || item.id}</strong>
            {secondaryKey && item[secondaryKey] ? <small>{item[secondaryKey]}</small> : null}
          </div>
          <span>{item.count ?? item.state ?? item.openedAt}</span>
        </button>
      ))}
      {footer}
    </div>
  );
}

export function TicketMetricsView({
  metrics,
  compact = false,
  aiSummary = '',
  aiSummaryAction = null,
  loading = false,
  error = '',
  lastUpdated = '',
  onRefresh,
}) {
  const overview = metrics?.overview || {};
  const activity = metrics?.activity || {};
  const ownership = metrics?.ownership || {};
  const dataQuality = metrics?.data_quality || {};
  const unassignedCount = Number(ownership.unassigned_count ?? overview.unassigned ?? 0);
  const unassignedBreakdown = ownership.unassigned || metrics?.unassigned || {};
  const { isAdmin } = useCurrentUser();
  const [modal, setModal] = useState(null);
  const summary = aiSummary || metrics?.ai_summary || '';
  const backendSummaryMetrics = Array.isArray(metrics?.summaryMetrics) ? metrics.summaryMetrics : [];
  const findSummaryMetric = (matcher) => backendSummaryMetrics.find((metric) => matcher(String(metric.label || ''))) || {};
  const summaryMetrics = [
    { ...findSummaryMetric((label) => label === 'Total Tickets'), label: 'Total Tickets', value: overview.total, detail: 'Rows loaded' },
    { ...findSummaryMetric((label) => label === 'Unassigned'), label: 'Unassigned', value: overview.unassigned, detail: 'Needs owner' },
    { ...findSummaryMetric((label) => label === 'Stale Tickets'), label: 'Stale', value: overview.stale, detail: 'Updated over 3 days ago' },
    { ...findSummaryMetric((label) => label === 'High Priority'), label: 'High Priority', value: overview.high_priority, detail: 'Critical or high' },
  ];
  const hasSummary = Boolean(String(summary || '').trim());
  const openModal = (title, items = []) => setModal({ title, items: Array.isArray(items) ? items : [] });
  const blockedKeywords = new Set(
    (metrics?.settings?.do_not_use_keywords || []).map((keyword) => String(keyword || '').toLowerCase())
  );
  const keywordRows = (dataQuality.keywords || []).filter(
    (keyword) => !blockedKeywords.has(String(keyword.label || keyword.word || '').toLowerCase())
  );

  if (loading && !metrics?.overview) {
    return <p className="status-text">Loading active ticket metrics...</p>;
  }

  if (error) {
    return <p className="status-text status-text--error">{error}</p>;
  }

  if (!metrics?.overview) {
    return <p className="status-text">No active ticket metrics are available.</p>;
  }

  return (
    <div className={compact ? 'ticket-metrics ticket-metrics--compact' : 'ticket-metrics'}>
      <div className="ticket-metrics__toolbar">
        <div>
          <span className="ui-eyebrow">Operational Health</span>
          <p>{`Last updated: ${formatUpdated(lastUpdated || metrics.updated_at)}`}</p>
        </div>
        <button
          className="ticket-metrics__warning-badge ticket-metrics-clickable"
          onClick={() => openModal('Unassigned Tickets', ownership.unassigned_items || [])}
          type="button"
        >
          <span>{formatNumber(unassignedCount)} Unassigned</span>
          <small>{`REQ ${formatNumber(unassignedBreakdown.req)} / INC ${formatNumber(unassignedBreakdown.incident)} / TASK ${formatNumber(unassignedBreakdown.task)}`}</small>
        </button>
        {onRefresh ? (
          <button className="compact-toggle" disabled={loading} onClick={onRefresh} type="button">
            <RefreshCw size={14} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        ) : null}
      </div>

      <div className="ticket-metrics__summary-bar">
        {summaryMetrics.map((metric) => (
          <MetricTile
            key={metric.label}
            {...metric}
            onClick={() => openModal(metric.label, metric.items || [])}
          />
        ))}
      </div>

      <section className="insights-section">
        <div className="insights-section__header">
          <div className="insights-section__title">
            <Clock3 size={16} />
            <h3>Activity</h3>
          </div>
          <span className="ticket-metrics__section-label">Operational Health</span>
        </div>
        <div className="metrics-grid">
          <Card className="insights-panel card-wide">
            <CardHeader eyebrow="Activity" title="Ticket State Distribution" />
            <RankedList
              emptyText="No state data available."
              items={activity.state_distribution || []}
              onItemClick={(item) => openModal(`State: ${item.label}`, item.items || [])}
            />
          </Card>
          <Card className="insights-panel">
            <CardHeader eyebrow="Aging" title="Oldest Tickets" />
            <RankedList
              emptyText="No open ticket age data available."
              items={activity.oldest_tickets || []}
              secondaryKey="assignee"
              onItemClick={() => openModal('Oldest Tickets', activity.oldest_ticket_items || [])}
            />
            {(activity.oldest_ticket_items || []).length ? (
              <button className="ticket-metrics-explore" onClick={() => openModal('Oldest Tickets', activity.oldest_ticket_items || [])} type="button">
                Tap to explore
              </button>
            ) : null}
          </Card>
        </div>
      </section>

      <section className="insights-section">
        <div className="insights-section__header">
          <div className="insights-section__title">
            <UserRoundCheck size={16} />
            <h3>Ownership</h3>
          </div>
          <span className="ticket-metrics__section-label">Workload Distribution</span>
        </div>
        <div className="metrics-grid">
          <Card className="insights-panel">
            <CardHeader eyebrow="Ownership" title="Most Active Assignees" />
            <RankedList
              emptyText="No assigned user workload available."
              items={ownership.most_active_assignees || []}
              onItemClick={(item) => openModal(`Assignee: ${item.label}`, item.items || [])}
              footer={
                <button
                  className="insights-list__row insights-list__row--button ticket-metrics__unassigned-row"
                  onClick={() => openModal('Unassigned Tickets', ownership.unassigned_items || [])}
                  type="button"
                >
                  <div>
                    <strong>Unassigned</strong>
                    <small>{`Excluded from workload ranking. REQ ${formatNumber(unassignedBreakdown.req)} / INC ${formatNumber(unassignedBreakdown.incident)} / TASK ${formatNumber(unassignedBreakdown.task)}`}</small>
                  </div>
                  <span>{formatNumber(unassignedCount)}</span>
                </button>
              }
            />
          </Card>
        </div>
      </section>

      <section className="insights-section">
        <div className="insights-section__header">
          <div className="insights-section__title">
            <Tags size={16} />
            <h3>Data Quality</h3>
          </div>
        </div>
        <div className="metrics-grid">
          <Card className="insights-panel">
            <CardHeader eyebrow="Coverage" title="Missing Fields" />
            <div className="ticket-metrics__mini-grid">
              {(dataQuality.missing_fields || []).map((metric) => (
                <MetricTile key={metric.label} {...metric} onClick={() => openModal(metric.label, metric.items || [])} />
              ))}
            </div>
          </Card>
          <Card className="insights-panel card-wide">
            <CardHeader eyebrow="Content" title="Keywords" />
            {keywordRows.length ? (
              <div className="keyword-pills">
                {keywordRows.map((keyword) => (
                  <button
                    className="keyword-pill keyword-pill--button"
                    key={keyword.label}
                    onClick={() => openModal(`Keyword: ${keyword.label}`, keyword.items || [])}
                    type="button"
                  >
                    {keyword.label}
                    <strong>{keyword.count}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <p className="insights-section__empty">No keyword data available.</p>
            )}
            {isAdmin ? (
              <details className="keyword-settings-details">
                <summary className="compact-toggle">Keyword Settings</summary>
                <KeywordSettingsPanel onSaved={() => onRefresh?.()} />
              </details>
            ) : null}
          </Card>
        </div>
      </section>

      {hasSummary || aiSummaryAction ? (
        <details className="insights-summary-box ticket-metrics__summary-card" open={!compact && hasSummary}>
          <summary>
            <span>
              <MessageSquareText size={16} />
              AI Summary
            </span>
            {aiSummaryAction}
          </summary>
          {hasSummary ? <p>{summary}</p> : <p className="insights-section__empty">No AI summary generated yet.</p>}
        </details>
      ) : null}

      {!compact ? (
        <section className="insights-section">
          <div className="insights-section__header">
            <div className="insights-section__title">
              <AlertTriangle size={16} />
              <h3>Full Overview</h3>
            </div>
          </div>
          <div className="insights-grid">
            {(metrics.summaryMetrics || []).map((metric) => (
              <MetricTile key={metric.label} {...metric} onClick={() => openModal(metric.label, metric.items || [])} />
            ))}
          </div>
        </section>
      ) : null}

      <DataModal
        open={!!modal}
        title={modal?.title}
        items={modal?.items || []}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
