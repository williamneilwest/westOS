import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader } from '../../../app/ui/Card';
import { EmptyState } from '../../../app/ui/EmptyState';
import { searchDeviceLocations } from '../../../app/services/api';

function formatLabel(key) {
  return String(key || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function HardwareRecordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const row = location.state?.row && typeof location.state.row === 'object' ? location.state.row : null;
  const label = String(location.state?.label || '').trim() || 'Hardware Record';
  const [referenceTickets, setReferenceTickets] = useState([]);
  const [referenceSourceKey, setReferenceSourceKey] = useState('');
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceError, setReferenceError] = useState('');

  const contextDevice = useMemo(() => {
    const stateDevice = String(location.state?.context?.device || location.state?.device || '').trim();
    if (stateDevice) {
      return stateDevice;
    }
    const params = new URLSearchParams(location.search || '');
    const queryDevice = String(params.get('device') || params.get('query') || '').trim();
    if (queryDevice) {
      return queryDevice;
    }
    if (!row) {
      return '';
    }
    const candidates = ['name', 'device_name', 'computer_name', 'u_hardware_1.name'];
    for (const key of candidates) {
      const value = row?.[key];
      const text = String(value || '').trim();
      if (/^LAH[LD]/i.test(text)) {
        return text;
      }
    }
    return '';
  }, [location.search, location.state, row]);

  const contextOrigin = String(location.state?.context?.origin || location.state?.from || '').trim();

  useEffect(() => {
    if (!contextDevice) {
      setReferenceTickets([]);
      setReferenceError('');
      setReferenceLoading(false);
      return;
    }

    let mounted = true;
    setReferenceLoading(true);
    setReferenceError('');
    searchDeviceLocations({ query: contextDevice })
      .then((payload) => {
        if (!mounted) {
          return;
        }
        const tickets = Array.isArray(payload?.tickets) ? payload.tickets : [];
        const sourceKey = String(payload?.source_key || '').trim();
        setReferenceTickets(tickets);
        setReferenceSourceKey(sourceKey);
      })
      .catch((error) => {
        if (!mounted) {
          return;
        }
        setReferenceTickets([]);
        setReferenceSourceKey('');
        setReferenceError(error.message || 'Ticket references could not be loaded.');
      })
      .finally(() => {
        if (mounted) {
          setReferenceLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [contextDevice]);

  function openTicket(rowItem) {
    const candidates = ['ticket', 'number', 'ticket_number', 'id', 'sys_id', 'u_task_1'];
    let ticketId = '';
    for (const key of candidates) {
      const value = rowItem?.[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        ticketId = String(value).trim();
        break;
      }
    }
    if (!ticketId) {
      return;
    }
    const sourceSuffix = referenceSourceKey ? `?source=${encodeURIComponent(referenceSourceKey)}` : '';
    navigate(`/tickets/${encodeURIComponent(ticketId)}${sourceSuffix}`, {
      state: {
        from: '/app/work/hardware/rmr-record',
        label: 'Hardware Record',
        sourceKey: referenceSourceKey || '',
      },
    });
  }

  if (!row) {
    return (
      <section className="module">
        <Card className="module__empty-card">
          <EmptyState title="Record not found" description="Open a hardware record from the hardware search table." />
          <div className="table-actions">
            <button type="button" className="compact-toggle" onClick={() => navigate('/app/work/hardware')}>
              <ArrowLeft size={14} />
              Back to Hardware
            </button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="module">
      <div className="table-actions">
        <button type="button" className="compact-toggle" onClick={() => navigate('/app/work/hardware')}>
          <ArrowLeft size={14} />
          Back to Hardware
        </button>
      </div>

      {contextDevice ? (
        <Card>
          <CardHeader
            eyebrow="Context"
            title={contextDevice}
            description={contextOrigin ? `Navigated from ${contextOrigin}` : 'Device reference context detected from navigation.'}
          />
        </Card>
      ) : null}

      <Card className="hardware-record-card">
        <CardHeader eyebrow="Hardware (RMR)" title={label} description="Record detail view from source data." />
        <div className="ticket-detail-grid">
          {Object.entries(row).map(([key, value]) => (
            <div key={key} className="ticket-detail-grid__item">
              <span>{formatLabel(key)}</span>
              <strong>{String(value ?? '—')}</strong>
            </div>
          ))}
        </div>
      </Card>

      <Card className="hardware-record-card">
        <CardHeader
          eyebrow="Ticket References"
          title="Related Tickets"
          description={contextDevice ? `Tickets mentioning ${contextDevice}` : 'No device context found to load ticket references.'}
        />
        {!contextDevice ? (
          <EmptyState title="No reference context" description="Open this page from a device reference link to load related tickets." />
        ) : null}
        {referenceLoading ? <p className="status-text">Loading ticket references...</p> : null}
        {referenceError ? <p className="status-text status-text--error">{referenceError}</p> : null}
        {contextDevice && !referenceLoading && !referenceError && !referenceTickets.length ? (
          <EmptyState title="No related tickets" description="No tickets mentioned this device in the configured ticket source." />
        ) : null}
        {referenceTickets.length ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Short Description</th>
                  <th>Opened At</th>
                </tr>
              </thead>
              <tbody>
                {referenceTickets.map((ticket, index) => (
                  <tr
                    key={`ticket-ref-${ticket?.ticket || ticket?.number || ticket?.id || index}`}
                    className="data-table__row"
                    role="button"
                    tabIndex={0}
                    onClick={() => openTicket(ticket)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openTicket(ticket);
                      }
                    }}
                    title="Open ticket"
                  >
                    <td>{String(ticket?.ticket || ticket?.number || ticket?.id || '—')}</td>
                    <td>{String(ticket?.short_description || ticket?.['u_task_1.short_description'] || '—')}</td>
                    <td>{String(ticket?.opened_at || ticket?.sys_created_on || ticket?.created_at || '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

export default HardwareRecordPage;
