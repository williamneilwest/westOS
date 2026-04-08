import { useState } from 'react';
import { Badge, Button, Card, SectionHeader } from '../../../components/ui';
import { apiClient } from '../../../services/apiClient';
import { useTransactions } from '../hooks/useTransactions';
import { Link } from 'react-router-dom';
import { useFinanceStore } from '../store/useFinanceStore';

function ensurePlaidScript(): Promise<void> {
  if (window.Plaid) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('plaid-link-script');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Plaid script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'plaid-link-script';
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Plaid script'));
    document.body.appendChild(script);
  });
}

function openPlaidLink(token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.Plaid) {
      reject(new Error('Plaid Link is unavailable'));
      return;
    }

    const handler = window.Plaid.create({
      token,
      onSuccess: (publicToken) => {
        handler.destroy();
        resolve(publicToken);
      },
      onExit: (linkError) => {
        handler.destroy();
        if (linkError) {
          reject(new Error('Plaid Link exited with an error'));
          return;
        }
        reject(new Error('Plaid Link closed'));
      },
    });

    handler.open();
  });
}

export function TransactionsPage() {
  const { transactions, loading, error, lastManualRefreshAt, refresh, disconnect } = useTransactions();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const setAccountsInStore = useFinanceStore((s) => s.setAccounts);

  const connectBank = async () => {
    setIsConnecting(true);
    setActionError(null);
    try {
      await ensurePlaidScript();
      const tokenResponse = await apiClient.post<{ link_token: string }>('/plaid/create_link_token', { override: true });
      const publicToken = await openPlaidLink(tokenResponse.link_token);
      await apiClient.post('/plaid/exchange_token', { public_token: publicToken, override: true });
      // Immediately hydrate transactions
      await refresh();
      // Also hydrate connected accounts so the Accounts page shows latest without requiring a manual refresh
      try {
        const accountsPayload = await apiClient.get<{ accounts: import('../store/useFinanceStore').ConnectedAccount[] }>(
          '/plaid/accounts?refresh=true&override=true',
        );
        const rows = accountsPayload.accounts || [];
        setAccountsInStore(rows);
      } catch (e) {
        // Non-fatal: keep going even if accounts hydration fails here
      }
    } catch (connectError) {
      if (connectError instanceof Error && connectError.message === 'Plaid Link closed') {
        setIsConnecting(false);
        return;
      }
      setActionError(connectError instanceof Error ? connectError.message : 'Failed to connect bank');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Finance"
        title="Transactions"
        description="Link a bank account and view normalized Plaid transactions."
        actions={<Badge variant="info">Plaid</Badge>}
      />

      <Card>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void connectBank()} disabled={isConnecting || loading}>
            Connect Bank
          </Button>
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
          <Button variant="ghost" className="text-rose-300" onClick={() => void disconnect()} disabled={loading}>
            Disconnect Account
          </Button>
          <Link to="/finance/accounts" className="inline-flex items-center rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 hover:border-emerald-400/30 hover:text-white">
            View Connected Accounts
          </Link>
        </div>
        <p className="mt-3 text-xs text-zinc-400">
          Last manual refresh:{' '}
          {lastManualRefreshAt ? new Date(lastManualRefreshAt).toLocaleString() : 'Never'}
        </p>
      </Card>

      {actionError ? (
        <Card>
          <p className="text-sm text-rose-300">{actionError}</p>
        </Card>
      ) : null}

      {error ? (
        <Card>
          <p className="text-sm text-rose-300">{error}</p>
        </Card>
      ) : null}

      <Card title="Transaction Table" description={loading ? 'Loading transactions...' : `${transactions.length} rows`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-zinc-400">
              <tr>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Category</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-t border-white/10 text-zinc-200">
                  <td className="px-2 py-2">{tx.date}</td>
                  <td className="px-2 py-2">{tx.name}</td>
                  <td className="px-2 py-2">${tx.amount.toFixed(2)}</td>
                  <td className="px-2 py-2">{tx.type}</td>
                  <td className="px-2 py-2">{tx.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default TransactionsPage;
