import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction } from '../../finance/hooks/useTransactions';

export interface ConnectedAccount {
  account_id: string;
  name: string;
  official_name: string;
  mask: string;
  type: string;
  subtype: string;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency_code: string;
}

interface FinanceState {
  transactions: Transaction[];
  lastManualRefreshAt: string | null;
  accounts: ConnectedAccount[];
  setTransactions: (txs: Transaction[], refreshedAt: string | null) => void;
  setAccounts: (accounts: ConnectedAccount[]) => void;
  clear: () => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      transactions: [],
      lastManualRefreshAt: null,
      accounts: [],
      setTransactions: (txs, refreshedAt) =>
        set({ transactions: txs, lastManualRefreshAt: refreshedAt }),
      setAccounts: (accounts) => set({ accounts }),
      clear: () => set({ transactions: [], lastManualRefreshAt: null, accounts: [] }),
    }),
    {
      name: 'life-os-finance-store',
      version: 1,
      partialize: (state) => ({
        transactions: state.transactions,
        lastManualRefreshAt: state.lastManualRefreshAt,
        accounts: state.accounts,
      }),
    },
  ),
);
