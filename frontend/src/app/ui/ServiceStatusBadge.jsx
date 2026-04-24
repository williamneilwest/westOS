function normalizeStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'ok' || normalized === 'healthy' || normalized === 'up') {
    return 'ok';
  }
  if (normalized === 'degraded' || normalized === 'misconfigured' || normalized === 'warning') {
    return 'degraded';
  }
  if (normalized === 'down' || normalized === 'fail' || normalized === 'error') {
    return 'fail';
  }
  return 'degraded';
}

export function ServiceStatusBadge({ status, label }) {
  const tone = normalizeStatus(status);
  const text = label || String(status || 'unknown');

  return <span className={`system-badge system-badge--${tone}`}>{text}</span>;
}

