import type { TicketAnalyticsSummary } from '../../types';

interface TicketSummaryCardsProps {
  summary: TicketAnalyticsSummary;
}

export function TicketSummaryCards({ summary }: TicketSummaryCardsProps) {
  const cards = [
    { label: 'Total Tickets', value: summary.total, tone: 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100' },
    { label: 'Open', value: summary.open, tone: 'border-rose-300/30 bg-rose-500/10 text-rose-100' },
    { label: 'In Progress', value: summary.in_progress, tone: 'border-amber-300/30 bg-amber-500/10 text-amber-100' },
    { label: 'Closed', value: summary.closed, tone: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100' },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className={`rounded-lg border px-3 py-2 ${card.tone}`}>
          <p className="text-[10px] uppercase tracking-wide opacity-80">{card.label}</p>
          <p className="mt-1 text-lg font-semibold">{card.value}</p>
        </article>
      ))}
    </div>
  );
}
