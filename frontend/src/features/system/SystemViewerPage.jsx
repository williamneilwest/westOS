import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, ExternalLink, RefreshCw, X } from 'lucide-react';
import { useCurrentUser } from '../../app/hooks/useCurrentUser';
import { getSystemServices, getSystemStatus } from '../../app/services/api';
import { Button } from '../../app/ui/Button';
import { Card } from '../../app/ui/Card';
import { SectionHeader } from '../../app/ui/SectionHeader';
import { GatedCard } from '../auth/GatedCard';
import { LogNotificationBanner } from '../console/LogNotificationBanner';
import { LogsPanel } from '../console/LogsPanel';

const GRAFANA_BASE_URL = 'https://grafana.westos.app';

const ROLE_GUEST = 'guest';
const ROLE_USER = 'user';
const ROLE_ADMIN = 'admin';

const SERVICE_CATALOG = [
  { id: 'backend', label: 'backend', title: 'Backend', aliases: ['backend'], group: 'Core System', uiUrl: '' },
  { id: 'ai-gateway', label: 'ai-gateway', title: 'AI Gateway', aliases: ['ai-gateway'], group: 'Core System', uiUrl: '' },
  { id: 'postgres', label: 'postgres', title: 'PostgreSQL', aliases: ['postgres', 'database'], group: 'Core System', uiUrl: '' },
  { id: 'caddy', label: 'caddy', title: 'Caddy', aliases: ['caddy'], group: 'Core System', uiUrl: '' },
  { id: 'plex', label: 'plex', title: 'Plex', aliases: ['plex'], group: 'Media Services', uiUrl: 'https://plex.westos.app' },
  { id: 'qbittorrent', label: 'qbittorrent', title: 'qBittorrent', aliases: ['qbittorrent', 'torrent'], group: 'Media Services', uiUrl: 'https://torrent.westos.app' },
  { id: 'portainer', label: 'portainer', title: 'Portainer', aliases: ['portainer'], group: 'Admin / Dev', uiUrl: 'https://portainer.westos.dev' },
  { id: 'code-server', label: 'code-server', title: 'Code Server', aliases: ['code-server', 'code'], group: 'Admin / Dev', uiUrl: 'https://code.westos.app' },
  { id: 'filebrowser', label: 'filebrowser', title: 'Filebrowser', aliases: ['filebrowser', 'files'], group: 'Admin / Dev', uiUrl: 'https://files.westos.dev' },
  { id: 'grafana', label: 'grafana', title: 'Grafana', aliases: ['grafana'], group: 'Admin / Dev', uiUrl: 'https://grafana.westos.app' },
];

function normalizeHealth(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'up' || normalized === 'ok' || normalized === 'healthy') return 'up';
  if (normalized === 'down' || normalized === 'error' || normalized === 'fail' || normalized === 'unhealthy') return 'down';
  return 'degraded';
}

function findService(services = [], aliases = []) {
  const normalizedAliases = aliases.map((alias) => String(alias).toLowerCase());
  return (
    services.find((item) => {
      const name = String(item?.name || '').toLowerCase();
      const container = String(item?.container_name || '').toLowerCase();
      return normalizedAliases.some((alias) => name.includes(alias) || container.includes(alias));
    }) || null
  );
}

function compactUptime(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'Up • --';
  const cleaned = raw
    .replace(/^up\b/i, '')
    .replace(/^about\b/i, '')
    .replace(/\ban\b hour\b/i, '1 hour')
    .replace(/\ba\b minute\b/i, '1 minute')
    .replace(/\ba\b second\b/i, '1 second')
    .replace(/\s+/g, ' ')
    .trim();

  const compact = cleaned
    .replace(/\b(\d+)\s*(hours?|hrs?)\b/gi, '$1h')
    .replace(/\b(\d+)\s*(minutes?|mins?)\b/gi, '$1m')
    .replace(/\b(\d+)\s*(seconds?|secs?)\b/gi, '$1s')
    .replace(/\b(\d+)\s*(days?)\b/gi, '$1d');

  return `Up • ${compact || '--'}`;
}

function formatLastCheck(value) {
  const parsed = Date.parse(String(value || ''));
  if (Number.isNaN(parsed)) return 'n/a';
  return new Date(parsed).toLocaleString();
}

