import { useCallback, useEffect, useState } from 'react';
import { getActiveTicketMetrics } from '../app/services/api';

const CACHE_MS = 30 * 1000;
let cachedMetrics = null;
let cachedAt = 0;
let inFlight = null;

async function loadMetrics({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedMetrics && now - cachedAt < CACHE_MS) {
    return cachedMetrics;
  }

  if (!force && inFlight) {
    return inFlight;
  }

  inFlight = getActiveTicketMetrics()
    .then((payload) => {
      cachedMetrics = payload;
      cachedAt = Date.now();
      return payload;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function useTicketMetrics() {
  const [state, setState] = useState(() => ({
    data: cachedMetrics,
    loading: !cachedMetrics,
    error: '',
    lastUpdated: cachedAt ? new Date(cachedAt).toISOString() : '',
  }));

  const refresh = useCallback(async ({ force = true } = {}) => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await loadMetrics({ force });
      setState({
        data,
        loading: false,
        error: '',
        lastUpdated: new Date(cachedAt).toISOString(),
      });
      return data;
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.message || 'Ticket metrics could not be loaded.',
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadMetrics()
      .then((data) => {
        if (!active) {
          return;
        }
        setState({
          data,
          loading: false,
          error: '',
          lastUpdated: new Date(cachedAt).toISOString(),
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          loading: false,
          error: error.message || 'Ticket metrics could not be loaded.',
        }));
      });

    return () => {
      active = false;
    };
  }, []);

  return {
    ...(state.data || {}),
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    refresh,
  };
}
