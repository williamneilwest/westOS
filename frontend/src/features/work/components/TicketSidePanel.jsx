import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { linkifyText } from '../../../utils/linkifyText';
import { isUsableUserValue, openUserRecord } from '../utils/userLinks';

const SWIPE_THRESHOLD = 70;

function firstValue(ticket, candidates = []) {
  for (const key of candidates) {
    const value = ticket?.[key];
    if (value !== undefined && value !== null) {
      const text = String(value).trim();
      if (text) {
        return text;
      }
    }
  }
  return '';
}

function resolveNotes(ticket) {
  const noteCandidates = [
    'combined_notes',
    'comments_and_work_notes',
    'work_notes',
    'comments',
    'work_notes_list',
    'workflow_activity',
  ];

  for (const key of noteCandidates) {
    const value = firstValue(ticket, [key, `u_task_1.${key}`]);
    if (value) {
      return value;
    }
  }
  return '';
}

function normalizePriority(value) {
  const raw = String(value || '').trim();
  const normalized = raw.toLowerCase();
  if (/^1$|p1|critical/.test(normalized)) return 'P1';
  if (/^2$|p2|high/.test(normalized)) return 'P2';
  if (/^3$|p3|medium|moderate/.test(normalized)) return 'P3';
  if (/^4$|p4|low/.test(normalized)) return 'P4';
  if (/^5$|p5/.test(normalized)) return 'P5';
  return raw || 'P?';
}

function formatTicketAge(value) {
  const text = String(value || '').trim();
  if (!text) {
    return 'n/a';
  }

  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    return 'n/a';
  }

  const diffMs = Math.max(0, Date.now() - parsed);
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  if (days > 0) {
    return `${days}d`;
  }
  if (totalHours > 0) {
    return `${totalHours}h`;
  }
  const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  return `${mins}m`;
}

export function TicketSidePanel({
  mobileMode = false,
  ticket,
  ticketId = '',
  onClose,
  onOpenFull,
  aiResult = '',
  aiError = '',
  hasPrev = false,
  hasNext = false,
  onPrev,
  onNext,
  positionLabel = '',
}) {
  const navigate = useNavigate();

  useEffect(() => {
    function handleEsc(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!ticket) {
    return null;
  }

  const shortDescription = firstValue(ticket, ['short_description', 'u_task_1.short_description']) || 'No short description';
  const priority = normalizePriority(firstValue(ticket, ['priority', 'u_task_1.priority']));
  const assignedTo = firstValue(ticket, ['assigned_to', 'u_task_1.assigned_to']) || 'Unassigned';
  const impactedUser = firstValue(ticket, ['u_impacted_user', 'impacted_user', 'caller_id', 'u_task_1.u_impacted_user']) || '—';
  const openedAt = firstValue(ticket, ['opened_at', 'sys_created_on', 'created_on', 'opened', 'u_task_1.opened_at', 'u_task_1.sys_created_on']);
  const ticketAge = formatTicketAge(openedAt);
  const location = firstValue(ticket, ['location', 'u_location', 'site', 'u_task_1.location']) || '—';
  const device = firstValue(ticket, ['cmdb_ci', 'device', 'u_task_1.cmdb_ci']) || '—';
  const description = firstValue(ticket, ['description', 'u_task_1.description']) || '—';
  const notes = resolveNotes(ticket);
  const touchStartXRef = useRef(null);

  function handleTouchStart(event) {
    touchStartXRef.current = event.touches?.[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    if (touchStartXRef.current === null) {
      return;
    }
    const endX = event.changedTouches?.[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (deltaX <= -SWIPE_THRESHOLD && hasNext) {
      onNext?.();
      return;
    }
    if (deltaX >= SWIPE_THRESHOLD && hasPrev) {
      onPrev?.();
    }
  }

  return (
    <div className="ticket-side-panel-backdrop" onClick={() => onClose?.()} role="presentation">
      <aside
        className={mobileMode ? 'ticket-side-panel ticket-side-panel--modal' : 'ticket-side-panel'}
        onClick={(event) => event.stopPropagation()}
        aria-label="Ticket details"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <header className="ticket-side-panel__header">
          <div>
            <span className="ui-eyebrow">Ticket</span>
            <h3>{ticketId || 'Selected ticket'}</h3>
            <p className="ticket-side-panel__priority">{priority}</p>
            <p>{linkifyText(shortDescription)}</p>
          </div>
          <button type="button" className="compact-toggle compact-toggle--icon" onClick={() => onClose?.()}>
            <X size={15} />
          </button>
        </header>

        <div className="ticket-side-panel__body">
          <section className="ticket-side-panel__section">
            <div className="ticket-side-panel__grid">
              <span><small>Assigned To</small><strong>{assignedTo}</strong></span>
              <span>
                <small>Impacted User</small>
                {isUsableUserValue(impactedUser) ? (
                  <button
                    className="user-record-link"
                    onClick={() => void openUserRecord(impactedUser, navigate)}
                    type="button"
                  >
                    {impactedUser}
                  </button>
                ) : (
                  <strong>{impactedUser}</strong>
                )}
              </span>
              <span><small>Ticket Age</small><strong>{ticketAge}</strong></span>
            </div>
          </section>

          <section className="ticket-side-panel__section">
            <h4>Context</h4>
            <div className="ticket-side-panel__grid">
              <span><small>Location</small><strong>{linkifyText(location)}</strong></span>
              <span><small>Device</small><strong>{linkifyText(device)}</strong></span>
            </div>
          </section>

          <section className="ticket-side-panel__section">
            <h4>Description</h4>
            <p>{linkifyText(description)}</p>
          </section>

          <section className="ticket-side-panel__section">
            <h4>Notes</h4>
            <p>{linkifyText(notes || 'No notes available')}</p>
          </section>

          {aiError ? <p className="status-text status-text--error">{aiError}</p> : null}
          {aiResult ? (
            <section className="ticket-side-panel__section">
              <h4>AI Summary</h4>
              <p>{linkifyText(aiResult)}</p>
            </section>
          ) : null}
        </div>

        <footer className="ticket-side-panel__footer">
          {hasPrev || hasNext ? (
            <div className="table-actions">
              <button type="button" className="compact-toggle" onClick={() => onPrev?.()} disabled={!hasPrev}>
                <ChevronLeft size={14} />
                Prev
              </button>
              <small className="status-text">{positionLabel || ''}</small>
              <button type="button" className="compact-toggle" onClick={() => onNext?.()} disabled={!hasNext}>
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          ) : null}
          <button type="button" className="compact-toggle" onClick={() => onOpenFull?.()} disabled={!ticketId}>
            Open Full
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default TicketSidePanel;
