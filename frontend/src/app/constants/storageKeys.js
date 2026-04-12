export const STORAGE_KEYS = {
  TABLE_COLUMNS: 'westos.table.visibleColumns',
  HERO_EXPANDED: 'hero-expanded',
  USER_GROUPS_CACHE: 'work.get-user-groups.cache',
  GROUP_SEARCH_HISTORY: 'work.user-group-association.search-history',
  GROUP_CLICKS: 'work.user-group-association.group-clicks',
  TICKET_VIEW: 'westos.work.ticketView',
  FULL_DATASET: 'westos.work.fullDataset',
  AI_SUMMARIES: 'westos.work.aiMetricSummaries',
};

export const STORAGE_TTLS = {
  USER_GROUPS_CACHE: 60 * 60 * 1000,
  GROUP_SEARCH_HISTORY: 7 * 24 * 60 * 60 * 1000,
  GROUP_CLICKS: 7 * 24 * 60 * 60 * 1000,
  AI_SUMMARIES: 60 * 60 * 1000,
};
