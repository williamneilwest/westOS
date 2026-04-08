import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../../services/apiClient';
import { useFinanceStore } from '../store/useFinanceStore';

export interface Transaction {
  id: string;
  date: string;
  name: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subcategory: string;
  source: 'plaid';
}

interface TransactionsResponse {
  transactions: Transaction[];
  last_manual_refresh_at?: string | null;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  lastManualRefreshAt: string | null;
  refresh: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useTransactions(): UseTransactionsResult {
  const transactionsFromStore = useFinanceStore((s) => s.transactions);
  const lastRefreshFromStore = useFinanceStore((s) => s.lastManualRefreshAt);
  const setStoreTransactions = useFinanceStore((s) => s.setTransactions);
  const clearStore = useFinanceStore((s) => s.clear);

  const [transactions, setTransactions] = useState<Transaction[]>(transactionsFromStore);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastManualRefreshAt, setLastManualRefreshAt] = useState<string | null>(lastRefreshFromStore ?? null);
  // Watchdog: if a request hangs (e.g., auth middleware or proxy issue),
  // make sure loading does not stay on forever and surface a timeout error.
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      setLoading(false);
      setError((prev) => prev ?? 'Taking longer than expected. Please refresh or re-login.');
    }, 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiClient.get<TransactionsResponse>('/transactions');
      const txs = payload.transactions || [];
      const refreshedAt = payload.last_manual_refresh_at || null;
      setTransactions(txs);
      setLastManualRefreshAt(refreshedAt);
      setStoreTransactions(txs, refreshedAt);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [setStoreTransactions]);

  // Populate once: if store already has data, use it and do not auto-refresh.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;

    if (transactionsFromStore.length > 0 || lastRefreshFromStore) {
      // Use persisted values; mark not loading.
      setTransactions(transactionsFromStore);
      setLastManualRefreshAt(lastRefreshFromStore ?? null);
      setLoading(false);
      loadedRef.current = true;
      return;
    }
    void (async () => {
      try {
        await loadTransactions();
      } finally {
        loadedRef.current = true;
      }
    })();
  }, [loadTransactions, transactionsFromStore, lastRefreshFromStore]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await apiClient.post<TransactionsResponse>('/transactions/refresh', { override: true });
      const txs = payload.transactions || [];
      const refreshedAt = payload.last_manual_refresh_at || null;
      setTransactions(txs);
      setLastManualRefreshAt(refreshedAt);
      setStoreTransactions(txs, refreshedAt);
      setError(null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to refresh transactions');
    } finally {
      setLoading(false);
    }
  }, [setStoreTransactions]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    try {
      await apiClient.post('/plaid/disconnect', {});
      setTransactions([]);
      setLastManualRefreshAt(null);
      clearStore();
      setError(null);
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Failed to disconnect account');
    } finally {
      setLoading(false);
    }
  }, [clearStore]);

  return {
    transactions,
    loading,
    error,
    lastManualRefreshAt,
    refresh,
    disconnect,
  };
}
