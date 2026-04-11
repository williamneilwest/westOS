import { getTicketNotes, getTicketTitle } from './aiAnalysis';

export const ticketRules = [
  {
    id: 'responder_group',
    keywords: ['responder', 'responder group'],
    severity: 'info',
    highlightClass: 'ticket-flag--blue',
    suggestion: 'This may be related to Responder Groups. Try searching the impacted user for associated Responder Groups.',
    associatedGroupTags: ['group:LAH-APP-Responder5']
  }
];

export function matchTicketRules(ticketText) {
  const text = String(ticketText || '').toLowerCase();

  return ticketRules.filter((rule) =>
    rule.keywords.some((keyword) => text.includes(String(keyword || '').toLowerCase()))
  );
}

export function buildTicketRuleText(ticket, columns = Object.keys(ticket || {}), descriptionColumn = '') {
  const title = getTicketTitle(ticket, columns);
  const description = descriptionColumn ? String(ticket?.[descriptionColumn] || '').trim() : '';
  const notes = getTicketNotes(ticket, columns)
    .map((note) => note.value)
    .filter(Boolean)
    .join('\n');

  return [title, description, notes].filter(Boolean).join('\n');
}
