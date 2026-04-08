import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, SectionHeader } from '../../../components/ui';
import { apiClient } from '../../../services/apiClient';
import { useTransactions } from '../hooks/useTransactions';
import { useFinanceStore } from '../store/useFinanceStore';

interface ConnectedAccount {
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

interface AccountsResponse {
  accounts: ConnectedAccount[];
}

export function AccountsPage() {
  const accountsFromStore = useFinanceStore((s) => s.accounts);
  const setAccountsInStore = useFinanceStore((s) => s.setAccounts);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(accountsFromStore);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const { transactions } = useTransactions();
  const loadedRef = useRef(false);

  // Watchdog: ensure loading indicator doesn't persist forever if a request hangs
  useEffect(() => {
    if (!loadingAccounts) return;
    const timer = setTimeout(() => {
      setLoadingAccounts(false);
      setAccountsError((prev) => prev ?? 'Taking longer than expected. Try Refresh or re-login.');
    }, 10000);
    return () => clearTimeout(timer);
  }, [loadingAccounts]);

  const loadAccountsFromCache = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const payload = await apiClient.get<AccountsResponse>('/plaid/accounts');
      const rows = payload.accounts || [];
      setAccounts(rows);
      setAccountsInStore(rows);
      setAccountsError(null);
    } catch (error) {
      setAccountsError(error instanceof Error ? error.message : 'Failed to load connected accounts');
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const payload = await apiClient.get<AccountsResponse>('/plaid/accounts?refresh=true&override=true');
      const rows = payload.accounts || [];
      setAccounts(rows);
      setAccountsInStore(rows);
      setAccountsError(null);
    } catch (error) {
      setAccountsError(error instanceof Error ? error.message : 'Failed to refresh connected accounts');
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    if (accountsFromStore.length > 0) {
      setAccounts(accountsFromStore);
      setLoadingAccounts(false);
      loadedRef.current = true;
      return;
    }
    // If no cached accounts yet, do a one-shot refresh with override to ensure
    // we pull the latest accounts after a new connection.
    void (async () => {
      try {
        await refreshAccounts();
      } finally {
        loadedRef.current = true;
      }
    })();
  }, [refreshAccounts, accountsFromStore]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Finance"
        title="Connected Accounts"
        description="Inspect connected accounts and transaction-level details."
        actions={<Badge variant="info">Accounts</Badge>}
      />

      <Card>
        <div className="flex flex-wrap gap-2">
          <Link to="/finance" className="inline-flex items-center rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-400/30 hover:text-white">
            Back To Transactions
          </Link>
          <Button variant="outline" onClick={() => void refreshAccounts()} disabled={loadingAccounts}>
            Refresh Accounts
          </Button>
        </div>
      </Card>

      {accountsError ? (
        <Card>
          <p className="text-sm text-rose-300">{accountsError}</p>
        </Card>
      ) : null}

      <Card title="Account Details" description={loadingAccounts ? 'Loading accounts...' : `${accounts.length} connected account(s)`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Official</th>
                <th className="px-2 py-2">Mask</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Subtype</th>
                <th className="px-2 py-2">Current</th>
                <th className="px-2 py-2">Available</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.account_id} className="border-t border-white/10 text-zinc-200">
                  <td className="px-2 py-2">{account.name || '-'}</td>
                  <td className="px-2 py-2">{account.official_name || '-'}</td>
                  <td className="px-2 py-2">{account.mask || '-'}</td>
                  <td className="px-2 py-2">{account.type || '-'}</td>
                  <td className="px-2 py-2">{account.subtype || '-'}</td>
                  <td className="px-2 py-2">{account.current_balance ?? '-'}</td>
                  <td className="px-2 py-2">{account.available_balance ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Transaction Details" description={`${transactions.length} cached transaction(s)`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Subcategory</th>
                <th className="px-2 py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-t border-white/10 text-zinc-200">
                  <td className="px-2 py-2">{tx.id}</td>
                  <td className="px-2 py-2">{tx.date}</td>
                  <td className="px-2 py-2">{tx.name}</td>
                  <td className="px-2 py-2">${tx.amount.toFixed(2)}</td>
                  <td className="px-2 py-2">{tx.type}</td>
                  <td className="px-2 py-2">{tx.category}</td>
                  <td className="px-2 py-2">{tx.subcategory}</td>
                  <td className="px-2 py-2">{tx.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default AccountsPage;
