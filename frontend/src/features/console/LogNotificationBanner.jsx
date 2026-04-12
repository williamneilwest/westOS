import { useEffect, useMemo, useState } from 'react';
import { getLogsSummary } from '../../app/services/api';

const REFRESH_MS = 45000;

function levelBadge(level) {
  if (level === 'high') {
    return 'High';
  }
  if (level === 'medium') {
    return 'Warning';
  }
  return 'Info';
}

function isMissingLogPhrase(message) {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('log is missing') || normalized.includes('no log provided');
}

export function LogNotificationBanner({ onExpandLogs = null }) {
  const [summary, setSummary] = useState({ errors: [], warnings: [] });
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [noDataMessage, setNoDataMessage] = useState('');

  const highErrors = useMemo(
    () => (summary.errors || []).filter((item) => String(item?.severity || '').toLowerCase() === 'high'),
    [summary.errors]
  );
  const warningCount = (summary.warnings || []).length;
  const totalIssues = (summary.errors || []).length + warningCount;
  const bannerTone = highErrors.length ? 'critical' : totalIssues ? 'warning' : 'healthy';
  const bannerMessage = highErrors.length
    ? `${highErrors.length} service issue${highErrors.length === 1 ? '' : 's'} down — immediate attention required`
    : totalIssues
      ? `${totalIssues} service warning${totalIssues === 1 ? '' : 's'} detected`
      : 'All systems operational';

  async function loadSummary() {
    try {
      setError('');
      setNoDataMessage('');
      const payload = await getLogsSummary();
      const filteredErrors = (Array.isArray(payload?.errors) ? payload.errors : []).filter(
        (item) => !isMissingLogPhrase(item?.message)
      );
      const filteredWarnings = (Array.isArray(payload?.warnings) ? payload.warnings : []).filter(
        (item) => !isMissingLogPhrase(item?.message)
      );
      setSummary({
        errors: filteredErrors,
        warnings: filteredWarnings,
      });
      if (String(payload?.status || '').toLowerCase() === 'no_data') {
        setNoDataMessage(String(payload?.message || 'No logs available to analyze'));
      }
    } catch (requestError) {
      setError(requestError.message || 'Log summary unavailable.');
      setNoDataMessage('');
      setSummary({ errors: [], warnings: [] });
    }
  }

  useEffect(() => {
    void loadSummary();
    const timer = window.setInterval(() => {
      void loadSummary();
    }, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  if (error) {
    return <div className="log-notification-banner log-notification-banner--error">{error}</div>;
  }

  return (
    <div className={`log-notification-banner log-notification-banner--${bannerTone}`}>
      <div className="log-notification-banner__row">
        <span>{bannerMessage}</span>
        <div className="table-actions">
          <button className="compact-toggle" type="button" onClick={() => setExpanded((current) => !current)}>
            {expanded ? 'Hide' : 'Expand'}
          </button>
          <button className="compact-toggle" type="button" onClick={() => onExpandLogs?.()}>
            View Logs
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="log-notification-banner__list">
          {totalIssues ? (
            [...(summary.errors || []), ...(summary.warnings || [])].slice(0, 5).map((item) => (
              <div className="log-notification-banner__item" key={item.hash || `${item.timestamp}-${item.message}`}>
                <strong>{levelBadge(String(item.severity || '').toLowerCase())}</strong>
                <span>{item.message}</span>
              </div>
            ))
          ) : (
            <div className="log-notification-banner__item">
              <strong>Info</strong>
              <span>{noDataMessage || 'No active warnings or errors detected in recent checks.'}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default LogNotificationBanner;