function buildOperationalSummary(services = [], lastCheck = '') {
  const healthy = services.filter((service) => service.status === 'up').length;
  const degraded = services.filter((service) => service.status === 'degraded').length;
  const down = services.filter((service) => service.status === 'down').length;
  const state = down ? 'down' : degraded ? 'degraded' : 'healthy';
  const stateLabel = state === 'healthy' ? 'Healthy' : state === 'degraded' ? 'Degraded' : 'Down';
  return {
    state,
    stateLabel,
    text: `${stateLabel} • ${services.length} services • Last check: ${formatLastCheck(lastCheck)}`,
    healthy,
    degraded,
    down,
  };
}

function ServiceRow({ service, canViewLogs, onOpenLogs }) {
  return (
    <div className="system-service-row" key={service.id}>
      <div className="system-service-row__main">
        <div className="system-service-row__title">
          <i className={`status-dot status-dot--${service.status === 'up' ? 'ok' : service.status}`} />
          <strong>{service.title}</strong>
        </div>
        <small>{service.uptimeLabel}</small>
      </div>
      <div className="system-service-row__actions">
        <button
          type="button"
          className="compact-toggle"
          onClick={() => onOpenLogs(service)}
          disabled={!canViewLogs}
          title={canViewLogs ? '' : 'Admin access is required'}
        >
          View Logs
        </button>
        {service.uiUrl ? (
          <button
            type="button"
            className="compact-toggle"
            onClick={() => window.open(service.uiUrl, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={13} />
            Open UI
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SystemViewerPage() {
  const { loading: authLoading, authenticated, isAdmin } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [servicePayload, setServicePayload] = useState({ status: 'unknown', services: [] });
  const [runtimeStatus, setRuntimeStatus] = useState(null);
  const [activeLogService, setActiveLogService] = useState(null);
  const [logsExpanded, setLogsExpanded] = useState(true);

  const effectiveRole = useMemo(() => {
    if (!authenticated) return ROLE_GUEST;
    return isAdmin ? ROLE_ADMIN : ROLE_USER;
  }, [authenticated, isAdmin]);

  const canFetchProtectedData = effectiveRole === ROLE_ADMIN;
  const rawServices = useMemo(() => (Array.isArray(servicePayload?.services) ? servicePayload.services : []), [servicePayload]);
  const serviceRows = useMemo(
    () =>
      SERVICE_CATALOG.map((item) => {
        const resolved = findService(rawServices, item.aliases);
        const liveStatus = canFetchProtectedData ? normalizeHealth(resolved?.health) : 'degraded';
        return {
          ...item,
          status: liveStatus,
          containerName: canFetchProtectedData
            ? String(resolved?.container_name || resolved?.name || item.label || '').trim()
            : '',
          uptimeLabel: canFetchProtectedData ? compactUptime(resolved?.uptime || resolved?.status) : 'Up • restricted',
        };
      }),
    [canFetchProtectedData, rawServices]
  );

  const summary = useMemo(
    () => buildOperationalSummary(serviceRows, runtimeStatus?.timestamp || ''),
    [runtimeStatus?.timestamp, serviceRows]
  );

  const visibleGroups = useMemo(() => {
    const grouped = {
      'Core System': serviceRows.filter((item) => item.group === 'Core System'),
      'Media Services': serviceRows.filter((item) => item.group === 'Media Services'),
      'Admin / Dev': serviceRows.filter((item) => item.group === 'Admin / Dev'),
    };

    if (effectiveRole === ROLE_ADMIN) return grouped;
    if (effectiveRole === ROLE_USER) {
      return {
        'Core System': grouped['Core System'],
        'Media Services': grouped['Media Services'],
      };
    }
    return {};
  }, [effectiveRole, serviceRows]);

  async function loadServices({ refresh = false } = {}) {
    if (!canFetchProtectedData) return;
    setLoading(true);
    setError('');
    try {
      const [serviceResult, statusResult] = await Promise.all([
        getSystemServices({ refresh }),
        getSystemStatus(),
      ]);
      setServicePayload(serviceResult || { status: 'unknown', services: [] });
      setRuntimeStatus(statusResult?.data || statusResult || null);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load service status.');
      setRuntimeStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canFetchProtectedData) {
      setServicePayload({ status: 'unknown', services: [] });
      setRuntimeStatus(null);
      setError('');
      setLoading(false);
      return;
    }
    void loadServices();
  }, [canFetchProtectedData]);

  useEffect(() => {
    if (!activeLogService) return undefined;
    function handleEscape(event) {
      if (event.key === 'Escape') setActiveLogService(null);
    }
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeLogService]);

  if (authLoading) {
    return <section className="module module--tight system-viewer"><p className="status-text">Checking authorization...</p></section>;
  }

  return (
    <section className="module module--tight system-viewer">
      <SectionHeader
        tag="/app/system"
        title="System Overview"
        description="Compact service console with health, logs, and quick actions."
        actions={(
          <div className="system-header-actions">
            {canFetchProtectedData ? (
              <>
                <Button variant="secondary" onClick={() => loadServices({ refresh: true })}>
                  <RefreshCw size={14} />
                  Refresh
                </Button>
                <Button variant="secondary" onClick={() => setLogsExpanded((current) => !current)}>
                  {logsExpanded ? 'Hide Logs' : 'Show Logs'}
                </Button>
                <Button variant="secondary" onClick={() => setActiveLogService(serviceRows.find((item) => item.id === 'backend') || null)}>
                  View Logs
                </Button>
              </>
            ) : null}
            <Button onClick={() => window.open(GRAFANA_BASE_URL, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={14} />
              Open Dashboard
            </Button>
          </div>
        )}
      />

      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {loading ? <p className="status-text">Loading system overview...</p> : null}

      {canFetchProtectedData ? (
        <>
          <Card className={`system-summary-line system-summary-line--${summary.state}`}>
            <span className="system-summary-line__text">
              <i className={`status-dot status-dot--${summary.state === 'healthy' ? 'ok' : summary.state}`} />
              {summary.text}
            </span>
          </Card>

          <div className="console-stats-strip system-stats-pills" aria-label="System status metrics">
            <span className="console-stat-pill console-stat-pill--ok">
              <CheckCircle2 size={14} />
              {`Healthy: ${summary.healthy}`}
            </span>
            <span className="console-stat-pill console-stat-pill--warning">
              <AlertTriangle size={14} />
              {`Degraded: ${summary.degraded}`}
            </span>
            <span className="console-stat-pill console-stat-pill--down">
              <Cpu size={14} />
              {`Down: ${summary.down}`}
            </span>
          </div>

          <LogNotificationBanner onExpandLogs={() => setLogsExpanded(true)} />

          {logsExpanded ? (
            <Card className="system-logs-card">
              <LogsPanel requestedContainer="backend" autoOpen />
            </Card>
          ) : null}
        </>
      ) : null}

      {effectiveRole === ROLE_GUEST ? (
        <GatedCard message="Sign in to view system and service details" />
      ) : null}

      {Object.entries(visibleGroups).map(([groupName, items]) => (
        items.length ? (
          <div key={groupName} className="system-group-block">
            <SectionHeader
              tag="/app/system/services"
              title={groupName}
              description={`${items.length} service${items.length === 1 ? '' : 's'}`}
            />
            <div className="system-service-list">
              {items.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  canViewLogs={canFetchProtectedData}
                  onOpenLogs={(selectedService) => setActiveLogService(selectedService)}
                />
              ))}
            </div>
          </div>
        ) : null
      ))}

      {activeLogService ? (
        <div className="system-log-modal-backdrop" onClick={() => setActiveLogService(null)} role="presentation">
          <section
            className="system-log-modal"
            aria-label={`${activeLogService.title} logs`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="system-log-modal__header">
              <div>
                <span className="ui-eyebrow">Service Logs</span>
                <h3>{activeLogService.title}</h3>
                <p>{activeLogService.containerName || activeLogService.label}</p>
              </div>
              <button
                type="button"
                className="compact-toggle compact-toggle--icon"
                onClick={() => setActiveLogService(null)}
              >
                <X size={15} />
              </button>
            </div>
            <LogsPanel requestedContainer={activeLogService.containerName} autoOpen />
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default SystemViewerPage;
