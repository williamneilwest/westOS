import { getTicketNotes, getTicketTitle } from './aiAnalysis';

// TODO: frontend matching to be removed after backend validation.
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

const GENERIC_KB_TAGS = new Set([
  'uncategorized',
  'category',
  'categories',
  'tag',
  'tags',
  'document',
  'documents',
  'file',
  'files',
  'kb',
  'knowledge base',
  'knowledgebase',
]);

function normalizeKeyword(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKbTagWords(kbTagWords = []) {
  const seen = new Set();
  const normalized = [];

  kbTagWords.forEach((word) => {
    const clean = normalizeKeyword(word);
    if (!clean || clean.length < 3 || clean.length > 60 || GENERIC_KB_TAGS.has(clean) || seen.has(clean)) {
      return;
    }
    seen.add(clean);
    normalized.push(clean);
  });

  return normalized.slice(0, 200);
}

function buildKbTagRules(kbTagWords = []) {
  return normalizeKbTagWords(kbTagWords).map((tag, index) => ({
    id: `kb_tag_${index}_${tag.replace(/[^a-z0-9]+/g, '_')}`,
    keywords: [tag],
    severity: 'info',
    highlightClass: 'ticket-flag--warning',
    suggestion: `Ticket mentions KB tag "${tag}". Review matching KB docs first.`,
    associatedGroupTags: [],
  }));
}

export function collectKbTagWordsFromKnowledgeBase(payload) {
  const categories = Array.isArray(payload?.categories) ? payload.categories : [];
  const words = [];

  categories.forEach((category) => {
    const files = Array.isArray(category?.files) ? category.files : [];
    files.forEach((file) => {
      const tags = Array.isArray(file?.tags) ? file.tags : [];
      tags.forEach((tag) => {
        words.push(String(tag || ''));
      });
    });
  });

  return normalizeKbTagWords(words);
}

export function matchTicketRules(ticketText, options = {}) {
  const text = String(ticketText || '').toLowerCase();
  const kbTagRules = buildKbTagRules(options?.kbTagWords || []);
  const allRules = [...ticketRules, ...kbTagRules];

  return allRules.filter((rule) =>
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
