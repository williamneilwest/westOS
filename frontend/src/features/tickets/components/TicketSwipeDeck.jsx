import { useMemo, useRef, useState } from 'react';

const SWIPE_THRESHOLD = 80;

function firstValue(ticket, keys) {
  for (const key of keys) {
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

function normalizePriority(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (/^1$|p1|critical/.test(normalized)) return 'P1';
  if (/^2$|p2|high/.test(normalized)) return 'P2';
  if (/^3$|p3|medium|moderate/.test(normalized)) return 'P3';
  if (/^4$|p4|low/.test(normalized)) return 'P4';
  if (/^5$|p5/.test(normalized)) return 'P5';
  return String(value || '').trim() || 'P?';
}

function ticketAge(value) {
  const parsed = Date.parse(String(value || '').trim());
  if (Number.isNaN(parsed)) {
    return 'n/a';
  }
  const diff = Math.max(0, Date.now() - parsed);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${Math.max(1, Math.floor(diff / (1000 * 60)))}m`;
}

function normalizeTicket(ticket) {
  const number = firstValue(ticket, ['number', 'ticket_number', 'ticket', 'u_task_1']);
  const shortDescription = firstValue(ticket, ['short_description', 'u_task_1.short_description']);
  const assignedTo = firstValue(ticket, ['assigned_to', 'u_task_1.assigned_to']) || 'Unassigned';
  const priority = normalizePriority(firstValue(ticket, ['priority', 'u_task_1.priority']));
  const impactedUser = firstValue(ticket, ['u_impacted_user', 'impacted_user', 'caller_id', 'u_task_1.u_impacted_user']) || '—';
  const openedAt = firstValue(ticket, ['opened_at', 'sys_created_on', 'created_on', 'u_task_1.sys_created_on']);

  return {
    number: number || 'Untitled ticket',
    shortDescription: shortDescription || 'No short description available',
    assignedTo,
    priority,
    impactedUser,
    age: ticketAge(openedAt),
  };
}

export function TicketSwipeDeck({ tickets = [], onOpenTicket }) {
  const rows = Array.isArray(tickets) ? tickets : [];
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  const activeIndex = useMemo(() => {
    if (!rows.length) {
      return 0;
    }
    return Math.min(Math.max(index, 0), rows.length - 1);
  }, [index, rows.length]);

  const activeTicket = rows[activeIndex] || null;
  const viewModel = useMemo(() => normalizeTicket(activeTicket || {}), [activeTicket]);

  if (!rows.length) {
    return <p className="status-text">No tickets available for this view.</p>;
  }

  function goNext() {
    if (activeIndex < rows.length - 1) {
      setIndex((current) => current + 1);
    }
  }

  function goPrev() {
    if (activeIndex > 0) {
      setIndex((current) => current - 1);
    }
  }

  function handleTouchStart(event) {
    touchStartX.current = event.touches?.[0]?.clientX ?? null;
  }

  function handleTouchEnd(event) {
    if (touchStartX.current === null) {
      return;
    }

    const endX = event.changedTouches?.[0]?.clientX ?? touchStartX.current;
    const deltaX = endX - touchStartX.current;
    touchStartX.current = null;

    if (deltaX <= -SWIPE_THRESHOLD) {
      goNext();
      return;
    }

    if (deltaX >= SWIPE_THRESHOLD) {
      goPrev();
    }
  }

  return (
    <div className="ticket-swipe-deck">
      <button
        key={`swipe-ticket-${activeIndex}`}
        type="button"
        className="ticket-swipe-deck__card"
        onClick={() => onOpenTicket?.(activeTicket)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="ticket-swipe-deck__header">
          <strong>{viewModel.number}</strong>
          <span>{viewModel.priority}</span>
        </div>
        <p className="ticket-swipe-deck__description">{viewModel.shortDescription}</p>
        <div className="ticket-swipe-deck__meta">
          <span>{`Assigned: ${viewModel.assignedTo}`}</span>
          <span>{`Impacted: ${viewModel.impactedUser}`}</span>
          <span>{`Age: ${viewModel.age}`}</span>
        </div>
      </button>

      <div className="ticket-swipe-deck__progress">{`${activeIndex + 1} / ${rows.length}`}</div>
    </div>
  );
}

export default TicketSwipeDeck;
