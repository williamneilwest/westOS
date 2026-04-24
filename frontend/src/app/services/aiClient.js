import { analyzeDocumentWithAi, getAiHealth, getAiInteractionLogs, sendAiChat } from './api';

function extractMessageFromMessages(messages) {
  if (!Array.isArray(messages)) {
    return '';
  }

  for (const item of messages) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const content = item.content;
    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }
  }

  return '';
}

function hasLogs(payload) {
  const logs = payload?.logs;
  if (typeof logs === 'string') {
    return logs.trim().length > 0;
  }
  if (Array.isArray(logs)) {
    return logs.length > 0;
  }
  return false;
}

function hasMeaningfulInput(payload = {}) {
  const message = String(payload?.message || '').trim();
  if (message) {
    return true;
  }

  if (extractMessageFromMessages(payload?.messages)) {
    return true;
  }

  if (payload?.dataset || payload?.ticket || payload?.documentText) {
    return true;
  }

  return hasLogs(payload);
}

const FEATURE_AGENT_STORAGE_KEY = 'westos.featureAgents';
const DEFAULT_FEATURE_AGENTS = {
  ticket_analysis: 'ticket_analyzer',
};

function readFeatureAgents() {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_FEATURE_AGENTS };
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(FEATURE_AGENT_STORAGE_KEY) || '{}');
    return { ...DEFAULT_FEATURE_AGENTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return { ...DEFAULT_FEATURE_AGENTS };
  }
}

export function getFeatureAgentId(featureKey, fallback = '') {
  const key = String(featureKey || '').trim();
  if (!key) {
    return fallback;
  }
  const map = readFeatureAgents();
  return String(map[key] || fallback || '').trim();
}

export function setFeatureAgentId(featureKey, agentId) {
  const key = String(featureKey || '').trim();
  if (!key || typeof window === 'undefined') {
    return;
  }

  const next = readFeatureAgents();
  next[key] = String(agentId || '').trim();
  window.localStorage.setItem(FEATURE_AGENT_STORAGE_KEY, JSON.stringify(next));
}

export async function sendChat({ message, agentId, ...rest } = {}) {
  const payload = {
    ...rest,
    message: String(message || '').trim(),
  };

  if (agentId) {
    payload.agentId = agentId;
  }

  return chatAI(payload);
}

export async function chatAI(payload = {}, options = {}) {
  const disabled = Boolean(options?.disabled || payload?.disabled);
  if (disabled) {
    return { status: 'skipped', reason: 'disabled' };
  }

  if (!hasMeaningfulInput(payload)) {
    return { status: 'skipped', reason: 'empty_prompt' };
  }

  const requestType = String(payload?.type || '').trim().toLowerCase();
  if (requestType === 'log_analysis' && !hasLogs(payload)) {
    return { status: 'skipped', reason: 'no_logs' };
  }

  return sendAiChat(payload);
}

export function getAIHealth() {
  return getAiHealth();
}

export function getAIInteractionLogs(limit = 200) {
  return getAiInteractionLogs(limit);
}

export function analyzeDocumentAI(payload = {}, options = {}) {
  if (options?.disabled || payload?.disabled) {
    return Promise.resolve({ status: 'skipped', reason: 'disabled' });
  }

  const text = String(payload?.documentText || '').trim();
  if (!text && !String(payload?.documentUrl || '').trim()) {
    return Promise.resolve({ status: 'skipped', reason: 'empty_prompt' });
  }

  return analyzeDocumentWithAi(payload);
}
